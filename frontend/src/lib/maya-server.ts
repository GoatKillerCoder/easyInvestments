import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import OpenAI from "openai";
import { z } from "zod";
import { MAYA_SYSTEM_PROMPT as SYSTEM_PROMPT } from "@/lib/maya-knowledge";

const accountServer = () => import("@/lib/user-session.server");

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 1000;
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

const mayaInputSchema = z.object({
  sessionToken: z.string().max(500).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
      }),
    )
    .max(MAX_MESSAGES),
});

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  if (rateLimits.size > 5000) {
    for (const [entryKey, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(entryKey);
    }
  }
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function clientKey(userId: string | null): string {
  if (userId) return `user:${userId}`;
  const headers = getRequest().headers;
  const forwarded = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for") ?? "unknown";
  return `ip:${(forwarded.split(",")[0] ?? "unknown").trim()}`;
}

type UserRow = {
  full_name: string;
  status: string;
  account_type: string | null;
  company: string | null;
  balance: number | string | null;
  total_invested: number | string | null;
};

async function loadUser(userId: string): Promise<UserRow | null> {
  const { serverDatabase } = await accountServer();
  const rows = await serverDatabase()`
    SELECT full_name, status, account_type, company, balance, total_invested
    FROM users WHERE id = ${userId}::uuid LIMIT 1`;
  const user = rows[0] as UserRow | undefined;
  return user && user.status === "Active" ? user : null;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

const FINANCE_PATTERN =
  /balance|cash|invest|portfolio|holding|transaction|deposit|withdraw|fund|account|status|money|value|payment|paid|pay|yoco|eft|proof|upload|document|statement|pending|reference|not showing|credited|vps|activity|recent/i;

async function financeContext(userId: string, user: UserRow): Promise<string> {
  const { serverDatabase } = await accountServer();
  const sql = serverDatabase();
  // Each source is read independently so a missing optional table never breaks Maya.
  const [holdings, transactions, payments, withdrawals, documents] = await Promise.allSettled([
    sql`SELECT fund_name, ticker, market_value, change_pct FROM portfolio_holdings
        WHERE user_id = ${userId}::uuid LIMIT 20`,
    sql`SELECT transaction_date::text AS date, type, method, status, amount FROM transactions
        WHERE user_id = ${userId}::uuid ORDER BY transaction_date DESC LIMIT 5`,
    sql`SELECT created_at::date::text AS date, status, amount FROM payment_attempts
        WHERE user_id = ${userId}::uuid ORDER BY created_at DESC LIMIT 5`,
    sql`SELECT created_at::date::text AS date, method, status, amount FROM withdrawal_requests
        WHERE user_id = ${userId}::uuid ORDER BY created_at DESC LIMIT 5`,
    sql`SELECT created_at::date::text AS date, document_type, declared_amount
        FROM deposit_documents WHERE user_id = ${userId}::uuid ORDER BY created_at DESC LIMIT 5`,
  ]);
  const rows = (result: PromiseSettledResult<Record<string, unknown>[]>) =>
    result.status === "fulfilled" ? result.value : null;
  const balance = Number(user.balance ?? 0);
  const invested = Number(user.total_invested ?? 0);
  return JSON.stringify({
    accountType: user.account_type,
    broker: user.company,
    status: user.status,
    availableCashZAR: balance,
    totalInvestedZAR: invested,
    portfolioValueZAR: Math.round((balance + invested) * 100) / 100,
    holdings: (rows(holdings) ?? []).map((holding) => ({
      fund: holding["fund_name"],
      ticker: holding["ticker"],
      marketValueZAR: Number(holding["market_value"]),
      change: holding["change_pct"],
    })),
    recentTransactions: rows(transactions) ?? [],
    recentYocoPayments: rows(payments) ?? [],
    recentWithdrawalRequests: rows(withdrawals) ?? [],
    uploadedProofDocuments: (rows(documents) ?? []).map((document) => ({
      date: document["date"],
      type: document["document_type"],
      declaredAmountZAR: document["declared_amount"],
      reviewNote: "Uploaded for review; not proof the payment was received or approved.",
    })),
  });
}

export type MayaResponse = {
  name: string | null;
  reply: string | null;
  error: "rate_limited" | "unavailable" | null;
};

export const mayaChatServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => mayaInputSchema.parse(data))
  .handler(async ({ data }): Promise<MayaResponse> => {
    let userId: string | null = null;
    let user: UserRow | null = null;
    const { serverEnvironmentValue, verifyUserSessionToken } = await accountServer();
    try {
      userId = data.sessionToken ? await verifyUserSessionToken(data.sessionToken) : null;
      user = userId ? await loadUser(userId) : null;
      if (!user) userId = null;
    } catch (error) {
      console.error("Maya could not verify the user session.", error);
      userId = null;
    }
    const name = user ? firstName(user.full_name) || null : null;

    const lastMessage = data.messages[data.messages.length - 1];
    if (!lastMessage) return { name, reply: null, error: null };
    if (lastMessage.role !== "user") {
      return { name, reply: null, error: "unavailable" };
    }
    if (isRateLimited(clientKey(userId))) {
      return { name, reply: null, error: "rate_limited" };
    }

    try {
      const apiKey = serverEnvironmentValue("OPENAI_API_KEY");
      const lastText = lastMessage.content;
      const context =
        userId && user
          ? [
              `Signed-in user data (verified; this user's own information only). Preferred first name: ${name ?? "unknown"}.`,
              FINANCE_PATTERN.test(lastText) ? await financeContext(userId, user) : "",
            ]
              .filter(Boolean)
              .join("\n")
          : "The visitor is not signed in. Do not discuss any account-specific data; suggest signing in at /login.";

      const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 1 });
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` },
          ...data.messages.map((message) => ({ role: message.role, content: message.content })),
        ],
      });
      const reply = completion.choices[0]?.message?.content?.trim();
      if (!reply) return { name, reply: null, error: "unavailable" };
      return { name, reply, error: null };
    } catch (error) {
      const status = error instanceof OpenAI.APIError ? error.status : undefined;
      console.error("Maya chat request failed.", status ?? (error as Error).message);
      const isQuota = error instanceof OpenAI.APIError && /credit|quota/i.test(`${error.code}`);
      return {
        name,
        reply: null,
        error: status === 429 && !isQuota ? "rate_limited" : "unavailable",
      };
    }
  });

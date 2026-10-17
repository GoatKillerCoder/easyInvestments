import { neon } from "@neondatabase/serverless";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createUserSessionToken, verifyUserSessionToken } from "@/lib/user-session.server";
import type {
  AccountTransaction,
  ManualAccount,
  ManualAccountRegistration,
  PortfolioHolding,
} from "@/lib/manual-account-data";

const PASSWORD_ITERATIONS = 210_000;

type StoredManualAccount = ManualAccount & {
  passwordSalt: string;
  passwordHash: string;
};

type CloudflareRequest = Request & {
  runtime?: {
    cloudflare?: {
      env?: Record<string, unknown>;
    };
  };
};

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  password_salt: string;
  password_hash: string;
  phone: string;
  country: string;
  address: string;
  registered_date: string;
  account_type: string;
  company: string | null;
  status: string;
  account_platform: string;
  account_number: string;
  balance: number | string;
  portfolio_value: number | string;
  total_invested: number | string;
};

type HoldingRow = {
  user_id: string;
  fund_name: string;
  ticker: string;
  market_value: number | string;
  change_pct: string;
};

type TransactionRow = {
  user_id: string;
  transaction_date: string;
  type: "Deposit" | "Withdrawal";
  method: string;
  status: "Completed" | "Rejected";
  amount: number | string;
};

type WithdrawalRequestRow = {
  user_id: string;
  created_at: string;
  method: string;
  status: "Pending" | "Processing" | "Completed" | "Rejected" | "Failed";
  amount: number | string;
};

const holdingSchema = z.object({
  fundName: z.string(),
  ticker: z.string(),
  marketValue: z.number().finite().nonnegative(),
  changePct: z.string(),
});

const transactionSchema = z.object({
  date: z.string(),
  type: z.enum(["Deposit", "Withdrawal"]),
  method: z.string(),
  status: z.enum(["Completed", "Rejected"]),
  amount: z.number().finite().nonnegative(),
});

const accountSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().max(64),
  country: z.string().max(100),
  address: z.string().max(500),
  registeredDate: z.string().min(1),
  accountType: z.string().min(1).max(100),
  company: z.string().trim().max(200).default(""),
  status: z.enum(["Active", "Pending", "Suspended", "Deactivated"]),
  accountPlatform: z.string().min(1).max(100),
  accountNumber: z.string().min(1).max(100),
  balance: z.number().finite().nonnegative(),
  portfolioValue: z.number().finite().nonnegative(),
  totalInvested: z.number().finite().nonnegative(),
  holdings: z.array(holdingSchema).max(500),
  transactions: z.array(transactionSchema).max(2000),
});

const registrationSchema = z.object({
  account: accountSchema,
  password: z.string().min(8).max(1024),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(1024),
  company: z.string().trim().min(1).max(200),
});
const changePasswordSchema = z.object({
  id: z.string().uuid(),
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(8).max(1024),
});
const deactivateAccountSchema = z.object({
  id: z.string().uuid(),
  password: z.string().min(1).max(1024),
});

const adminPinSchema = z.object({ pin: z.string().min(1).max(128) });
const adminTokenSchema = z.object({ adminToken: z.string().min(1).max(256) });
const adminRegistrationSchema = z.object({
  adminToken: z.string().min(1).max(256),
  registration: registrationSchema,
});
const adminAccountUpdateSchema = z.object({
  adminToken: z.string().min(1).max(256),
  account: accountSchema,
  password: z.string().min(8).max(1024).optional(),
});
const adminAccountStatusUpdateSchema = z.object({
  adminToken: z.string().min(1).max(256),
  id: z.string().uuid(),
  status: z.enum(["Active", "Pending", "Suspended", "Deactivated"]),
});
const adminAccountDeleteSchema = z.object({
  adminToken: z.string().min(1).max(256),
  id: z.string().uuid(),
});
const accountIdSchema = z.object({
  id: z.string().uuid(),
  sessionToken: z.string().min(1).max(500),
});
const ADMIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function environmentValue(name: string): string {
  const request = getRequest() as CloudflareRequest;
  const bindingValue = request.runtime?.cloudflare?.env?.[name];
  const nodeValue = typeof process === "undefined" ? undefined : process.env[name];
  const value = bindingValue ?? nodeValue;

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing server configuration: ${name}`);
  }

  return value;
}

function database() {
  return neon(environmentValue("DATABASE_URL"));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function fromHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) {
    throw new Error("Stored password salt is invalid.");
  }
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt?: string) {
  const passwordSalt = salt ?? toHex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const result = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(fromHex(passwordSalt)),
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return { passwordSalt, passwordHash: toHex(new Uint8Array(result)) };
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function ensureUserCompanyColumn() {
  await database()`ALTER TABLE users ADD COLUMN IF NOT EXISTS company text`;
}

export async function ensureWithdrawalRequestsTable() {
  await database()`CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id uuid PRIMARY KEY,
    public_id uuid NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key uuid NOT NULL,
    amount numeric(14, 2) NOT NULL CHECK (amount > 0),
    fee_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    method text NOT NULL CHECK (method IN ('Bank account', 'PayPal')),
    destination_ciphertext text NOT NULL,
    destination_summary text NOT NULL,
    status text NOT NULL CHECK (status IN ('Pending', 'Processing', 'Completed', 'Rejected', 'Failed')),
    funds_reserved boolean NOT NULL DEFAULT false,
    claim_token uuid,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
  )`;
}

async function signAdminToken(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(environmentValue("ADMIN_SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

async function createAdminToken(): Promise<string> {
  const expiresAt = Date.now() + ADMIN_SESSION_DURATION_MS;
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${await signAdminToken(payload)}`;
}

export async function requireAdminToken(token: string): Promise<void> {
  const [expiresAtText, nonce, signature, extra] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (
    extra !== undefined ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now() ||
    !/^[0-9a-f]{32}$/i.test(nonce ?? "") ||
    !signature
  ) {
    throw new Error("Admin authentication is required.");
  }

  const expectedSignature = await signAdminToken(`${expiresAtText}.${nonce}`);
  if (!constantTimeEqual(signature, expectedSignature)) {
    throw new Error("Admin authentication is required.");
  }
}

function toPublicAccount({
  passwordSalt: _salt,
  passwordHash: _hash,
  ...account
}: StoredManualAccount) {
  return account;
}

function databaseNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error("Neon returned an invalid numeric account value.");
  }
  return number;
}

function calculatePortfolioValue(balance: number, totalInvested: number): number {
  return (Math.round(balance * 100) + Math.round(totalInvested * 100)) / 100;
}

async function readAccounts(includeWithdrawalRequests = true): Promise<StoredManualAccount[]> {
  const sql = database();
  await ensureUserCompanyColumn();
  await ensureWithdrawalRequestsTable();
  const [users, holdings, transactions] = await Promise.all([
    sql`SELECT id::text AS id, full_name, email, password_salt, password_hash,
               phone, country, address, registered_date::text AS registered_date,
               account_type, COALESCE(company, '') AS company, status, account_platform, account_number,
               balance, portfolio_value, total_invested
        FROM users ORDER BY created_at`,
    sql`SELECT user_id::text AS user_id, fund_name, ticker, market_value, change_pct
        FROM portfolio_holdings`,
    sql`SELECT user_id::text AS user_id, transaction_date::text AS transaction_date,
               type, method, status, amount
        FROM transactions`,
  ]);
  const withdrawalRequests = includeWithdrawalRequests
    ? await sql`SELECT user_id::text AS user_id, created_at::date::text AS created_at,
                  method, status, amount
                FROM withdrawal_requests`
    : [];

  return (users as UserRow[]).map((user) => {
    const userHoldings = (holdings as HoldingRow[])
      .filter((holding) => holding.user_id === user.id)
      .map((holding): PortfolioHolding => ({
        fundName: holding.fund_name,
        ticker: holding.ticker,
        marketValue: databaseNumber(holding.market_value),
        changePct: holding.change_pct,
      }));
    const userTransactions = [
      ...(transactions as TransactionRow[])
        .filter((transaction) => transaction.user_id === user.id)
        .map((transaction): AccountTransaction => ({
          date: transaction.transaction_date,
          type: transaction.type,
          method: transaction.method,
          status: transaction.status,
          amount: databaseNumber(transaction.amount),
        })),
      ...(withdrawalRequests as WithdrawalRequestRow[])
        .filter((request) => request.user_id === user.id)
        .map((request): AccountTransaction => ({
          date: request.created_at,
          type: "Withdrawal",
          method: request.method,
          status: request.status,
          amount: databaseNumber(request.amount),
        })),
    ].sort((left, right) => right.date.localeCompare(left.date));

    const balance = databaseNumber(user.balance);
    const totalInvested = databaseNumber(user.total_invested);

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email.toLowerCase(),
      passwordSalt: user.password_salt,
      passwordHash: user.password_hash,
      phone: user.phone,
      country: user.country,
      address: user.address,
      registeredDate: user.registered_date,
      accountType: user.account_type,
      company: user.company ?? "",
      status: user.status,
      accountPlatform: user.account_platform,
      accountNumber: user.account_number,
      balance,
      portfolioValue: calculatePortfolioValue(balance, totalInvested),
      totalInvested,
      holdings: userHoldings,
      transactions: userTransactions,
    };
  });
}

export const authenticateAdminServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminPinSchema.parse(data))
  .handler(async ({ data }) => {
    if (!constantTimeEqual(data.pin, environmentValue("ADMIN_PIN"))) {
      throw new Error("The admin PIN is incorrect.");
    }
    return createAdminToken();
  });

export const getManualAccountsServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminTokenSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdminToken(data.adminToken);
    const accounts = await readAccounts(false);
    return accounts.map(toPublicAccount);
  });

export const getManualAccountServerFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => accountIdSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await verifyUserSessionToken(data.sessionToken);
    if (!userId || userId !== data.id) {
      throw new Error("A valid session for this account is required.");
    }
    const accounts = await readAccounts();
    const account = accounts.find((candidate) => candidate.id === data.id);
    return account ? toPublicAccount(account) : undefined;
  });

async function createAccount(data: ManualAccountRegistration): Promise<ManualAccount> {
  await ensureUserCompanyColumn();
  const sql = database();
  const email = data.account.email.toLowerCase();
  const existing = await sql`SELECT 1 FROM users WHERE LOWER(email) = ${email} LIMIT 1`;
  if (existing.length > 0) {
    throw new Error("An account with this email address is already registered.");
  }

  const credentials = await hashPassword(data.password);
  const account: StoredManualAccount = {
    ...data.account,
    email,
    portfolioValue: calculatePortfolioValue(data.account.balance, data.account.totalInvested),
    ...credentials,
  };

  const statements = [
    sql`INSERT INTO users (
            id, full_name, email, password_salt, password_hash, phone, country, address,
            registered_date, account_type, company, status, account_platform, account_number,
            balance, portfolio_value, total_invested
          ) VALUES (
            ${account.id}::uuid, ${account.fullName}, ${account.email},
            ${account.passwordSalt}, ${account.passwordHash}, ${account.phone},
            ${account.country}, ${account.address}, ${account.registeredDate}::date,
            ${account.accountType}, ${account.company}, ${account.status}, ${account.accountPlatform},
            ${account.accountNumber}, ${account.balance}, ${account.portfolioValue},
            ${account.totalInvested}
          )`,
    sql`INSERT INTO portfolio_holdings (
            user_id, fund_name, ticker, market_value, change_pct
          )
          SELECT ${account.id}::uuid, holding.fund_name, holding.ticker,
                 holding.market_value, holding.change_pct
          FROM jsonb_to_recordset(${JSON.stringify(
            account.holdings.map((holding) => ({
              fund_name: holding.fundName,
              ticker: holding.ticker,
              market_value: holding.marketValue,
              change_pct: holding.changePct,
            })),
          )}::jsonb) AS holding(
            fund_name text, ticker text, market_value numeric, change_pct text
          )`,
    sql`INSERT INTO transactions (
            user_id, transaction_date, type, method, status, amount
          )
          SELECT ${account.id}::uuid, transaction.transaction_date::date,
                 transaction.type, transaction.method, transaction.status,
                 transaction.amount
          FROM jsonb_to_recordset(${JSON.stringify(
            account.transactions.map((transaction) => ({
              transaction_date: transaction.date,
              type: transaction.type,
              method: transaction.method,
              status: transaction.status,
              amount: transaction.amount,
            })),
          )}::jsonb) AS transaction(
            transaction_date text, type text, method text, status text, amount numeric
          )`,
  ];
  await sql.transaction(statements);
  return toPublicAccount(account);
}

export const registerManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown): ManualAccountRegistration => registrationSchema.parse(data))
  .handler(async ({ data }) => createAccount(data));

export const registerAdminManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminRegistrationSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdminToken(data.adminToken);
    return createAccount(data.registration);
  });

export const updateAdminManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminAccountUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdminToken(data.adminToken);
    await ensureUserCompanyColumn();

    const sql = database();
    const account = {
      ...data.account,
      email: data.account.email.toLowerCase(),
      portfolioValue: calculatePortfolioValue(data.account.balance, data.account.totalInvested),
    };
    const [existingAccount, duplicateEmail] = await Promise.all([
      sql`SELECT 1 FROM users WHERE id = ${account.id}::uuid LIMIT 1`,
      sql`SELECT 1 FROM users
          WHERE LOWER(email) = ${account.email} AND id <> ${account.id}::uuid
          LIMIT 1`,
    ]);

    if (existingAccount.length === 0) {
      throw new Error("The account to update was not found.");
    }
    if (duplicateEmail.length > 0) {
      throw new Error("An account with this email address is already registered.");
    }

    const credentials = data.password ? await hashPassword(data.password) : undefined;
    const statements = [
      sql`UPDATE users SET
            full_name = ${account.fullName},
            email = ${account.email},
            password_salt = COALESCE(${credentials?.passwordSalt ?? null}, password_salt),
            password_hash = COALESCE(${credentials?.passwordHash ?? null}, password_hash),
            phone = ${account.phone},
            country = ${account.country},
            address = ${account.address},
            registered_date = ${account.registeredDate}::date,
            account_type = ${account.accountType},
            company = ${account.company},
            status = ${account.status},
            account_platform = ${account.accountPlatform},
            account_number = ${account.accountNumber},
            balance = ${account.balance},
            portfolio_value = ${account.portfolioValue},
            total_invested = ${account.totalInvested}
          WHERE id = ${account.id}::uuid`,
      sql`DELETE FROM portfolio_holdings WHERE user_id = ${account.id}::uuid`,
      sql`DELETE FROM transactions WHERE user_id = ${account.id}::uuid`,
      sql`INSERT INTO portfolio_holdings (
            user_id, fund_name, ticker, market_value, change_pct
          )
          SELECT ${account.id}::uuid, holding.fund_name, holding.ticker,
                 holding.market_value, holding.change_pct
          FROM jsonb_to_recordset(${JSON.stringify(
            account.holdings.map((holding) => ({
              fund_name: holding.fundName,
              ticker: holding.ticker,
              market_value: holding.marketValue,
              change_pct: holding.changePct,
            })),
          )}::jsonb) AS holding(
            fund_name text, ticker text, market_value numeric, change_pct text
          )`,
      sql`INSERT INTO transactions (
            user_id, transaction_date, type, method, status, amount
          )
          SELECT ${account.id}::uuid, transaction.transaction_date::date,
                 transaction.type, transaction.method, transaction.status,
                 transaction.amount
          FROM jsonb_to_recordset(${JSON.stringify(
            account.transactions.map((transaction) => ({
              transaction_date: transaction.date,
              type: transaction.type,
              method: transaction.method,
              status: transaction.status,
              amount: transaction.amount,
            })),
          )}::jsonb) AS transaction(
            transaction_date text, type text, method text, status text, amount numeric
          )`,
    ];

    await sql.transaction(statements);
    return account;
  });

export const updateAdminManualAccountStatusServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminAccountStatusUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdminToken(data.adminToken);

    const updated = await database()`
      UPDATE users
      SET status = ${data.status}
      WHERE id = ${data.id}::uuid
      RETURNING id
    `;
    if (updated.length === 0) {
      throw new Error("The account to update was not found.");
    }
    return { id: data.id, status: data.status };
  });

export const deleteAdminManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminAccountDeleteSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdminToken(data.adminToken);

    const sql = database();
    const deleted = await sql`DELETE FROM users WHERE id = ${data.id}::uuid RETURNING id`;
    if (deleted.length === 0) {
      throw new Error("The account to delete was not found.");
    }
    return { id: data.id };
  });

export const authenticateManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const accounts = await readAccounts();
    const account = accounts.find(
      (candidate) =>
        candidate.email.toLowerCase() === data.email.toLowerCase() &&
        candidate.company.trim().toLowerCase() === data.company.toLowerCase(),
    );
    if (!account || !account.passwordSalt || !account.passwordHash) {
      return null;
    }

    const submittedCredentials = await hashPassword(data.password, account.passwordSalt);
    if (!constantTimeEqual(submittedCredentials.passwordHash, account.passwordHash)) {
      return null;
    }
    if (account.status === "Active") {
      return {
        ...toPublicAccount(account),
        sessionToken: await createUserSessionToken(account.id),
      };
    }
    if (
      account.status === "Deactivated" ||
      account.status === "Suspended" ||
      account.status === "Pending"
    ) {
      return { restrictedStatus: account.status };
    }
    return null;
  });

export const deactivateManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => deactivateAccountSchema.parse(data))
  .handler(async ({ data }) => {
    const sql = database();
    const rows = await sql`
      SELECT password_salt, password_hash, status
      FROM users
      WHERE id = ${data.id}::uuid
      LIMIT 1
    `;
    const account = rows[0] as
      { password_salt: string; password_hash: string; status: string } | undefined;

    if (!account?.password_salt || !account.password_hash || account.status !== "Active") {
      return { deactivated: false };
    }

    const submittedCredentials = await hashPassword(data.password, account.password_salt);
    if (!constantTimeEqual(submittedCredentials.passwordHash, account.password_hash)) {
      return { deactivated: false };
    }

    const updated = await sql`
      UPDATE users
      SET status = 'Deactivated'
      WHERE id = ${data.id}::uuid AND status = 'Active'
      RETURNING id
    `;
    return { deactivated: updated.length > 0 };
  });

export const changeManualAccountPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => changePasswordSchema.parse(data))
  .handler(async ({ data }) => {
    const sql = database();
    const rows = await sql`
      SELECT password_salt, password_hash
      FROM users
      WHERE id = ${data.id}::uuid
      LIMIT 1
    `;
    const account = rows[0] as { password_salt: string; password_hash: string } | undefined;

    if (!account?.password_salt || !account.password_hash) {
      return { updated: false };
    }

    const submittedCredentials = await hashPassword(data.currentPassword, account.password_salt);
    if (!constantTimeEqual(submittedCredentials.passwordHash, account.password_hash)) {
      return { updated: false };
    }

    const credentials = await hashPassword(data.newPassword);
    const updated = await sql`
      UPDATE users
      SET password_salt = ${credentials.passwordSalt},
          password_hash = ${credentials.passwordHash}
      WHERE id = ${data.id}::uuid
      RETURNING id
    `;
    return { updated: updated.length > 0 };
  });

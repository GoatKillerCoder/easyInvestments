import { z } from "zod";
import { ensureWithdrawalRequestsTable, requireAdminToken } from "@/lib/manual-account.server";
import {
  serverDatabase,
  serverEnvironmentValue,
  verifyUserSessionToken,
} from "@/lib/user-session.server";

const baseWithdrawalFields = {
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Enter a valid ZAR amount."),
  idempotencyKey: z.string().uuid(),
  sessionToken: z.string().min(1).max(500),
};

export const createWithdrawalInputSchema = z.discriminatedUnion("method", [
  z.object({
    ...baseWithdrawalFields,
    method: z.literal("Bank account"),
    accountHolderName: z.string().trim().min(1).max(200),
    bankName: z.string().trim().min(1).max(120),
    accountNumber: z
      .string()
      .trim()
      .max(40)
      .regex(/^[\d -]+$/)
      .refine((value) => {
        const digitCount = value.replace(/\D/g, "").length;
        return digitCount >= 4 && digitCount <= 34;
      }, "Enter a valid bank account number."),
    accountType: z.enum(["Cheque", "Savings", "Transmission"]),
    branchCode: z
      .string()
      .trim()
      .max(20)
      .regex(/^[\d -]*$/),
  }),
  z.object({
    ...baseWithdrawalFields,
    method: z.literal("PayPal"),
    paypalEmail: z.string().trim().email().max(320),
  }),
]);

type WithdrawalRow = {
  public_id: string;
  amount: string;
  method: "Bank account" | "PayPal";
  destination_summary: string;
  status: "Pending" | "Processing" | "Completed" | "Rejected" | "Failed";
  fee_amount: string;
};

type AdminWithdrawalRow = Omit<WithdrawalRow, "status"> & {
  user_id: string;
  full_name: string;
  created_at: string;
  destination_ciphertext: string;
  status: "Pending" | "Processing";
};

const withdrawalDestinationSchema = z.union([
  z.object({
    accountHolderName: z.string(),
    bankName: z.string(),
    accountNumber: z.string(),
    accountType: z.enum(["Cheque", "Savings", "Transmission"]),
    branchCode: z.string(),
  }),
  z.object({ paypalEmail: z.string().email() }),
]);

function amountInCents(amount: string): bigint {
  const [whole = "0", fraction = ""] = amount.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents <= 0n) throw new Error("Enter an amount greater than zero.");
  return cents;
}

function amountAsDecimal(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function encryptDestination(destination: string): Promise<string> {
  const secret = serverEnvironmentValue("ADMIN_SESSION_SECRET");
  const keyBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`easy-equities-withdrawal-destination:v1:${secret}`),
  );
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(destination),
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return toBase64Url(combined);
}

async function decryptDestination(
  destination: string,
): Promise<z.infer<typeof withdrawalDestinationSchema>> {
  const secret = serverEnvironmentValue("ADMIN_SESSION_SECRET");
  const keyBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`easy-equities-withdrawal-destination:v1:${secret}`),
  );
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const normalized = destination.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = Uint8Array.from(
    atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
    (character) => character.charCodeAt(0),
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decoded.slice(0, 12) },
    key,
    decoded.slice(12),
  );
  return withdrawalDestinationSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
}

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

function safeDestinationSummary(data: z.infer<typeof createWithdrawalInputSchema>): string {
  if (data.method === "PayPal") return maskEmail(data.paypalEmail);
  return `${data.bankName} account ending ${data.accountNumber.replace(/\D/g, "").slice(-4)}`;
}

async function findRequest(userId: string, idempotencyKey: string) {
  const rows = await serverDatabase()`
    SELECT public_id::text AS public_id, amount::text AS amount, method,
           destination_summary, status, fee_amount::text AS fee_amount
    FROM withdrawal_requests
    WHERE user_id = ${userId}::uuid AND idempotency_key = ${idempotencyKey}::uuid
    LIMIT 1
  `;
  return (rows[0] as WithdrawalRow | undefined) ?? null;
}

function publicRequest(row: WithdrawalRow) {
  return {
    reference: row.public_id,
    amount: row.amount,
    method: row.method,
    destination: row.destination_summary,
    fee: row.fee_amount,
    netPayout: row.amount,
    status: row.status,
  };
}

export async function createWithdrawalRequest(data: z.infer<typeof createWithdrawalInputSchema>) {
  const userId = await verifyUserSessionToken(data.sessionToken);
  if (!userId) throw new Error("A valid user session is required to request a withdrawal.");

  const cents = amountInCents(data.amount);
  const amount = amountAsDecimal(cents);
  await ensureWithdrawalRequestsTable();

  const sql = serverDatabase();
  const activeUser = await sql`
    SELECT id FROM users WHERE id = ${userId}::uuid AND status = 'Active' LIMIT 1
  `;
  if (activeUser.length === 0) {
    throw new Error("An active user account is required to request a withdrawal.");
  }

  const existing = await findRequest(userId, data.idempotencyKey);
  if (existing) return publicRequest(existing);

  const destination =
    data.method === "PayPal"
      ? { paypalEmail: data.paypalEmail.trim() }
      : {
          accountHolderName: data.accountHolderName.trim(),
          bankName: data.bankName.trim(),
          accountNumber: data.accountNumber.replace(/[\s-]/g, ""),
          accountType: data.accountType,
          branchCode: data.branchCode.replace(/[\s-]/g, ""),
        };
  const destinationCiphertext = await encryptDestination(JSON.stringify(destination));
  const destinationSummary = safeDestinationSummary(data);
  const requestId = crypto.randomUUID();
  const publicId = crypto.randomUUID();
  const claimToken = crypto.randomUUID();

  await sql.transaction([
    sql`INSERT INTO withdrawal_requests (
          id, public_id, user_id, idempotency_key, amount, fee_amount, method,
          destination_ciphertext, destination_summary, status, funds_reserved, claim_token
        ) VALUES (
          ${requestId}::uuid, ${publicId}::uuid, ${userId}::uuid,
          ${data.idempotencyKey}::uuid, ${amount}::numeric, 0, ${data.method},
          ${destinationCiphertext}, ${destinationSummary}, 'Pending', false, ${claimToken}::uuid
        )
        ON CONFLICT (user_id, idempotency_key) DO NOTHING`,
    sql`WITH reserved AS (
          UPDATE users
          SET balance = balance - ${amount}::numeric
          WHERE id = ${userId}::uuid
            AND status = 'Active'
            AND balance >= ${amount}::numeric
            AND EXISTS (
              SELECT 1 FROM withdrawal_requests
              WHERE user_id = ${userId}::uuid
                AND idempotency_key = ${data.idempotencyKey}::uuid
                AND claim_token = ${claimToken}::uuid
                AND status = 'Pending'
                AND funds_reserved = false
            )
          RETURNING id
        )
        UPDATE withdrawal_requests
        SET funds_reserved = true, updated_at = NOW()
        WHERE user_id = ${userId}::uuid
          AND idempotency_key = ${data.idempotencyKey}::uuid
          AND claim_token = ${claimToken}::uuid
          AND EXISTS (SELECT 1 FROM reserved)`,
    sql`UPDATE withdrawal_requests
        SET status = 'Rejected', updated_at = NOW()
        WHERE user_id = ${userId}::uuid
          AND idempotency_key = ${data.idempotencyKey}::uuid
          AND claim_token = ${claimToken}::uuid
          AND funds_reserved = false`,
    sql`UPDATE withdrawal_requests
        SET claim_token = NULL, updated_at = NOW()
        WHERE user_id = ${userId}::uuid
          AND idempotency_key = ${data.idempotencyKey}::uuid
          AND claim_token = ${claimToken}::uuid`,
  ]);

  const request = await findRequest(userId, data.idempotencyKey);
  if (!request) throw new Error("The withdrawal request could not be saved.");
  return publicRequest(request);
}

const adminWithdrawalInputSchema = z.object({
  adminToken: z.string().min(1).max(256),
});

export async function listWithdrawalRequestsAdmin(
  data: z.infer<typeof adminWithdrawalInputSchema>,
) {
  await requireAdminToken(data.adminToken);
  await ensureWithdrawalRequestsTable();
  const rows = (await serverDatabase()`
    SELECT request.public_id::text AS public_id, request.user_id::text AS user_id,
           users.full_name, request.created_at::text AS created_at,
           request.amount::text AS amount, request.fee_amount::text AS fee_amount,
           request.method, request.destination_summary, request.destination_ciphertext,
           request.status
    FROM withdrawal_requests AS request
    JOIN users ON users.id = request.user_id
    WHERE request.status IN ('Pending', 'Processing')
    ORDER BY request.created_at ASC
  `) as AdminWithdrawalRow[];

  return Promise.all(
    rows.map(async (row) => ({
      reference: row.public_id,
      userId: row.user_id,
      fullName: row.full_name,
      createdAt: row.created_at,
      amount: row.amount,
      fee: row.fee_amount,
      method: row.method,
      destinationSummary: row.destination_summary,
      destination: await decryptDestination(row.destination_ciphertext),
      status: row.status,
    })),
  );
}

const updateAdminWithdrawalSchema = adminWithdrawalInputSchema.extend({
  reference: z.string().uuid(),
  status: z.enum(["Processing", "Rejected"]),
});

export async function updateWithdrawalRequestAdmin(
  data: z.infer<typeof updateAdminWithdrawalSchema>,
) {
  await requireAdminToken(data.adminToken);
  await ensureWithdrawalRequestsTable();

  if (data.status === "Processing") {
    const updated = await serverDatabase()`
      UPDATE withdrawal_requests
      SET status = 'Processing', updated_at = NOW()
      WHERE public_id = ${data.reference}::uuid
        AND status = 'Pending'
        AND funds_reserved = true
      RETURNING public_id::text AS public_id
    `;
    if (updated.length === 0) {
      throw new Error("Only pending, reserved requests can be moved to processing.");
    }
  } else {
    const refunded = await serverDatabase()`
      WITH rejected AS (
        UPDATE withdrawal_requests
        SET status = 'Rejected', funds_reserved = false, updated_at = NOW()
        WHERE public_id = ${data.reference}::uuid
          AND status IN ('Pending', 'Processing')
          AND funds_reserved = true
        RETURNING user_id, amount
      ),
      credited AS (
        UPDATE users
        SET balance = users.balance + rejected.amount
        FROM rejected
        WHERE users.id = rejected.user_id
        RETURNING users.id
      )
      SELECT id::text AS id FROM credited
    `;
    if (refunded.length === 0) {
      throw new Error("The withdrawal could not be rejected or refunded.");
    }
  }

  return { reference: data.reference, status: data.status };
}

import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  serverDatabase,
  serverEnvironmentValue,
  verifyUserSessionToken,
} from "@/lib/user-session.server";

export const checkoutInputSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Enter a valid ZAR amount."),
  sessionToken: z.string().min(1).max(500),
});

const paymentEventSchema = z.object({
  id: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string(),
  type: z.string(),
  status: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type PaymentAttemptRow = {
  id: string;
  public_id: string;
  amount: string;
};

type YocoCheckoutResponse = {
  id: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  status: string;
  clientReferenceId?: string | null;
};

function amountInCents(amount: string): number {
  const [whole = "0", fraction = ""] = amount.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents <= 0n || cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("The deposit amount is outside the supported range.");
  }
  return Number(cents);
}

function amountAsDecimal(cents: number): string {
  const value = BigInt(cents);
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}

function parseAmountAsCents(amount: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) return null;
  try {
    return amountInCents(amount);
  } catch {
    return null;
  }
}

function isYocoCheckoutResponse(value: unknown): value is YocoCheckoutResponse {
  if (typeof value !== "object" || value === null) return false;
  const checkout = value as Record<string, unknown>;
  return (
    typeof checkout["id"] === "string" &&
    checkout["id"].length > 0 &&
    Number.isSafeInteger(checkout["amount"]) &&
    typeof checkout["currency"] === "string" &&
    typeof checkout["redirectUrl"] === "string" &&
    (checkout["status"] === "created" ||
      checkout["status"] === "started" ||
      checkout["status"] === "processing" ||
      checkout["status"] === "completed") &&
    (checkout["clientReferenceId"] === undefined ||
      checkout["clientReferenceId"] === null ||
      typeof checkout["clientReferenceId"] === "string")
  );
}

function applicationUrl(path: string): string {
  let configured = "";
  try {
    configured = serverEnvironmentValue("APP_BASE_URL");
  } catch {
    // Local development only: fall back to the request origin when it is localhost.
    const origin = new URL(getRequest().url);
    if (origin.hostname !== "localhost" && origin.hostname !== "127.0.0.1") {
      throw new Error("APP_BASE_URL is not configured.");
    }
    configured = origin.origin;
  }
  const baseUrl = new URL(configured);
  const isLocalHttp =
    baseUrl.protocol === "http:" &&
    (baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1");
  if ((baseUrl.protocol !== "https:" && !isLocalHttp) || baseUrl.username || baseUrl.password) {
    throw new Error("APP_BASE_URL must be an HTTPS URL (HTTP is allowed for localhost).");
  }
  return new URL(path, baseUrl).toString();
}

async function markCheckoutFailed(publicId: string): Promise<void> {
  try {
    const updated = await serverDatabase()`
      UPDATE payment_attempts
      SET status = 'Failed', updated_at = NOW()
      WHERE public_id = ${publicId}::uuid AND status = 'Pending'
      RETURNING id
    `;
    if (updated.length === 0) {
      console.error("The failed Yoco checkout attempt could not be marked as failed.");
    }
  } catch (error) {
    console.error("Unable to mark the Yoco checkout attempt as failed.", error);
  }
}

export async function createYocoDeposit(data: z.infer<typeof checkoutInputSchema>) {
  {
    const amountCents = amountInCents(data.amount);
    const amount = amountAsDecimal(amountCents);
    const userId = await verifyUserSessionToken(data.sessionToken);
    if (!userId) throw new Error("A valid user session is required to deposit funds.");

    const sql = serverDatabase();
    const activeUser = await sql`
      SELECT id FROM users WHERE id = ${userId}::uuid AND status = 'Active' LIMIT 1
    `;
    if (activeUser.length === 0) {
      throw new Error("An active user account is required to deposit funds.");
    }

    const yocoSecretKey = serverEnvironmentValue("YOCO_SECRET_KEY");
    const successUrl = applicationUrl("/finances?deposit=processing");
    const cancelUrl = applicationUrl("/finances?deposit=cancelled");
    const failureUrl = applicationUrl("/finances?deposit=failed");
    const publicId = crypto.randomUUID();
    const attempts = await sql`
      INSERT INTO payment_attempts (
        public_id, user_id, amount, status, updated_at
      ) VALUES (
        ${publicId}::uuid, ${userId}::uuid, ${amount}::numeric, 'Pending', NOW()
      )
      RETURNING id::text AS id, public_id::text AS public_id, amount::text AS amount
    `;
    const attempt = attempts[0] as PaymentAttemptRow | undefined;
    if (!attempt) throw new Error("The deposit attempt could not be created.");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    let response: Response;
    try {
      response = await fetch("https://payments.yoco.com/api/checkouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${yocoSecretKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.public_id,
        },
        body: JSON.stringify({
          amount: amountCents,
          currency: "ZAR",
          successUrl,
          cancelUrl,
          failureUrl,
          clientReferenceId: attempt.public_id,
          metadata: {
            deposit_id: attempt.id,
            deposit_public_id: attempt.public_id,
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      console.error("The request to create a Yoco checkout failed.", error);
      await markCheckoutFailed(attempt.public_id);
      throw new Error("Could not connect to Yoco to start the deposit. Please try again.");
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.error(`Yoco rejected the checkout request with HTTP ${response.status}.`);
      await markCheckoutFailed(attempt.public_id);
      throw new Error("Yoco could not start the deposit. Please try again.");
    }

    let checkoutResponse: unknown;
    try {
      checkoutResponse = await response.json();
    } catch (error) {
      console.error("Yoco returned an unreadable checkout response.", error);
      await markCheckoutFailed(attempt.public_id);
      throw new Error("Yoco returned an invalid checkout response. Please try again.");
    }

    if (!isYocoCheckoutResponse(checkoutResponse)) {
      console.error("Yoco returned a checkout response with an invalid shape.");
      await markCheckoutFailed(attempt.public_id);
      throw new Error("Yoco returned an invalid checkout response. Please try again.");
    }

    let redirectUrl: URL | null;
    try {
      redirectUrl = new URL(checkoutResponse.redirectUrl);
    } catch {
      redirectUrl = null;
    }
    if (
      checkoutResponse.amount !== amountCents ||
      checkoutResponse.currency !== "ZAR" ||
      (checkoutResponse.clientReferenceId !== undefined &&
        checkoutResponse.clientReferenceId !== null &&
        checkoutResponse.clientReferenceId !== attempt.public_id) ||
      !redirectUrl ||
      redirectUrl.protocol !== "https:"
    ) {
      console.error("Yoco returned checkout details that did not match the deposit request.");
      await markCheckoutFailed(attempt.public_id);
      throw new Error("Yoco returned an invalid checkout response. Please try again.");
    }

    const savedCheckout = await sql`
      UPDATE payment_attempts
      SET provider_checkout_id = ${checkoutResponse.id}, updated_at = NOW()
      WHERE id::text = ${attempt.id} AND status = 'Pending'
      RETURNING id
    `;
    if (savedCheckout.length === 0) {
      throw new Error("The Yoco checkout could not be linked to the deposit.");
    }

    return {
      redirect_url: redirectUrl.toString(),
      payment_reference: attempt.public_id,
    };
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function decodeBase64(value: string): Uint8Array {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function verifyWebhookSignature(request: Request, rawBody: string): Promise<boolean> {
  const webhookId = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signatures = request.headers.get("webhook-signature");
  if (!webhookId || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false;

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > 180
  ) {
    return false;
  }

  const secret = serverEnvironmentValue("YOCO_WEBHOOK_SECRET");
  if (!secret.startsWith("whsec_")) {
    throw new Error("YOCO_WEBHOOK_SECRET must be a Yoco Checkout webhook signing secret.");
  }
  const secretBytes = decodeBase64(secret.slice("whsec_".length));
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secretBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent),
  );
  let binarySignature = "";
  for (const byte of new Uint8Array(signatureBytes)) {
    binarySignature += String.fromCharCode(byte);
  }
  const expectedSignature = btoa(binarySignature);

  return signatures.split(/\s+/).some((candidate) => {
    const [version, signature, extra] = candidate.split(",");
    return (
      version === "v1" &&
      extra === undefined &&
      typeof signature === "string" &&
      constantTimeEqual(signature, expectedSignature)
    );
  });
}

function webhookResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

async function getMatchingPaymentAttempt(
  depositId: string,
  publicId: string,
): Promise<(PaymentAttemptRow & { status: string; provider_checkout_id: string | null }) | null> {
  const rows = await serverDatabase()`
    SELECT id::text AS id, public_id::text AS public_id, amount::text AS amount,
           status, provider_checkout_id
    FROM payment_attempts
    WHERE id::text = ${depositId} AND public_id = ${publicId}::uuid
    LIMIT 1
  `;
  return (
    (rows[0] as
      (PaymentAttemptRow & { status: string; provider_checkout_id: string | null }) | undefined) ??
    null
  );
}

async function creditVerifiedPayment(
  depositId: string,
  publicId: string,
  paymentId: string,
  amountCents: number,
): Promise<boolean> {
  const amount = amountAsDecimal(amountCents);
  const completed = await serverDatabase()`
    WITH eligible AS MATERIALIZED (
      SELECT attempt.id, attempt.user_id, attempt.amount
      FROM payment_attempts AS attempt
      WHERE attempt.id::text = ${depositId}
        AND attempt.public_id = ${publicId}::uuid
        AND attempt.provider_checkout_id IS NOT NULL
        AND attempt.status = 'Pending'
        AND attempt.amount = ${amount}::numeric
      FOR UPDATE OF attempt
    ),
    credited AS (
      UPDATE users
      SET balance = users.balance + eligible.amount
      FROM eligible
      WHERE users.id = eligible.user_id
      RETURNING users.id AS user_id
    ),
    recorded AS (
      INSERT INTO transactions (
        user_id, transaction_date, type, method, status, amount
      )
      SELECT eligible.user_id, CURRENT_DATE, 'Deposit', 'Yoco', 'Completed', eligible.amount
      FROM eligible
      JOIN credited ON credited.user_id = eligible.user_id
      RETURNING id, user_id
    ),
    finalized AS (
      UPDATE payment_attempts AS attempt
      SET status = 'Paid',
          provider_payment_id = ${paymentId},
          transaction_id = recorded.id,
          paid_at = NOW(),
          updated_at = NOW()
      FROM eligible
      JOIN recorded ON recorded.user_id = eligible.user_id
      WHERE attempt.id = eligible.id AND attempt.status = 'Pending'
      RETURNING attempt.id
    )
    SELECT id::text AS id FROM finalized
  `;
  return completed.length > 0;
}

async function markVerifiedPaymentFailed(
  depositId: string,
  publicId: string,
  paymentId: string,
  amountCents: number,
): Promise<void> {
  const amount = amountAsDecimal(amountCents);
  await serverDatabase()`
    UPDATE payment_attempts
    SET status = 'Failed', provider_payment_id = ${paymentId}, updated_at = NOW()
    WHERE id::text = ${depositId}
      AND public_id = ${publicId}::uuid
      AND provider_checkout_id IS NOT NULL
      AND amount = ${amount}::numeric
      AND status = 'Pending'
  `;
}

export async function handleYocoWebhook(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 1_000_000) {
    return webhookResponse(413, "Webhook payload is too large.");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 1_000_000) {
    return webhookResponse(413, "Webhook payload is too large.");
  }

  if (!(await verifyWebhookSignature(request, rawBody))) {
    console.warn("Rejected a Yoco webhook with an invalid or expired signature.");
    return webhookResponse(401, "Invalid webhook signature.");
  }

  let eventValue: unknown;
  try {
    eventValue = JSON.parse(rawBody);
  } catch {
    return webhookResponse(400, "Invalid JSON payload.");
  }

  const eventEnvelope = z.object({ type: z.string(), payload: z.unknown() }).safeParse(eventValue);
  if (!eventEnvelope.success) {
    return webhookResponse(400, "Invalid webhook event.");
  }

  if (
    eventEnvelope.data.type !== "payment.succeeded" &&
    eventEnvelope.data.type !== "payment.failed"
  ) {
    return webhookResponse(200, "Event ignored.");
  }

  const paymentResult = paymentEventSchema.safeParse(eventEnvelope.data.payload);
  if (!paymentResult.success) {
    console.error("Yoco sent a malformed payment webhook event.", paymentResult.error);
    return webhookResponse(400, "Invalid payment event.");
  }

  const payment = paymentResult.data;
  const publicId = payment.metadata?.["deposit_public_id"];
  const depositId = payment.metadata?.["deposit_id"];
  if (typeof publicId !== "string" || typeof depositId !== "string") {
    console.error("Yoco payment webhook did not include the deposit reference metadata.");
    return webhookResponse(200, "Payment event acknowledged without a matching deposit.");
  }

  if (
    payment.type !== "payment" ||
    payment.currency !== "ZAR" ||
    payment.amount <= 0 ||
    (eventEnvelope.data.type === "payment.succeeded" && payment.status !== "succeeded")
  ) {
    console.error("Yoco payment webhook details failed payment validation.");
    return webhookResponse(200, "Payment event acknowledged without crediting the account.");
  }

  const attempt = await getMatchingPaymentAttempt(depositId, publicId);
  if (!attempt) {
    console.error("Yoco payment webhook did not match a stored payment attempt.");
    return webhookResponse(200, "Payment event acknowledged without a matching deposit.");
  }

  if (parseAmountAsCents(attempt.amount) !== payment.amount || !attempt.provider_checkout_id) {
    console.error("Yoco payment webhook did not match the stored checkout amount or reference.");
    return webhookResponse(200, "Payment event acknowledged without crediting the account.");
  }

  if (eventEnvelope.data.type === "payment.failed") {
    if (attempt.status === "Pending") {
      await markVerifiedPaymentFailed(depositId, publicId, payment.id, payment.amount);
    }
    return webhookResponse(200, "Payment failure acknowledged.");
  }

  if (attempt.status !== "Pending") {
    return webhookResponse(200, "Payment event already processed.");
  }

  const credited = await creditVerifiedPayment(depositId, publicId, payment.id, payment.amount);
  if (!credited) {
    console.info(
      "Yoco payment webhook was already processed or no longer matched a pending deposit.",
    );
  }
  return webhookResponse(200, "Payment event acknowledged.");
}

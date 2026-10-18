import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireAdminToken } from "@/lib/manual-account.server";
import {
  serverDatabase,
  serverEnvironmentValue,
  verifyUserSessionToken,
} from "@/lib/user-session.server";

// drive.file only exposes files and folders this app created (or the user opened with it).
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const OAUTH_COOKIE = "gd_oauth_nonce";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const MAX_UPLOADS_PER_DAY = 10;
const encoder = new TextEncoder();

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const documentTypeSchema = z.enum(["Proof of payment", "Bank statement"]);
export const adminTokenInputSchema = z.object({ adminToken: z.string().min(1).max(256) });

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function signState(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`google-oauth-state:${serverEnvironmentValue("ADMIN_SESSION_SECRET")}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

async function tokenCipherKey(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`google-drive-token:${serverEnvironmentValue("ADMIN_SESSION_SECRET")}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptToken(token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await tokenCipherKey(),
    encoder.encode(token),
  );
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

async function decryptToken(stored: string): Promise<string> {
  const [iv, ciphertext] = stored.split(".");
  if (!iv || !ciphertext) throw new Error("Stored Google token is malformed.");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(iv) },
    await tokenCipherKey(),
    fromBase64Url(ciphertext),
  );
  return new TextDecoder().decode(plain);
}

async function ensureTables() {
  const sql = serverDatabase();
  await sql`CREATE TABLE IF NOT EXISTS google_drive_connection (
    id smallint PRIMARY KEY CHECK (id = 1),
    refresh_token_ciphertext text NOT NULL,
    account_email text,
    connected_at timestamptz NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE google_drive_connection ADD COLUMN IF NOT EXISTS folder_id text`;
  await sql`CREATE TABLE IF NOT EXISTS deposit_documents (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type text NOT NULL CHECK (document_type IN ('Proof of payment', 'Bank statement')),
    declared_amount numeric(14, 2) CHECK (declared_amount IS NULL OR declared_amount > 0),
    drive_file_id text NOT NULL,
    stored_filename text NOT NULL,
    size_bytes integer NOT NULL CHECK (size_bytes > 0),
    sha256 text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, sha256)
  )`;
  await sql`ALTER TABLE deposit_documents ADD COLUMN IF NOT EXISTS payment_reference text`;
}

function configuredRedirectUri(): string {
  const redirectUri = serverEnvironmentValue("GOOGLE_REDIRECT_URI");
  const base = new URL(serverEnvironmentValue("APP_BASE_URL"));
  const redirect = new URL(redirectUri);
  if (redirect.origin !== base.origin || redirect.pathname !== "/api/google/callback") {
    throw new Error("GOOGLE_REDIRECT_URI must be APP_BASE_URL + /api/google/callback.");
  }
  return redirect.toString();
}

function isSecureDeployment(): boolean {
  return new URL(serverEnvironmentValue("APP_BASE_URL")).protocol === "https:";
}

export async function startGoogleDriveAuth(data: z.infer<typeof adminTokenInputSchema>) {
  await requireAdminToken(data.adminToken);
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `g.${Date.now() + OAUTH_STATE_TTL_MS}.${nonce}`;
  const state = `${payload}.${await signState(payload)}`;

  setCookie(OAUTH_COOKIE, nonce, {
    httpOnly: true,
    secure: isSecureDeployment(),
    sameSite: "lax",
    path: "/api/google",
    maxAge: OAUTH_STATE_TTL_MS / 1000,
  });

  const params = new URLSearchParams({
    client_id: serverEnvironmentValue("GOOGLE_CLIENT_ID"),
    redirect_uri: configuredRedirectUri(),
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

async function verifyState(state: string): Promise<boolean> {
  const [prefix, expiresText, nonce, signature, extra] = state.split(".");
  const expiresAt = Number(expiresText);
  if (
    extra !== undefined ||
    prefix !== "g" ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now() ||
    !/^[0-9a-f]{32}$/.test(nonce ?? "") ||
    !signature
  ) {
    return false;
  }
  const expected = await signState(`g.${expiresText}.${nonce}`);
  if (!constantTimeEqual(signature, expected)) return false;
  const cookieNonce = getCookie(OAUTH_COOKIE);
  return typeof cookieNonce === "string" && constantTimeEqual(cookieNonce, nonce!);
}

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

async function requestToken(params: Record<string, string>): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: serverEnvironmentValue("GOOGLE_CLIENT_ID"),
      client_secret: serverEnvironmentValue("GOOGLE_CLIENT_SECRET"),
      ...params,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token request failed with status ${response.status}.`);
  }
  return (await response.json()) as GoogleTokenResponse;
}

async function configuredFolderUsable(accessToken: string): Promise<boolean> {
  const folderId = serverEnvironmentValue("GOOGLE_DRIVE_FOLDER_ID");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  // Under drive.file a folder the app did not create is normally reported as not found.
  if (!response.ok) return false;
  const folder = (await response.json()) as {
    mimeType?: string;
    capabilities?: { canAddChildren?: boolean };
  };
  return (
    folder.mimeType === "application/vnd.google-apps.folder" &&
    folder.capabilities?.canAddChildren === true
  );
}

async function createAppFolder(accessToken: string): Promise<string> {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Easy Investments - Deposit Documents",
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!response.ok) throw new Error(`Drive folder creation failed with status ${response.status}.`);
  const folder = (await response.json()) as { id?: string };
  if (!folder.id) throw new Error("Drive did not return a folder id.");
  return folder.id;
}

async function resolveUploadFolder(accessToken: string): Promise<{ id: string; isConfigured: boolean }> {
  if (await configuredFolderUsable(accessToken)) {
    return { id: serverEnvironmentValue("GOOGLE_DRIVE_FOLDER_ID"), isConfigured: true };
  }
  return { id: await createAppFolder(accessToken), isConfigured: false };
}

export async function handleGoogleCallback(request: Request): Promise<Response> {
  const appBase = serverEnvironmentValue("APP_BASE_URL");
  const redirectTo = (result: string) =>
    new Response(null, {
      status: 302,
      headers: { Location: new URL(`/admin?google=${result}`, appBase).toString(), "Cache-Control": "no-store" },
    });

  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state") ?? "";
    const stateValid = await verifyState(state);
    setCookie(OAUTH_COOKIE, "", { path: "/api/google", maxAge: 0 });
    if (!stateValid) return redirectTo("error");

    const code = url.searchParams.get("code");
    if (url.searchParams.get("error") || !code) return redirectTo("denied");

    const tokens = await requestToken({
      code,
      grant_type: "authorization_code",
      redirect_uri: configuredRedirectUri(),
    });
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Google did not return a refresh token.");
    }
    if (!tokens.scope?.split(" ").includes(DRIVE_SCOPE)) {
      throw new Error("The required Google Drive permission was not granted.");
    }
    const folder = await resolveUploadFolder(tokens.access_token);

    const about = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const accountEmail = about.ok
      ? ((await about.json()) as { user?: { emailAddress?: string } }).user?.emailAddress ?? null
      : null;

    await ensureTables();
    await serverDatabase()`
      INSERT INTO google_drive_connection (
        id, refresh_token_ciphertext, account_email, folder_id, connected_at
      )
      VALUES (1, ${await encryptToken(tokens.refresh_token)}, ${accountEmail}, ${folder.id}, NOW())
      ON CONFLICT (id) DO UPDATE
      SET refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
          account_email = EXCLUDED.account_email,
          folder_id = EXCLUDED.folder_id,
          connected_at = NOW()
    `;
    return redirectTo(folder.isConfigured ? "connected" : "connected-new-folder");
  } catch (error) {
    console.error("Google Drive authorization failed.", error);
    return redirectTo("error");
  }
}

export async function getGoogleDriveStatus(data: z.infer<typeof adminTokenInputSchema>) {
  await requireAdminToken(data.adminToken);
  await ensureTables();
  const rows = (await serverDatabase()`
    SELECT account_email, connected_at::text AS connected_at FROM google_drive_connection WHERE id = 1
  `) as { account_email: string | null; connected_at: string }[];
  const row = rows[0];
  return {
    connected: Boolean(row),
    accountEmail: row?.account_email ?? null,
    connectedAt: row?.connected_at ?? null,
  };
}

async function getDriveAccessToken(): Promise<string> {
  await ensureTables();
  const rows = (await serverDatabase()`
    SELECT refresh_token_ciphertext FROM google_drive_connection WHERE id = 1
  `) as { refresh_token_ciphertext: string }[];
  if (!rows[0]) throw new HttpError(503, "Document uploads are not available yet.");
  try {
    const tokens = await requestToken({
      grant_type: "refresh_token",
      refresh_token: await decryptToken(rows[0].refresh_token_ciphertext),
    });
    if (!tokens.access_token) throw new Error("No access token returned.");
    return tokens.access_token;
  } catch (error) {
    console.error("Unable to refresh the Google Drive access token.", error);
    throw new HttpError(503, "Document uploads are temporarily unavailable.");
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function hasPdfStructure(bytes: Uint8Array): boolean {
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  if (bytes.length < 16 || !magic.every((value, index) => bytes[index] === value)) return false;
  const tail = new TextDecoder("latin1").decode(bytes.subarray(Math.max(0, bytes.length - 2048)));
  return tail.includes("%%EOF");
}

async function uploadToDrive(
  bytes: Uint8Array,
  filename: string,
  appProperties: Record<string, string>,
): Promise<string> {
  const accessToken = await getDriveAccessToken();
  const folderRows = (await serverDatabase()`
    SELECT folder_id FROM google_drive_connection WHERE id = 1
  `) as { folder_id: string | null }[];
  const folderId = folderRows[0]?.folder_id;
  if (!folderId) throw new HttpError(503, "Document uploads need Google Drive to be reconnected.");
  const boundary = `ei_${toHex(crypto.getRandomValues(new Uint8Array(12)))}`;
  const metadata = JSON.stringify({
    name: filename,
    mimeType: "application/pdf",
    parents: [folderId],
    appProperties,
  });
  const head = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
  );
  const tail = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!response.ok) {
    console.error(`Google Drive upload failed with status ${response.status}.`);
    throw new HttpError(502, "The document could not be stored. Please try again later.");
  }
  const result = (await response.json()) as { id?: string };
  if (!result.id) throw new HttpError(502, "The document could not be stored. Please try again later.");
  return result.id;
}

async function deleteFromDrive(fileId: string) {
  try {
    const accessToken = await getDriveAccessToken();
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
    );
  } catch (error) {
    console.error("Unable to clean up an orphaned Drive file.", error);
  }
}

export async function handleDocumentUpload(request: Request): Promise<Response> {
  try {
    const userId = await verifyUserSessionToken(bearerToken(request));
    if (!userId) throw new HttpError(401, "Your session has expired. Please log in again.");

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_DOCUMENT_BYTES + 64 * 1024) {
      throw new HttpError(413, "The file is too large. The maximum size is 4 MB.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new HttpError(400, "The upload could not be read.");
    }
    const file = form.get("file");
    const documentType = documentTypeSchema.safeParse(form.get("documentType"));
    if (!(file instanceof File) || !documentType.success) {
      throw new HttpError(400, "Choose a document type and a PDF file.");
    }
    const amountText = String(form.get("amount") ?? "").trim();
    let amount: string | null = null;
    if (amountText !== "") {
      const parsed = Number(amountText);
      if (!/^\d{1,12}(\.\d{1,2})?$/.test(amountText) || !(parsed > 0)) {
        throw new HttpError(400, "Enter a valid deposit amount or leave it empty.");
      }
      amount = parsed.toFixed(2);
    }
    const reference = String(form.get("reference") ?? "").trim();
    if (reference !== "" && !/^[A-Za-z0-9 _./-]{1,64}$/.test(reference)) {
      throw new HttpError(400, "The payment reference may only contain letters, numbers and - _ . /");
    }
    if (file.size === 0) throw new HttpError(400, "The file is empty.");
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new HttpError(413, "The file is too large. The maximum size is 4 MB.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfStructure(bytes)) throw new HttpError(415, "Only valid PDF documents are accepted.");

    await ensureTables();
    const sql = serverDatabase();
    const users = await sql`SELECT status FROM users WHERE id = ${userId}::uuid LIMIT 1`;
    if ((users[0] as { status: string } | undefined)?.status !== "Active") {
      throw new HttpError(403, "Your account cannot upload documents.");
    }
    const recent = (await sql`
      SELECT COUNT(*)::int AS total FROM deposit_documents
      WHERE user_id = ${userId}::uuid AND created_at > NOW() - INTERVAL '24 hours'
    `) as { total: number }[];
    if ((recent[0]?.total ?? 0) >= MAX_UPLOADS_PER_DAY) {
      throw new HttpError(429, "Daily upload limit reached. Please try again tomorrow.");
    }

    const sha256 = toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
    const duplicate = await sql`
      SELECT 1 FROM deposit_documents WHERE user_id = ${userId}::uuid AND sha256 = ${sha256} LIMIT 1
    `;
    if (duplicate.length > 0) throw new HttpError(409, "You have already uploaded this document.");

    const documentId = crypto.randomUUID();
    const prefix = documentType.data === "Bank statement" ? "bank-statement" : "proof-of-payment";
    const storedFilename = `${prefix}_${userId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}_${documentId.slice(0, 8)}.pdf`;
    const driveFileId = await uploadToDrive(bytes, storedFilename, { userId, documentId });

    try {
      await sql`
        INSERT INTO deposit_documents (
          id, user_id, document_type, declared_amount, drive_file_id, stored_filename,
          size_bytes, sha256, payment_reference
        ) VALUES (
          ${documentId}::uuid, ${userId}::uuid, ${documentType.data}, ${amount}::numeric,
          ${driveFileId}, ${storedFilename}, ${bytes.length}, ${sha256},
          ${reference === "" ? null : reference}
        )
      `;
    } catch (error) {
      await deleteFromDrive(driveFileId);
      console.error("Unable to record the uploaded document.", error);
      throw new HttpError(500, "The document could not be recorded. Please try again.");
    }
    return jsonResponse({ id: documentId, status: "Pending verification" }, 201);
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
    console.error("Document upload failed.", error);
    return jsonResponse({ error: "The document could not be uploaded. Please try again." }, 500);
  }
}

export async function listDepositDocumentsAdmin(data: z.infer<typeof adminTokenInputSchema>) {
  await requireAdminToken(data.adminToken);
  await ensureTables();
  const rows = (await serverDatabase()`
    SELECT d.id::text AS id, u.full_name, u.email, d.document_type, d.declared_amount::text AS amount,
           d.stored_filename, d.size_bytes, d.payment_reference, d.created_at::text AS created_at
    FROM deposit_documents d JOIN users u ON u.id = d.user_id
    ORDER BY d.created_at DESC LIMIT 200
  `) as {
    id: string;
    full_name: string;
    email: string;
    document_type: string;
    amount: string | null;
    stored_filename: string;
    size_bytes: number;
    payment_reference: string | null;
    created_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    documentType: row.document_type,
    amount: row.amount,
    paymentReference: row.payment_reference,
    filename: row.stored_filename,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }));
}

export async function handleDocumentDownload(request: Request): Promise<Response> {
  try {
    try {
      await requireAdminToken(bearerToken(request));
    } catch {
      throw new HttpError(401, "Admin authentication is required.");
    }
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Invalid document.");

    await ensureTables();
    const rows = (await serverDatabase()`
      SELECT drive_file_id, stored_filename FROM deposit_documents WHERE id = ${id}::uuid LIMIT 1
    `) as { drive_file_id: string; stored_filename: string }[];
    if (!rows[0]) throw new HttpError(404, "Document not found.");

    const accessToken = await getDriveAccessToken();
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rows[0].drive_file_id)}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!driveResponse.ok || !driveResponse.body) {
      throw new HttpError(502, "The document could not be retrieved.");
    }
    return new Response(driveResponse.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${rows[0].stored_filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
    console.error("Document download failed.", error);
    return jsonResponse({ error: "The document could not be retrieved." }, 500);
  }
}

import { neon } from "@neondatabase/serverless";
import { getRequest } from "@tanstack/react-start/server";

const USER_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

type CloudflareRequest = Request & {
  runtime?: { cloudflare?: { env?: Record<string, unknown> } };
};

export function serverEnvironmentValue(name: string): string {
  const request = getRequest() as CloudflareRequest;
  const bindingValue = request.runtime?.cloudflare?.env?.[name];
  const nodeValue = typeof process === "undefined" ? undefined : process.env[name];
  const value = bindingValue ?? nodeValue;

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing server configuration: ${name}`);
  }
  return value;
}

export function serverDatabase() {
  return neon(serverEnvironmentValue("DATABASE_URL"));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(serverEnvironmentValue("ADMIN_SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function createUserSessionToken(userId: string): Promise<string> {
  const payload = `u.${userId}.${Date.now() + USER_SESSION_DURATION_MS}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifyUserSessionToken(token: string): Promise<string | null> {
  const [prefix, userId, expiresAtText, signature, extra] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (
    extra !== undefined ||
    prefix !== "u" ||
    !/^[0-9a-f-]{36}$/i.test(userId ?? "") ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now() ||
    !signature
  ) {
    return null;
  }
  const expected = await sign(`u.${userId}.${expiresAtText}`);
  return constantTimeEqual(signature, expected) ? userId! : null;
}

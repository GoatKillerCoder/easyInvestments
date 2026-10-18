import {
  getGoogleDriveStatusServerFn,
  listDepositDocumentsAdminServerFn,
  startGoogleDriveAuthServerFn,
} from "@/lib/google-drive-server";

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export type DocumentType = "Proof of payment" | "Bank statement";

export function startGoogleDriveAuth(adminToken: string) {
  return startGoogleDriveAuthServerFn({ data: { adminToken } });
}

export function getGoogleDriveStatus(adminToken: string) {
  return getGoogleDriveStatusServerFn({ data: { adminToken } });
}

export function listDepositDocuments(adminToken: string) {
  return listDepositDocumentsAdminServerFn({ data: { adminToken } });
}

export async function uploadDepositDocument(
  sessionToken: string,
  file: File,
  documentType: DocumentType,
  amount: string,
): Promise<void> {
  const form = new FormData();
  form.set("file", file);
  form.set("documentType", documentType);
  if (amount.trim()) form.set("amount", amount.trim());

  const response = await fetch("/api/documents/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: form,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "The document could not be uploaded. Please try again.");
  }
}

export async function openDepositDocument(adminToken: string, id: string): Promise<void> {
  const response = await fetch(`/api/documents/download?id=${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "The document could not be opened.");
  }
  const url = URL.createObjectURL(await response.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

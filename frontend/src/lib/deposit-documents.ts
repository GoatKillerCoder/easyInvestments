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

export function uploadDepositDocument(
  sessionToken: string,
  file: File,
  documentType: DocumentType,
  amount: string,
  reference: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const form = new FormData();
  form.set("file", file);
  form.set("documentType", documentType);
  if (amount.trim()) form.set("amount", amount.trim());
  if (reference.trim()) form.set("reference", reference.trim());

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/documents/upload");
    request.setRequestHeader("Authorization", `Bearer ${sessionToken}`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      let message = "The document could not be uploaded. Please try again.";
      try {
        message = (JSON.parse(request.responseText) as { error?: string }).error ?? message;
      } catch {
        // Keep the generic message when the response is not JSON.
      }
      reject(new Error(message));
    };
    request.onerror = () =>
      reject(new Error("Network error. Check your connection and try again."));
    request.send(form);
  });
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

import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getGoogleDriveStatus,
  listDepositDocuments,
  openDepositDocument,
  startGoogleDriveAuth,
} from "@/lib/deposit-documents";
import { formatRand } from "@/lib/manual-account-data";

type DriveStatus = Awaited<ReturnType<typeof getGoogleDriveStatus>>;
type DepositDocument = Awaited<ReturnType<typeof listDepositDocuments>>[number];

export function AdminDocumentsPanel({ adminToken }: { adminToken: string }) {
  const [status, setStatus] = useState<DriveStatus>();
  const [documents, setDocuments] = useState<DepositDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [driveStatus, savedDocuments] = await Promise.all([
        getGoogleDriveStatus(adminToken),
        listDepositDocuments(adminToken),
      ]);
      setStatus(driveStatus);
      setDocuments(savedDocuments);
    } catch (error) {
      console.error("Unable to load uploaded documents.", error);
      setMessage("Uploaded documents could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("google");
    if (result === "connected") setMessage("Google Drive was connected successfully.");
    else if (result === "connected-new-folder") {
      setMessage(
        "Google Drive was connected. The configured folder is not accessible with the drive.file permission, so a new private folder, \"Easy Investments - Deposit Documents\", was created in the connected account.",
      );
    }
    else if (result === "denied") setMessage("Google Drive access was not granted.");
    else if (result === "error") {
      setMessage("Google Drive could not be connected. Check the configuration and try again.");
    }
    if (result) window.history.replaceState(null, "", window.location.pathname);
    void load();
  }, [load]);

  async function connect() {
    setIsConnecting(true);
    setMessage("");
    try {
      const { url } = await startGoogleDriveAuth(adminToken);
      window.location.assign(url);
    } catch (error) {
      console.error("Unable to start Google authorization.", error);
      setMessage("Google authorization could not be started.");
      setIsConnecting(false);
    }
  }

  async function view(id: string) {
    setBusyId(id);
    setMessage("");
    try {
      await openDepositDocument(adminToken, id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The document could not be opened.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Deposit documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Private PDFs uploaded by users, stored in Google Drive. An upload is not proof of
            payment and never credits an account; verify the funds before any balance change.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void connect()}
          disabled={isConnecting}
          className="rounded-lg border border-input px-4 py-2 text-sm font-bold hover:bg-muted disabled:opacity-60"
        >
          {isConnecting ? "Redirecting…" : status?.connected ? "Reconnect Google Drive" : "Connect Google Drive"}
        </button>
      </div>

      <p className="mb-4 text-sm">
        {status?.connected
          ? `Google Drive connected${status.accountEmail ? ` as ${status.accountEmail}` : ""}.`
          : "Google Drive is not connected. Users cannot upload documents until an administrator connects it."}
      </p>
      {message && (
        <p role="status" className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm">
          {message}
        </p>
      )}

      {isLoading ? (
        <LoaderCircle className="size-5 animate-spin text-primary" aria-label="Loading" />
      ) : documents.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0 text-sm">
                <p className="font-bold">
                  {document.fullName} · {document.documentType}
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  {document.email} · {document.createdAt.slice(0, 16)} ·{" "}
                  {document.amount ? `Declared ${formatRand(Number(document.amount))}` : "No amount declared"}{" "}
                  · Pending verification
                </p>
              </div>
              <button
                type="button"
                disabled={busyId !== ""}
                onClick={() => void view(document.id)}
                className="rounded-lg border border-input px-3 py-1.5 text-sm font-bold hover:bg-muted disabled:opacity-60"
              >
                {busyId === document.id ? "Opening…" : "View PDF"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No documents have been uploaded yet.</p>
      )}
    </section>
  );
}

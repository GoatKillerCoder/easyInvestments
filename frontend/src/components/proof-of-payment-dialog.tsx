import { FileUp, LoaderCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_DOCUMENT_BYTES,
  uploadDepositDocument,
  type DocumentType,
} from "@/lib/deposit-documents";
import { getUserSessionToken } from "@/lib/manual-account-data";

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm font-normal";

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProofOfPaymentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [documentType, setDocumentType] = useState<DocumentType>("Proof of payment");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [result, setResult] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    if (!open && !isUploading) {
      setFile(null);
      setAmount("");
      setReference("");
      setProgress(0);
      setResult(null);
      setInputKey((key) => key + 1);
    }
  }, [open, isUploading]);

  function chooseFile(selected: File | null) {
    setResult(null);
    setFile(null);
    if (!selected) return;
    const looksLikePdf =
      selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf");
    if (!looksLikePdf) {
      setResult({ message: "Only PDF files are accepted.", error: true });
      setInputKey((key) => key + 1);
    } else if (selected.size === 0) {
      setResult({ message: "The selected file is empty.", error: true });
      setInputKey((key) => key + 1);
    } else if (selected.size > MAX_DOCUMENT_BYTES) {
      setResult({ message: "The file is too large. The maximum size is 4 MB.", error: true });
      setInputKey((key) => key + 1);
    } else {
      setFile(selected);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    const sessionToken = getUserSessionToken();
    if (!sessionToken) {
      setResult({ message: "Your session has expired. Please log in again.", error: true });
      return;
    }
    if (!file) {
      setResult({ message: "Choose a PDF file to upload.", error: true });
      return;
    }

    setIsUploading(true);
    setProgress(0);
    try {
      await uploadDepositDocument(sessionToken, file, documentType, amount, reference, setProgress);
      setFile(null);
      setAmount("");
      setReference("");
      setInputKey((key) => key + 1);
      setResult({
        message:
          "Document uploaded. It is pending review and your balance has not changed. Funds reflect only after the payment is received and verified.",
        error: false,
      });
    } catch (error) {
      setResult({
        message: error instanceof Error ? error.message : "The upload failed. Please try again.",
        error: true,
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isUploading && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-5 text-primary" aria-hidden="true" />
            Upload Proof of Payment
          </DialogTitle>
          <DialogDescription>
            Upload your proof of payment or bank statement as a PDF (up to 4 MB). Uploading does
            not credit your account; deposits are credited only after the funds are received and
            verified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Document type
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value as DocumentType)}
                disabled={isUploading}
                className={fieldClass}
              >
                <option>Proof of payment</option>
                <option>Bank statement</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Amount paid (ZAR, optional)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isUploading}
                className={fieldClass}
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Payment reference (optional)
            <input
              type="text"
              maxLength={64}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              disabled={isUploading}
              placeholder="Reference used on your bank transfer"
              className={fieldClass}
            />
          </label>
          <div>
            <label htmlFor="proof-file" className="block text-sm font-semibold">
              PDF document
            </label>
            <input
              key={inputKey}
              id="proof-file"
              type="file"
              accept="application/pdf,.pdf"
              disabled={isUploading}
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm file:font-semibold"
            />
            {file && (
              <p className="mt-2 break-all text-xs text-muted-foreground">
                Selected: <span className="font-semibold text-foreground">{file.name}</span> (
                {formatSize(file.size)})
              </p>
            )}
          </div>

          {isUploading && (
            <div aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {progress < 100 ? `Uploading… ${progress}%` : "Securing your document…"}
              </p>
            </div>
          )}

          {result && (
            <p
              role={result.error ? "alert" : "status"}
              className={`rounded-lg px-3 py-2 text-sm ${
                result.error
                  ? "border border-destructive/30 text-destructive"
                  : "bg-emerald-50 text-emerald-900"
              }`}
            >
              {result.message}
            </p>
          )}

          <Button
            type="submit"
            disabled={isUploading || !file}
            className="h-10 w-full rounded-lg font-bold"
          >
            {isUploading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Uploading…
              </>
            ) : (
              "Upload PDF"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

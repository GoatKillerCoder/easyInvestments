import { FileUp, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  MAX_DOCUMENT_BYTES,
  uploadDepositDocument,
  type DocumentType,
} from "@/lib/deposit-documents";
import { getUserSessionToken } from "@/lib/manual-account-data";

export function DocumentUploadForm() {
  const [documentType, setDocumentType] = useState<DocumentType>("Proof of payment");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ message: string; error: boolean } | null>(null);
  const [inputKey, setInputKey] = useState(0);

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
    if (file.size > MAX_DOCUMENT_BYTES) {
      setResult({ message: "The file is too large. The maximum size is 4 MB.", error: true });
      return;
    }

    setIsUploading(true);
    try {
      await uploadDepositDocument(sessionToken, file, documentType, amount);
      setFile(null);
      setAmount("");
      setInputKey((key) => key + 1);
      setResult({
        message:
          "Document uploaded. It is pending verification and your balance has not changed. Funds reflect only after the payment is received and verified.",
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <FileUp className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-bold">Upload your document (optional)</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        PDF only, up to 4 MB. Uploading does not credit your account.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold">
          Document type
          <select
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as DocumentType)}
            disabled={isUploading}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm font-normal"
          >
            <option>Proof of payment</option>
            <option>Bank statement</option>
          </select>
        </label>
        <label className="block text-xs font-semibold">
          Amount paid (ZAR, optional)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={isUploading}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm font-normal"
          />
        </label>
      </div>
      <input
        key={inputKey}
        type="file"
        accept="application/pdf,.pdf"
        aria-label="PDF document"
        disabled={isUploading}
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm file:font-semibold"
      />
      <Button type="submit" disabled={isUploading || !file} className="h-10 w-full rounded-lg font-bold">
        {isUploading ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Uploading…
          </>
        ) : (
          "Upload PDF"
        )}
      </Button>
      {result && (
        <p
          role={result.error ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${
            result.error ? "border border-destructive/30 text-destructive" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}

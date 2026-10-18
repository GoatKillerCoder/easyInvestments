import { Check, Clock3, Copy, Landmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const bankDetails = [
  { label: "Account Holder", value: "Meridan Investment Group" },
  { label: "Bank Name", value: "Discovery Bank" },
  { label: "Account Type", value: "Current Account" },
  { label: "Branch Code", value: "679000" },
  { label: "BIC/SWIFT", value: "DISCZAJJXXX" },
  { label: "Account Number", value: "13422467943" },
];

async function writeToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy method (e.g. insecure context or denied permission).
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("Copy failed");
}

export function BankDetailsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [copiedKey, setCopiedKey] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) {
      setNotice(null);
      setCopiedKey("");
    }
    return () => clearTimeout(timer.current);
  }, [open]);

  async function copy(key: string, text: string, successMessage: string) {
    clearTimeout(timer.current);
    try {
      await writeToClipboard(text);
      setCopiedKey(key);
      setNotice({ message: successMessage, error: false });
    } catch {
      setCopiedKey("");
      setNotice({
        message: "Could not copy automatically. Please select and copy the details manually.",
        error: true,
      });
    }
    timer.current = setTimeout(() => {
      setCopiedKey("");
      setNotice(null);
    }, 3000);
  }

  const allDetails = `Bank Account Details\n${bankDetails
    .map((item) => `${item.label}: ${item.value}`)
    .join("\n")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[100] max-h-[90vh] max-w-xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="size-5 text-primary" aria-hidden="true" />
            Manual Bank Transfer
          </DialogTitle>
          <DialogDescription>
            Copy the details below and make the transfer from your own banking app.
          </DialogDescription>
        </DialogHeader>

        <section aria-label="Bank account details" className="divide-y rounded-xl border">
          {bankDetails.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="break-all text-sm font-semibold tabular-nums">{item.value}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => copy(item.label, item.value, `${item.label} copied`)}
                aria-label={`Copy ${item.label}`}
                className="h-10 min-w-10 shrink-0 rounded-lg px-3"
              >
                {copiedKey === item.label ? (
                  <Check className="size-4 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {copiedKey === item.label ? "Copied" : "Copy"}
                </span>
              </Button>
            </div>
          ))}
        </section>

        <div aria-live="polite" className="min-h-6">
          {notice && (
            <p
              role={notice.error ? "alert" : "status"}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                notice.error
                  ? "border border-destructive/30 text-destructive"
                  : "bg-emerald-50 text-emerald-900"
              }`}
            >
              {notice.message}
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Transfer funds from your personal bank account using the banking details above. Open your
          banking app, add the beneficiary if necessary, and make your deposit. Please use your
          assigned deposit reference if the application already provides one.
        </p>

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Bank transfers may take time to reflect. Funds are added only after your payment has
            been received and verified. Please keep your proof of payment.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          After paying, use <span className="font-semibold">Upload Proof of Payment</span> on the
          Finances page to send us your proof of payment.
        </p>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            onClick={() => copy("all", allDetails, "All bank details copied")}
            className="h-10 rounded-lg px-5 font-bold"
          >
            {copiedKey === "all" ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            Copy All Details
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg px-5 font-bold"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

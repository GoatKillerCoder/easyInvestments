import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Eye,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  calculatePortfolioValue,
  createWithdrawalRequest,
  createYocoDeposit,
  formatRand,
  getActiveManualAccount,
  getUserSessionToken,
  type ManualAccount,
  type WithdrawalRequestInput,
} from "@/lib/manual-account-data";

export const Route = createFileRoute("/finances")({
  head: () => ({
    meta: [
      { title: "Finances | EasyEquities" },
      {
        name: "description",
        content: "Review deposit and withdrawal activity for your investment account.",
      },
    ],
  }),
  component: Finances,
});

type TransactionType = "Deposit" | "Withdrawal";
type TransactionFilter = "All" | TransactionType;
type FinanceAction = "Deposit" | "Withdrawal";

type Transaction = {
  date: string;
  type: TransactionType;
  status: "Pending" | "Processing" | "Completed" | "Rejected" | "Failed";
  amount: string;
  institution: string;
};

type WithdrawalMethod = "Bank account" | "PayPal";
type WithdrawalStep = "form" | "review" | "success";
type WithdrawalFieldErrors = Partial<
  Record<
    | "amount"
    | "accountHolderName"
    | "bankName"
    | "accountNumber"
    | "accountType"
    | "branchCode"
    | "paypalEmail",
    string
  >
>;

const menuItems = [
  "Dashboard",
  "Finances",
  "Rewards Hub",
  "Analytics & Education",
  "Help Center",
  "Profile settings",
];

const filters: TransactionFilter[] = ["All", "Deposit", "Withdrawal"];

function Finances() {
  const [filter, setFilter] = useState<TransactionFilter>("All");
  const [action, setAction] = useState<FinanceAction | null>(null);
  const [amount, setAmount] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [account, setAccount] = useState<ManualAccount>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [withdrawalStep, setWithdrawalStep] = useState<WithdrawalStep>("form");
  const [withdrawalMethod, setWithdrawalMethod] = useState<WithdrawalMethod>("Bank account");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<"Cheque" | "Savings" | "Transmission">("Cheque");
  const [branchCode, setBranchCode] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [withdrawalErrors, setWithdrawalErrors] = useState<WithdrawalFieldErrors>({});
  const [withdrawalRequestKey, setWithdrawalRequestKey] = useState("");
  const [withdrawalReference, setWithdrawalReference] = useState("");
  const confirmationLock = useRef(false);

  useEffect(() => {
    const depositResult = new URLSearchParams(window.location.search).get("deposit");
    if (depositResult === "processing") {
      setPageNotice(
        "Yoco returned you to the site. Your deposit will appear after Yoco's payment confirmation is verified.",
      );
    } else if (depositResult === "cancelled") {
      setPageNotice("The checkout was cancelled. No deposit was credited to your account.");
    } else if (depositResult === "failed") {
      setPageNotice(
        "Yoco could not complete the checkout. No deposit was credited to your account.",
      );
    }

    void getActiveManualAccount()
      .then((savedAccount) => {
        if (!savedAccount) return;

        setAccount(savedAccount);
        setTransactions(
          savedAccount.transactions.map((transaction) => ({
            date: new Intl.DateTimeFormat("en-ZA", { dateStyle: "long" }).format(
              new Date(`${transaction.date}T00:00:00`),
            ),
            type: transaction.type,
            status: transaction.status,
            amount: `${transaction.type === "Deposit" ? "+" : "-"}R ${transaction.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
            institution: transaction.method,
          })),
        );
      })
      .catch((error: unknown) => {
        console.error("Unable to fetch finance details from Neon.", error);
        setLoadError("Finance information could not be loaded from Neon.");
      })
      .finally(() => setIsLoadingAccount(false));
  }, []);

  const visibleTransactions =
    filter === "All"
      ? transactions
      : transactions.filter((transaction) => transaction.type === filter);

  function openAction(nextAction: FinanceAction) {
    setAmount("");
    setActionNotice("");
    setWithdrawalStep("form");
    setWithdrawalMethod("Bank account");
    setAccountHolderName("");
    setBankName("");
    setAccountNumber("");
    setAccountType("Cheque");
    setBranchCode("");
    setPaypalEmail("");
    setWithdrawalErrors({});
    setWithdrawalRequestKey("");
    setWithdrawalReference("");
    setAction(nextAction);
  }

  function validateWithdrawal(): WithdrawalFieldErrors {
    const errors: WithdrawalFieldErrors = {};
    const trimmedAmount = amount.trim();
    const amountMatch = /^\d{1,12}(?:\.\d{1,2})?$/.test(trimmedAmount);
    const amountInCents = amountMatch ? Math.round(Number(trimmedAmount) * 100) : Number.NaN;

    if (!amountMatch || !Number.isSafeInteger(amountInCents)) {
      errors.amount = "Enter a valid amount with no more than two decimal places.";
    } else if (amountInCents <= 0) {
      errors.amount = "The withdrawal amount must be greater than zero.";
    } else if (!account || amountInCents > Math.round(account.balance * 100)) {
      errors.amount = "The amount cannot exceed your available cash balance.";
    }

    if (withdrawalMethod === "Bank account") {
      if (!accountHolderName.trim()) errors.accountHolderName = "Enter the account holder name.";
      if (!bankName.trim()) errors.bankName = "Enter the bank name.";
      const accountDigits = accountNumber.replace(/\D/g, "").length;
      if (!/^[\d -]+$/.test(accountNumber.trim()) || accountDigits < 4 || accountDigits > 34) {
        errors.accountNumber = "Enter a valid bank account number.";
      }
      if (!accountType) errors.accountType = "Select an account type.";
      if (branchCode && !/^[\d -]{1,20}$/.test(branchCode.trim())) {
        errors.branchCode = "Enter a valid branch code.";
      }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail.trim())) {
      errors.paypalEmail = "Enter a valid PayPal email address.";
    }
    return errors;
  }

  function handleWithdrawalContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateWithdrawal();
    setWithdrawalErrors(errors);
    setActionNotice("");
    if (Object.keys(errors).length === 0) {
      setWithdrawalRequestKey("");
      setWithdrawalStep("review");
    }
  }

  function clearWithdrawalError(field: keyof WithdrawalFieldErrors) {
    setWithdrawalErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleWithdrawalConfirm() {
    if (confirmationLock.current || isSubmitting) return;
    confirmationLock.current = true;
    const sessionToken = getUserSessionToken();
    if (!sessionToken) {
      setActionNotice("Your session has expired. Please log in again to request a withdrawal.");
      confirmationLock.current = false;
      return;
    }

    setIsSubmitting(true);
    setActionNotice("");
    const idempotencyKey = withdrawalRequestKey || crypto.randomUUID();
    setWithdrawalRequestKey(idempotencyKey);

    try {
      const shared = { amount: amount.trim(), idempotencyKey, sessionToken };
      const request: WithdrawalRequestInput =
        withdrawalMethod === "PayPal"
          ? { ...shared, method: "PayPal", paypalEmail: paypalEmail.trim() }
          : {
              ...shared,
              method: "Bank account",
              accountHolderName: accountHolderName.trim(),
              bankName: bankName.trim(),
              accountNumber: accountNumber.trim(),
              accountType,
              branchCode: branchCode.trim(),
            };
      const result = await createWithdrawalRequest(request);
      if (result.status !== "Pending") {
        setActionNotice(
          "Your withdrawal request could not be accepted because the available cash balance has changed. Please review your balance and try again.",
        );
        return;
      }

      setWithdrawalReference(result.reference);
      setWithdrawalStep("success");
      try {
        const refreshedAccount = await getActiveManualAccount();
        if (refreshedAccount) {
          setAccount(refreshedAccount);
          setTransactions(
            refreshedAccount.transactions.map((transaction) => ({
              date: new Intl.DateTimeFormat("en-ZA", { dateStyle: "long" }).format(
                new Date(`${transaction.date}T00:00:00`),
              ),
              type: transaction.type,
              status: transaction.status,
              amount: `${transaction.type === "Deposit" ? "+" : "-"}R ${transaction.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
              institution: transaction.method,
            })),
          );
        }
      } catch (error) {
        console.error(
          "The withdrawal was saved, but finance details could not be refreshed.",
          error,
        );
        setPageNotice(
          "Your request was saved. Refresh the page later to see the updated balance and activity.",
        );
      }
    } catch (error) {
      console.error("Unable to create the withdrawal request.", error);
      setActionNotice(
        "We could not confirm that your request was saved. Retry safely; the same request reference will be used.",
      );
    } finally {
      setIsSubmitting(false);
      confirmationLock.current = false;
    }
  }

  async function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action !== "Deposit") {
      setActionNotice(`${action} request could not be processed.`);
      return;
    }

    const sessionToken = getUserSessionToken();
    if (!sessionToken) {
      setActionNotice("Your session has expired. Please log in again to make a deposit.");
      return;
    }

    setIsSubmitting(true);
    setActionNotice("");
    try {
      const checkout = await createYocoDeposit(amount, sessionToken);
      window.location.assign(checkout.redirect_url);
    } catch (error) {
      console.error("Unable to start the Yoco deposit checkout.", error);
      setActionNotice("We could not start your deposit. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {isLoadingAccount && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/35 backdrop-blur-[2px]"
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 px-5 py-4 shadow-lg">
            <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">Loading your finances…</span>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <Link to="/" aria-label="EasyEquities home" className="inline-flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wallet className="size-5" aria-hidden="true" />
            </span>
            <span className="text-xl leading-none text-primary">
              <span className="font-extrabold">Easy</span>
              <span className="font-light">Equities</span>
            </span>
          </Link>

          <nav aria-label="Portfolio navigation" className="flex items-center gap-2 sm:gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open portfolio menu"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <LayoutDashboard className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Portfolio</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {menuItems.map((item) =>
                  item === "Dashboard" ||
                  item === "Finances" ||
                  item === "Rewards Hub" ||
                  item === "Analytics & Education" ||
                  item === "Help Center" ||
                  item === "Profile settings" ? (
                    <DropdownMenuItem key={item} asChild>
                      <Link
                        to={
                          item === "Dashboard"
                            ? "/dashboard"
                            : item === "Finances"
                              ? "/finances"
                              : item === "Rewards Hub"
                                ? "/rewards-hub"
                                : item === "Analytics & Education"
                                  ? "/analytics-education"
                                  : item === "Help Center"
                                    ? "/help-center"
                                    : "/profile-settings"
                        }
                      >
                        {item}
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem key={item}>{item}</DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <a
              href="#transaction-history"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Activity
            </a>
            <button
              type="button"
              aria-label="Notifications"
              className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <Bell className="size-5" aria-hidden="true" />
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-bold hover:bg-muted"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to login</span>
            </Link>
          </nav>
        </header>

        <section className="py-8 sm:py-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Investment account
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Finances</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage deposits, withdrawals, and account activity.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
              <Eye className="size-4" aria-hidden="true" />
              {account?.accountType ?? "Account"}
            </span>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            <Button
              onClick={() => openAction("Deposit")}
              className="h-11 rounded-lg px-5 font-bold"
            >
              <ArrowDownToLine aria-hidden="true" />
              Deposit
            </Button>
            <Button
              variant="outline"
              onClick={() => openAction("Withdrawal")}
              className="h-11 rounded-lg px-5 font-bold"
            >
              <ArrowUpFromLine aria-hidden="true" />
              Withdrawal
            </Button>
          </div>

          {pageNotice && (
            <p role="status" className="mb-6 rounded-lg border border-border bg-card p-4 text-sm">
              {pageNotice}
            </p>
          )}

          <section
            id="transaction-history"
            className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold">Transaction history</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review your account deposits and withdrawals.
                </p>
              </div>
              <CircleHelp className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Account
                </p>
                <p className="mt-2 font-bold">{account?.accountPlatform ?? "—"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {account
                    ? `${account.accountType} ${account.accountNumber}`
                    : "No account loaded"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Balance
                </p>
                <p className="mt-2 text-xl font-extrabold tabular-nums">
                  {account
                    ? `R ${account.balance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Portfolio value
                </p>
                <p className="mt-2 text-xl font-extrabold tabular-nums">
                  {account
                    ? formatRand(calculatePortfolioValue(account.balance, account.totalInvested))
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total invested
                </p>
                <p className="mt-2 text-xl font-extrabold tabular-nums">
                  {account
                    ? `R ${account.totalInvested.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Period
                </p>
                <p className="mt-2 inline-flex items-center gap-2 font-bold">
                  <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                  All time
                </p>
              </div>
            </div>

            {loadError && (
              <p role="status" className="mb-5 rounded-lg border border-destructive/30 p-4 text-sm">
                {loadError}
              </p>
            )}

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div aria-label="Filter transactions" className="flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={filter === item}
                    onClick={() => setFilter(item)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      filter === item
                        ? "bg-primary text-primary-foreground"
                        : "border border-input bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {visibleTransactions.length} transactions
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Method
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-bold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleTransactions.map((transaction, index) => (
                    <tr key={`${transaction.date}-${transaction.type}-${index}`}>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                          {transaction.date}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold">{transaction.type}</td>
                      <td className="px-4 py-4 text-muted-foreground">{transaction.institution}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                            transaction.status === "Completed"
                              ? "bg-emerald-50 text-emerald-800"
                              : transaction.status === "Pending" ||
                                  transaction.status === "Processing"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-red-50 text-red-800"
                          }`}
                        >
                          {transaction.status === "Completed" ? (
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          ) : transaction.status === "Pending" ||
                            transaction.status === "Processing" ? (
                            <Clock3 className="size-3.5" aria-hidden="true" />
                          ) : (
                            <XCircle className="size-3.5" aria-hidden="true" />
                          )}
                          {transaction.status}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-4 text-right font-extrabold tabular-nums ${
                          transaction.type === "Deposit" ? "text-emerald-700" : "text-foreground"
                        }`}
                      >
                        {transaction.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleTransactions.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No transactions to display.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>

      <Dialog
        open={action !== null}
        onOpenChange={(open) => !open && !isSubmitting && setAction(null)}
      >
        <DialogContent
          className={`max-h-[90vh] overflow-y-auto rounded-2xl ${
            action === "Withdrawal" ? "max-w-xl" : ""
          }`}
        >
          <DialogHeader>
            <DialogTitle>
              {action === "Withdrawal" ? "Withdraw funds" : "Deposit funds"}
            </DialogTitle>
            <DialogDescription>
              {action === "Withdrawal"
                ? withdrawalStep === "review"
                  ? "Review the details before submitting your withdrawal request."
                  : withdrawalStep === "success"
                    ? "Your request has been recorded for manual review."
                    : "Select your withdrawal method and enter the amount you want to withdraw."
                : "Choose an amount to pay securely through Yoco."}
            </DialogDescription>
          </DialogHeader>
          {action === "Withdrawal" ? (
            withdrawalStep === "success" ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-bold">Withdrawal request submitted</p>
                      <p className="mt-1 text-sm">It is pending review. No payout has been made.</p>
                      <p className="mt-3 break-all text-xs font-semibold">
                        Reference: {withdrawalReference}
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={() => setAction(null)}
                    className="h-10 rounded-lg px-5 font-bold"
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : withdrawalStep === "review" ? (
              <div className="space-y-5">
                <section aria-label="Withdrawal review" className="space-y-3 rounded-xl border p-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Withdrawal amount</span>
                    <span className="font-bold tabular-nums">{formatRand(Number(amount))}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Method</span>
                    <span className="text-right font-semibold">{withdrawalMethod}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Destination</span>
                    <span className="text-right font-semibold">
                      {withdrawalMethod === "PayPal"
                        ? `${paypalEmail.trim().slice(0, 1)}***@${paypalEmail.trim().split("@")[1]}`
                        : `${bankName.trim()} •••• ${accountNumber.replace(/\D/g, "").slice(-4)}`}
                    </span>
                  </div>
                  {withdrawalMethod === "Bank account" && (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Account holder</span>
                      <span className="text-right font-semibold">{accountHolderName.trim()}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Withdrawal fee</span>
                      <span className="font-semibold">R 0,00 at request submission</span>
                    </div>
                    <div className="mt-2 flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Estimated net payout</span>
                      <span className="font-extrabold tabular-nums">
                        {formatRand(Number(amount))}
                      </span>
                    </div>
                  </div>
                </section>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  This request will be reviewed manually. No payout fee is charged now; any fee or
                  processing time will be confirmed with you before a payout is arranged.
                </p>
                {actionNotice && (
                  <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm">
                    {actionNotice}
                  </p>
                )}
                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => {
                      setActionNotice("");
                      setWithdrawalRequestKey("");
                      setWithdrawalStep("form");
                    }}
                    className="h-10 rounded-lg px-5 font-bold"
                  >
                    Back to edit
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleWithdrawalConfirm()}
                    className="h-10 rounded-lg px-5 font-bold"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        Submitting…
                      </>
                    ) : (
                      "Confirm withdrawal"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleWithdrawalContinue} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="withdrawal-method" className="block text-sm font-semibold">
                    Withdrawal method
                  </label>
                  <select
                    id="withdrawal-method"
                    value={withdrawalMethod}
                    onChange={(event) => {
                      setWithdrawalMethod(event.target.value as WithdrawalMethod);
                      setWithdrawalErrors({});
                    }}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Bank account">Bank account</option>
                    <option value="PayPal">PayPal</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Requests are reviewed manually; neither method initiates an automatic transfer.
                  </p>
                </div>

                <div>
                  <label htmlFor="withdrawal-amount" className="mb-2 block text-sm font-semibold">
                    Withdrawal amount (ZAR)
                  </label>
                  <div className="flex h-11 items-center rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                    <span className="mr-2 text-sm text-muted-foreground">R</span>
                    <input
                      id="withdrawal-amount"
                      type="number"
                      min="0.01"
                      max={account?.balance}
                      step="0.01"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        clearWithdrawalError("amount");
                      }}
                      aria-invalid={Boolean(withdrawalErrors.amount)}
                      aria-describedby={
                        withdrawalErrors.amount
                          ? "withdrawal-amount-error withdrawal-available"
                          : "withdrawal-available"
                      }
                      placeholder="0.00"
                      className="h-full w-full bg-transparent text-sm outline-none"
                    />
                    <button
                      type="button"
                      disabled={!account || account.balance <= 0}
                      onClick={() => {
                        setAmount((account?.balance ?? 0).toFixed(2));
                        clearWithdrawalError("amount");
                      }}
                      className="ml-2 whitespace-nowrap text-xs font-bold text-primary disabled:opacity-50"
                    >
                      Max
                    </button>
                  </div>
                  <p id="withdrawal-available" className="mt-2 text-xs text-muted-foreground">
                    Available cash:{" "}
                    <span className="font-bold text-foreground">
                      {account ? formatRand(account.balance) : "Unavailable"}
                    </span>
                  </p>
                  {withdrawalErrors.amount && (
                    <p id="withdrawal-amount-error" className="mt-1 text-xs text-destructive">
                      {withdrawalErrors.amount}
                    </p>
                  )}
                </div>

                {withdrawalMethod === "Bank account" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="withdrawal-holder"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Account holder name
                      </label>
                      <input
                        id="withdrawal-holder"
                        value={accountHolderName}
                        onChange={(event) => {
                          setAccountHolderName(event.target.value);
                          clearWithdrawalError("accountHolderName");
                        }}
                        autoComplete="name"
                        aria-invalid={Boolean(withdrawalErrors.accountHolderName)}
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                      {withdrawalErrors.accountHolderName && (
                        <p className="mt-1 text-xs text-destructive">
                          {withdrawalErrors.accountHolderName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="withdrawal-bank" className="mb-2 block text-sm font-semibold">
                        Bank name
                      </label>
                      <input
                        id="withdrawal-bank"
                        value={bankName}
                        onChange={(event) => {
                          setBankName(event.target.value);
                          clearWithdrawalError("bankName");
                        }}
                        autoComplete="off"
                        aria-invalid={Boolean(withdrawalErrors.bankName)}
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                      {withdrawalErrors.bankName && (
                        <p className="mt-1 text-xs text-destructive">{withdrawalErrors.bankName}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="withdrawal-account-number"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Account number
                      </label>
                      <input
                        id="withdrawal-account-number"
                        value={accountNumber}
                        onChange={(event) => {
                          setAccountNumber(event.target.value);
                          clearWithdrawalError("accountNumber");
                        }}
                        inputMode="numeric"
                        autoComplete="off"
                        aria-invalid={Boolean(withdrawalErrors.accountNumber)}
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                      {withdrawalErrors.accountNumber && (
                        <p className="mt-1 text-xs text-destructive">
                          {withdrawalErrors.accountNumber}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="withdrawal-account-type"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Account type
                      </label>
                      <select
                        id="withdrawal-account-type"
                        value={accountType}
                        onChange={(event) => {
                          setAccountType(
                            event.target.value as "Cheque" | "Savings" | "Transmission",
                          );
                          clearWithdrawalError("accountType");
                        }}
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option>Cheque</option>
                        <option>Savings</option>
                        <option>Transmission</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="withdrawal-branch-code"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Branch code{" "}
                        <span className="font-normal text-muted-foreground">
                          (if required by your bank)
                        </span>
                      </label>
                      <input
                        id="withdrawal-branch-code"
                        value={branchCode}
                        onChange={(event) => {
                          setBranchCode(event.target.value);
                          clearWithdrawalError("branchCode");
                        }}
                        inputMode="numeric"
                        autoComplete="off"
                        aria-invalid={Boolean(withdrawalErrors.branchCode)}
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                      {withdrawalErrors.branchCode && (
                        <p className="mt-1 text-xs text-destructive">
                          {withdrawalErrors.branchCode}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="withdrawal-paypal-email"
                      className="mb-2 block text-sm font-semibold"
                    >
                      PayPal email address
                    </label>
                    <input
                      id="withdrawal-paypal-email"
                      type="email"
                      value={paypalEmail}
                      onChange={(event) => {
                        setPaypalEmail(event.target.value);
                        clearWithdrawalError("paypalEmail");
                      }}
                      autoComplete="email"
                      aria-invalid={Boolean(withdrawalErrors.paypalEmail)}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                    {withdrawalErrors.paypalEmail && (
                      <p className="mt-1 text-xs text-destructive">
                        {withdrawalErrors.paypalEmail}
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Your payout details are encrypted before storage and are only submitted for
                  review. No PIN, password, or card details are requested.
                </div>
                {actionNotice && (
                  <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm">
                    {actionNotice}
                  </p>
                )}
                <DialogFooter>
                  <Button type="submit" className="h-10 rounded-lg px-5 font-bold">
                    Continue to review
                  </Button>
                </DialogFooter>
              </form>
            )
          ) : (
            <form onSubmit={handleActionSubmit} className="space-y-5">
              <div>
                <label htmlFor="finance-amount" className="mb-2 block text-sm font-semibold">
                  Amount
                </label>
                <div className="flex h-11 items-center rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                  <span className="mr-2 text-sm text-muted-foreground">R</span>
                  <input
                    id="finance-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    className="h-full w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              {actionNotice && (
                <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
                  {actionNotice}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-lg px-5 font-bold"
                >
                  {isSubmitting ? "Starting checkout..." : "Continue to payment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

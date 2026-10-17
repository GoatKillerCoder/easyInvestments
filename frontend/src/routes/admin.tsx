import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { brokerPartners } from "@/lib/broker-partners";
import {
  authenticateAdmin,
  calculatePortfolioValue,
  deleteAdminManualAccount,
  formatRand,
  getAdminWithdrawalRequests,
  getManualAccounts,
  saveAdminManualAccount,
  updateAdminWithdrawalRequest,
  updateAdminManualAccount,
  updateAdminManualAccountStatus,
  type AdminWithdrawalRequest,
  type AccountTransaction,
  type ManualAccount,
  type PortfolioHolding,
} from "@/lib/manual-account-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin | EasyEquities" },
      {
        name: "description",
        content: "Restricted administrative portal for EasyEquities operations.",
      },
    ],
  }),
  component: AdminRouteView,
});

const emptyHolding: PortfolioHolding = {
  fundName: "",
  ticker: "",
  marketValue: 0,
  changePct: "",
};

const sampleHoldings: PortfolioHolding[] = [
  { fundName: "Apple Inc.", ticker: "AAPL", marketValue: 25450, changePct: "+3.45%" },
  {
    fundName: "Microsoft Corporation",
    ticker: "MSFT",
    marketValue: 32800,
    changePct: "+4.12%",
  },
  { fundName: "NVIDIA Corporation", ticker: "NVDA", marketValue: 28650, changePct: "+6.28%" },
  { fundName: "Amazon.com Inc.", ticker: "AMZN", marketValue: 21300, changePct: "+2.85%" },
  { fundName: "Alphabet Inc.", ticker: "GOOGL", marketValue: 19750, changePct: "+1.92%" },
  { fundName: "Tesla Inc.", ticker: "TSLA", marketValue: 15600, changePct: "-2.35%" },
  { fundName: "Meta Platforms Inc.", ticker: "META", marketValue: 23450, changePct: "+3.18%" },
  { fundName: "Berkshire Hathaway", ticker: "BRK.B", marketValue: 18900, changePct: "+1.65%" },
  { fundName: "JPMorgan Chase & Co.", ticker: "JPM", marketValue: 16750, changePct: "+2.42%" },
  { fundName: "Coca-Cola Company", ticker: "KO", marketValue: 12500, changePct: "+0.85%" },
  { fundName: "Standard Bank Group", ticker: "SBK", marketValue: 14800, changePct: "+1.74%" },
  { fundName: "Naspers Limited", ticker: "NPN", marketValue: 17650, changePct: "+2.15%" },
  { fundName: "Prosus N.V.", ticker: "PRX", marketValue: 16400, changePct: "+1.88%" },
  { fundName: "FirstRand Limited", ticker: "FSR", marketValue: 13250, changePct: "+1.32%" },
  { fundName: "Capitec Bank Holdings", ticker: "CPI", marketValue: 11950, changePct: "+2.67%" },
  { fundName: "Shoprite Holdings", ticker: "SHP", marketValue: 10800, changePct: "+1.45%" },
  { fundName: "MTN Group", ticker: "MTN", marketValue: 9750, changePct: "-0.65%" },
  { fundName: "Sasol Limited", ticker: "SOL", marketValue: 8900, changePct: "-1.82%" },
  { fundName: "S&P 500 Index Fund", ticker: "SP500", marketValue: 35600, changePct: "+3.72%" },
  { fundName: "Global Equity Fund", ticker: "GEQF", marketValue: 27450, changePct: "+2.94%" },
];

function createRandomHoldings(): PortfolioHolding[] {
  const shuffled = [...sampleHoldings];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const selectionCount = 3 + Math.floor(Math.random() * 3);
  return shuffled.slice(0, selectionCount).map((holding) => ({ ...holding }));
}

const emptyTransaction: AccountTransaction = {
  date: new Date().toISOString().slice(0, 10),
  type: "Deposit",
  method: "",
  status: "Completed",
  amount: 0,
};

const ADMIN_TOKEN_STORAGE_KEY = "easyEquitiesAdminToken";

function AdminRouteView() {
  const pathname = useLocation({ select: (location) => location.pathname });
  return pathname === "/admin" ? <AdminPage /> : <Outlet />;
}

function sameRecords(left: unknown[], right: unknown[]): boolean {
  if (left.length !== right.length) return false;
  const leftRecords = left.map((record) => JSON.stringify(record)).sort();
  const rightRecords = right.map((record) => JSON.stringify(record)).sort();
  return leftRecords.every((record, index) => record === rightRecords[index]);
}

function AdminPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<ManualAccount[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<AdminWithdrawalRequest[]>([]);
  const [notice, setNotice] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false);
  const [updatingWithdrawalReference, setUpdatingWithdrawalReference] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string>();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("South Africa");
  const [address, setAddress] = useState("");
  const [registeredDate, setRegisteredDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [accountType, setAccountType] = useState("Investment account");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("Active");
  const [accountPlatform, setAccountPlatform] = useState("MT4");
  const [accountNumber, setAccountNumber] = useState("");
  const [balance, setBalance] = useState("0");
  const [totalInvested, setTotalInvested] = useState("0");
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([{ ...emptyHolding }]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const calculatedPortfolioValue = calculatePortfolioValue(Number(balance), Number(totalInvested));

  useEffect(() => {
    setHoldings(createRandomHoldings());
  }, []);

  useEffect(() => {
    const storedToken = sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (!storedToken) {
      setIsCheckingAccess(false);
      return;
    }

    void Promise.all([getManualAccounts(storedToken), getAdminWithdrawalRequests(storedToken)])
      .then(([savedAccounts, savedWithdrawals]) => {
        setAccounts(savedAccounts);
        setWithdrawalRequests(savedWithdrawals);
        setAdminToken(storedToken);
      })
      .catch((error: unknown) => {
        console.error("Unable to verify the admin session or load accounts from Neon.", error);
        sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        setNotice("Your admin session has expired. Enter the administrator PIN to continue.");
      })
      .finally(() => setIsCheckingAccess(false));
  }, []);

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setIsSigningIn(true);

    try {
      const token = await authenticateAdmin(adminPin);
      const [savedAccounts, savedWithdrawals] = await Promise.all([
        getManualAccounts(token),
        getAdminWithdrawalRequests(token),
      ]);
      sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
      setAdminToken(token);
      setAccounts(savedAccounts);
      setWithdrawalRequests(savedWithdrawals);
      setAdminPin("");
    } catch (error) {
      console.error("Unable to authenticate the admin session.", error);
      setNotice("Admin sign-in failed. Check the PIN and server configuration, then try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleRefreshAccounts() {
    if (!adminToken) return;

    setIsRefreshingAccounts(true);
    setNotice("");
    try {
      const [savedAccounts, savedWithdrawals] = await Promise.all([
        getManualAccounts(adminToken),
        getAdminWithdrawalRequests(adminToken),
      ]);
      setAccounts(savedAccounts);
      setWithdrawalRequests(savedWithdrawals);
    } catch (error) {
      console.error("Unable to refresh registered users from Neon.", error);
      setNotice("Registered users could not be refreshed. Check your admin session and try again.");
    } finally {
      setIsRefreshingAccounts(false);
    }
  }

  async function handleWithdrawalReview(
    request: AdminWithdrawalRequest,
    status: "Processing" | "Rejected",
  ) {
    if (!adminToken) return;
    if (
      status === "Rejected" &&
      !window.confirm(
        `Reject withdrawal ${request.reference} and return ${formatRand(Number(request.amount))} to ${request.fullName}'s available cash?`,
      )
    ) {
      return;
    }

    setUpdatingWithdrawalReference(request.reference);
    setNotice("");
    try {
      await updateAdminWithdrawalRequest(adminToken, request.reference, status);
      const [savedAccounts, savedWithdrawals] = await Promise.all([
        getManualAccounts(adminToken),
        getAdminWithdrawalRequests(adminToken),
      ]);
      setAccounts(savedAccounts);
      setWithdrawalRequests(savedWithdrawals);
      setNotice(
        status === "Rejected"
          ? "Withdrawal rejected and reserved cash returned to the user's available balance."
          : "Withdrawal request moved to processing. Arrange the payout outside this application.",
      );
    } catch (error) {
      console.error("Unable to update the withdrawal request.", error);
      setNotice(
        "The withdrawal request could not be updated. Refresh and verify its current status.",
      );
    } finally {
      setUpdatingWithdrawalReference("");
    }
  }

  function handleExit() {
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setAdminToken("");
    void navigate({ to: "/" });
  }

  function updateHolding(index: number, field: keyof PortfolioHolding, value: string) {
    setHoldings((current) =>
      current.map((holding, holdingIndex) =>
        holdingIndex === index
          ? {
              ...holding,
              [field]: field === "marketValue" ? Number(value) : value,
            }
          : holding,
      ),
    );
  }

  function updateTransaction(index: number, field: keyof AccountTransaction, value: string) {
    setTransactions((current) =>
      current.map((transaction, transactionIndex) =>
        transactionIndex === index
          ? {
              ...transaction,
              [field]: field === "amount" ? Number(value) : value,
            }
          : transaction,
      ),
    );
  }

  function resetAccountForm() {
    setEditingAccountId(undefined);
    setFullName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setPhone("");
    setCountry("South Africa");
    setAddress("");
    setRegisteredDate(new Date().toISOString().slice(0, 10));
    setAccountType("Investment account");
    setCompany("");
    setStatus("Active");
    setAccountPlatform("MT4");
    setAccountNumber("");
    setBalance("0");
    setTotalInvested("0");
    setHoldings(createRandomHoldings());
    setTransactions([]);
  }

  function startEditing(account: ManualAccount) {
    setEditingAccountId(account.id);
    setFullName(account.fullName);
    setEmail(account.email);
    setPassword("");
    setShowPassword(false);
    setPhone(account.phone);
    setCountry(account.country);
    setAddress(account.address);
    setRegisteredDate(account.registeredDate);
    setAccountType(account.accountType);
    setCompany(account.company ?? "");
    setStatus(account.status);
    setAccountPlatform(account.accountPlatform);
    setAccountNumber(account.accountNumber);
    setBalance(String(account.balance));
    setTotalInvested(String(account.totalInvested));
    setHoldings(account.holdings.map((holding) => ({ ...holding })));
    setTransactions(account.transactions.map((transaction) => ({ ...transaction })));
    setNotice(`Editing ${account.fullName}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(account: ManualAccount) {
    if (!adminToken || !window.confirm(`Permanently delete ${account.fullName}'s account?`)) {
      return;
    }

    setNotice("");
    try {
      await deleteAdminManualAccount(account.id, adminToken);
      setAccounts(await getManualAccounts(adminToken));
      if (editingAccountId === account.id) resetAccountForm();
      setNotice(`Deleted ${account.fullName}'s account.`);
    } catch (error) {
      console.error("Unable to delete the account from Neon.", error);
      setNotice("The account could not be deleted. Check your admin session and try again.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    let isStatusOnlyUpdate = false;

    try {
      if (!adminToken) {
        setNotice("Admin authentication is required. Sign in again to continue.");
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (
        accounts.some(
          (account) =>
            account.id !== editingAccountId && account.email.toLowerCase() === normalizedEmail,
        )
      ) {
        setNotice("A user with this email is already registered.");
        return;
      }
      if (!company.trim()) {
        setNotice("Please select the company this user should be registered to.");
        return;
      }
      const account: ManualAccount = {
        id: editingAccountId ?? crypto.randomUUID(),
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        country: country.trim(),
        address: address.trim(),
        registeredDate,
        accountType,
        company: company.trim(),
        status,
        accountPlatform: accountPlatform.trim(),
        accountNumber: accountNumber.trim(),
        balance: Number(balance),
        portfolioValue: calculatedPortfolioValue,
        totalInvested: Number(totalInvested),
        holdings: holdings.filter((holding) => holding.fundName.trim() && holding.ticker.trim()),
        transactions: transactions.filter((transaction) => transaction.method.trim()),
      };
      if (editingAccountId) {
        const originalAccount = accounts.find(
          (savedAccount) => savedAccount.id === editingAccountId,
        );
        const statusOnlyChanged =
          originalAccount &&
          account.status !== originalAccount.status &&
          account.fullName === originalAccount.fullName &&
          account.email === originalAccount.email &&
          account.phone === originalAccount.phone &&
          account.country === originalAccount.country &&
          account.address === originalAccount.address &&
          account.registeredDate === originalAccount.registeredDate &&
          account.accountType === originalAccount.accountType &&
          account.company === originalAccount.company &&
          account.accountPlatform === originalAccount.accountPlatform &&
          account.accountNumber === originalAccount.accountNumber &&
          account.balance === originalAccount.balance &&
          account.portfolioValue === originalAccount.portfolioValue &&
          account.totalInvested === originalAccount.totalInvested &&
          sameRecords(account.holdings, originalAccount.holdings) &&
          sameRecords(account.transactions, originalAccount.transactions);
        if (statusOnlyChanged) {
          isStatusOnlyUpdate = true;
          const updatedAccount = await updateAdminManualAccountStatus(
            account.id,
            account.status,
            adminToken,
          );
          setAccounts((current) =>
            current.map((savedAccount) =>
              savedAccount.id === updatedAccount.id
                ? { ...savedAccount, status: updatedAccount.status }
                : savedAccount,
            ),
          );
          setNotice(`Updated ${account.fullName}'s status to ${updatedAccount.status}.`);
          resetAccountForm();
          return;
        } else {
          await updateAdminManualAccount(account, adminToken, password || undefined);
        }
      } else {
        await saveAdminManualAccount({ account, password }, adminToken);
      }
      setAccounts(await getManualAccounts(adminToken));
      setNotice(
        editingAccountId
          ? `Updated ${account.fullName} in the Neon database.`
          : `Saved ${account.fullName} to the Neon database.`,
      );
      resetAccountForm();
    } catch (error) {
      console.error("Unable to save the manual account.", error);
      let errorMessage = isStatusOnlyUpdate
        ? "The user status could not be updated. Check your admin session and database connection."
        : "The account could not be saved. Please check your admin login and database settings.";
      if (error instanceof Error && error.message.includes("already registered")) {
        errorMessage = "A user with this email is already registered.";
      }
      setNotice(errorMessage);
    }
  }

  if (isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <p role="status" className="text-sm text-muted-foreground">
          Verifying administrator access…
        </p>
      </main>
    );
  }

  if (!adminToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary">
            Restricted access
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Admin sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the administrator PIN to access account management.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleAdminLogin}>
            <label htmlFor="admin-pin" className="block space-y-2 text-sm font-semibold">
              Administrator PIN
              <input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                required
                value={adminPin}
                onChange={(event) => setAdminPin(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={isSigningIn}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LockKeyhole className="size-4" aria-hidden="true" />
              {isSigningIn ? "Verifying…" : "Sign in"}
            </button>
          </form>
          {notice && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm"
            >
              {notice}
            </p>
          )}
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="mt-5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Back to home
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground sm:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary">
                Restricted access
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Admin portal</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-4 py-2 text-sm font-bold hover:bg-muted"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </button>
          <Link
            to="/admin/communications"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-4 py-2 text-sm font-bold hover:bg-muted"
          >
            Client communications
          </Link>
        </header>

        <section className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-extrabold">Withdrawal requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Payout details are decrypted only for this authenticated admin view. No payout
              provider is configured; completing a transfer must happen outside this application.
            </p>
          </div>
          {withdrawalRequests.length ? (
            <div className="space-y-4">
              {withdrawalRequests.map((request) => (
                <article
                  key={request.reference}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{request.fullName}</h3>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        Reference: {request.reference}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                      {request.status}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Amount</dt>
                      <dd className="font-bold">{formatRand(Number(request.amount))}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Method</dt>
                      <dd className="font-semibold">{request.method}</dd>
                    </div>
                    {"paypalEmail" in request.destination ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">PayPal destination</dt>
                        <dd className="break-all font-semibold">
                          {request.destination.paypalEmail}
                        </dd>
                      </div>
                    ) : (
                      <>
                        <div>
                          <dt className="text-xs text-muted-foreground">Account holder</dt>
                          <dd className="font-semibold">{request.destination.accountHolderName}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Bank account</dt>
                          <dd className="break-all font-semibold">
                            {request.destination.bankName} · {request.destination.accountType} ·{" "}
                            {request.destination.accountNumber}
                          </dd>
                        </div>
                        {request.destination.branchCode && (
                          <div>
                            <dt className="text-xs text-muted-foreground">Branch code</dt>
                            <dd className="font-semibold">{request.destination.branchCode}</dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {request.status === "Pending" && (
                      <button
                        type="button"
                        disabled={updatingWithdrawalReference !== ""}
                        onClick={() => void handleWithdrawalReview(request, "Processing")}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
                      >
                        {updatingWithdrawalReference === request.reference
                          ? "Updating…"
                          : "Mark processing"}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={updatingWithdrawalReference !== ""}
                      onClick={() => void handleWithdrawalReview(request, "Rejected")}
                      className="rounded-lg border border-input px-4 py-2 text-sm font-bold hover:bg-muted disabled:opacity-60"
                    >
                      Reject and refund
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              There are no pending withdrawal requests.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold">
                {editingAccountId ? "Update user" : "Register user manually"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These fields match the users, finances, and portfolio_holdings tables.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-4 font-extrabold">User information</legend>
              <label className="space-y-2 text-sm font-semibold">
                Full name
                <input
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                {editingAccountId ? "Set or reset password (optional)" : "Temporary password"}
                <span className="relative block">
                  <input
                    required={!editingAccountId}
                    minLength={8}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-11 font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide entered password" : "Show entered password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  At least 8 characters. Leave blank to keep the current password. Stored passwords
                  are securely hashed and cannot be viewed; entering a password here resets it.
                </span>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Phone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Country
                <input
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold sm:col-span-2">
                Address
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Registered date
                <input
                  required
                  type="date"
                  value={registeredDate}
                  onChange={(event) => setRegisteredDate(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Account type
                <input
                  required
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Company
                <select
                  required
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                >
                  <option value="" disabled>
                    Select user company
                  </option>
                  {brokerPartners.map((partner) => (
                    <option key={partner.name} value={partner.name}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                >
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Suspended</option>
                  <option>Deactivated</option>
                </select>
              </label>
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-4 font-extrabold">Finances table</legend>
              <label className="space-y-2 text-sm font-semibold">
                Account platform
                <input
                  required
                  value={accountPlatform}
                  onChange={(event) => setAccountPlatform(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Account number
                <input
                  required
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Balance (ZAR)
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={balance}
                  onChange={(event) => setBalance(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Portfolio value (ZAR)
                <input
                  type="text"
                  readOnly
                  aria-readonly="true"
                  value={formatRand(calculatedPortfolioValue)}
                  className="h-11 w-full rounded-lg border border-input bg-muted px-3 font-normal"
                />
                <span className="block text-xs font-normal text-muted-foreground">
                  Automatically calculated from available cash and total invested.
                </span>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Total invested (ZAR)
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={totalInvested}
                  onChange={(event) => setTotalInvested(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                />
              </label>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-4 font-extrabold">Portfolio holdings table</legend>
              {holdings.map((holding, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4"
                >
                  <label className="space-y-2 text-sm font-semibold">
                    Fund name
                    <input
                      value={holding.fundName}
                      onChange={(event) => updateHolding(index, "fundName", event.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Ticker
                    <input
                      value={holding.ticker}
                      onChange={(event) => updateHolding(index, "ticker", event.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Market value (ZAR)
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={holding.marketValue}
                      onChange={(event) => updateHolding(index, "marketValue", event.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Change (%)
                    <input
                      value={holding.changePct}
                      onChange={(event) => updateHolding(index, "changePct", event.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setHoldings((current) => [...current, { ...emptyHolding }])}
                className="rounded-lg border border-input px-4 py-2 text-sm font-bold hover:bg-muted"
              >
                Add holding
              </button>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-4 font-extrabold">Finance transactions and activity_log</legend>
              {transactions.map((transaction, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-5"
                >
                  <label className="space-y-2 text-sm font-semibold">
                    Date
                    <input
                      type="date"
                      value={transaction.date}
                      onChange={(event) => updateTransaction(index, "date", event.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Type
                    <select
                      value={transaction.type}
                      onChange={(event) => updateTransaction(index, "type", event.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    >
                      <option>Deposit</option>
                      <option>Withdrawal</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Method
                    <input
                      value={transaction.method}
                      onChange={(event) => updateTransaction(index, "method", event.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Status
                    <select
                      value={transaction.status}
                      onChange={(event) => updateTransaction(index, "status", event.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    >
                      <option>Completed</option>
                      <option>Rejected</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Amount (ZAR)
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={transaction.amount}
                      onChange={(event) => updateTransaction(index, "amount", event.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTransactions((current) => [...current, { ...emptyTransaction }])}
                className="rounded-lg border border-input px-4 py-2 text-sm font-bold hover:bg-muted"
              >
                Add transaction
              </button>
            </fieldset>

            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90"
            >
              {editingAccountId ? (
                <Pencil className="size-4" aria-hidden="true" />
              ) : (
                <UserPlus className="size-4" aria-hidden="true" />
              )}
              {editingAccountId ? "Update user" : "Save User"}
            </button>
            {editingAccountId && (
              <button
                type="button"
                onClick={resetAccountForm}
                className="ml-3 inline-flex h-11 items-center gap-2 rounded-lg border border-input px-5 font-bold hover:bg-muted"
              >
                <X className="size-4" aria-hidden="true" />
                Cancel edit
              </button>
            )}
          </form>

          {notice && (
            <p
              role="status"
              className="mt-5 rounded-lg border border-border bg-muted/30 p-4 text-sm"
            >
              {notice}
            </p>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Registered users ({accounts.length})</h2>
            <button
              type="button"
              onClick={() => void handleRefreshAccounts()}
              disabled={isRefreshingAccounts}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm font-bold hover:bg-muted disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={`size-4${isRefreshingAccounts ? " animate-spin" : ""}`}
                aria-hidden="true"
              />
              {isRefreshingAccounts ? "Refreshing…" : "Refresh users"}
            </button>
          </div>
          {accounts.length > 0 ? (
            <ul className="mt-4 divide-y divide-border">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <span className="font-bold">{account.fullName}</span>
                    <span className="ml-2 rounded-full bg-muted px-2 py-1 text-xs font-semibold">
                      {account.status}
                    </span>
                    {account.company && (
                      <span className="ml-2 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {account.company}
                      </span>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {account.email}
                      {account.phone ? ` · ${account.phone}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Registered {account.registeredDate}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(account)}
                      className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-bold hover:bg-muted"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(account)}
                      className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/5"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No user registrations have been saved yet.
            </p>
          )}
        </section>

        <p className="mt-5 text-sm text-muted-foreground">
          User records are read from and written to the configured Neon database.
        </p>
      </div>
    </main>
  );
}

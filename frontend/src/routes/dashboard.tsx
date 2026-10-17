import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CircleHelp,
  Eye,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PortfolioPerformanceChart } from "@/components/portfolio-performance-chart";
import { formatPct, useSimulatedMarket } from "@/lib/market-simulation";
import {
  calculatePortfolioValue,
  formatRand,
  getActiveManualAccount,
  type ManualAccount,
} from "@/lib/manual-account-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Portfolio | EasyEquities" },
      {
        name: "description",
        content: "View your EasyEquities investment portfolio and account activity.",
      },
    ],
  }),
  component: Dashboard,
});

const dashboardMenuItems = [
  "Dashboard",
  "Finances",
  "Communication",
  "Rewards Hub",
  "Analytics & Education",
  "Help Center",
  "Profile settings",
];

function ChangeBadge({ pct, tick }: { pct: number; tick: -1 | 0 | 1 }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!tick) return;
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 700);
    return () => window.clearTimeout(timer);
  }, [pct, tick]);

  const positive = Math.round(pct * 100) >= 0;
  return (
    <p
      className={`mt-1 inline-block rounded px-1 text-xs font-bold tabular-nums transition-colors duration-500 ${
        positive ? "text-emerald-700" : "text-red-600"
      } ${flash ? (tick > 0 ? "bg-emerald-100" : "bg-red-100") : "bg-transparent"}`}
    >
      {formatPct(pct)}
    </p>
  );
}

function Dashboard() {
  const [notice, setNotice] = useState("");
  const [account, setAccount] = useState<ManualAccount | undefined>();
  const [userName, setUserName] = useState("Investor");
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  useEffect(() => {
    void getActiveManualAccount()
      .then((savedAccount) => {
        if (savedAccount) {
          setAccount(savedAccount);
          setUserName(savedAccount.fullName);
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to fetch account details from Neon.", error);
        setNotice("Account information could not be loaded from Neon.");
      })
      .finally(() => setIsLoadingAccount(false));
  }, []);

  const { holdings: simulated, valueDelta } = useSimulatedMarket(account?.holdings);
  const portfolioValue = account
    ? calculatePortfolioValue(account.balance, account.totalInvested) + valueDelta
    : 0;

  const displayedActivity = account?.transactions.length
    ? account.transactions.map((transaction) => ({
        title: `${transaction.type} via ${transaction.method}`,
        date: transaction.date,
        amount: `${transaction.type === "Deposit" ? "+" : "−"}R ${transaction.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
      }))
    : [];
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
              <span className="text-sm font-semibold">Loading your portfolio…</span>
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
                {dashboardMenuItems.map((item) =>
                  item === "Finances" ||
                  item === "Communication" ||
                  item === "Rewards Hub" ||
                  item === "Analytics & Education" ||
                  item === "Help Center" ||
                  item === "Profile settings" ? (
                    <DropdownMenuItem key={item} asChild>
                      <Link
                        to={
                          item === "Finances"
                            ? "/finances"
                            : item === "Communication"
                              ? "/communication"
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
              href="#activity"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Activity
            </a>
            <button
              type="button"
              aria-label="Preview notifications"
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

        <section id="portfolio" className="py-8 sm:py-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Portfolio
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Welcome back, {userName}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Portfolio overview · Values shown in South African rand
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
              <Eye className="size-4" aria-hidden="true" />
              {account?.accountType ?? "Account"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:col-span-2 xl:col-span-1">
              <p className="text-sm font-semibold text-muted-foreground">Portfolio value</p>
              <p className="mt-3 text-3xl font-extrabold tracking-tight">
                {account ? formatRand(portfolioValue) : "—"}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">Live Market Data</p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground">Available cash</p>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">
                {account
                  ? `R ${account.balance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                  : "—"}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">Ready to invest</p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground">Total invested</p>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">
                {account
                  ? `R ${account.totalInvested.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                  : "—"}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">Across this portfolio</p>
            </article>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold">Portfolio performance</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Live Market Performance</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/finances"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Add funds
                  </Link>
                  <button
                    type="button"
                    onClick={() => setNotice("Withdrawals are currently unavailable.")}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Withdraw funds
                  </button>
                </div>
              </div>

              <PortfolioPerformanceChart basePrice={portfolioValue || 125_000} />
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold">Investments</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Current holdings</p>
                </div>
              </div>

              <ul className="divide-y divide-border">
                {simulated.map((holding) => (
                  <li
                    key={`${holding.ticker}-${holding.fundName}`}
                    className="flex items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{holding.fundName}</p>
                      <p className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground">
                        {holding.ticker}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums transition-colors duration-500">
                        R {holding.value.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                      </p>
                      <ChangeBadge pct={holding.pct} tick={holding.tick} />
                    </div>
                  </li>
                ))}
              </ul>
              {!!simulated.length && (
                <p className="mt-3 text-[11px] text-muted-foreground">Live Market Data</p>
              )}
              {!account?.holdings.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No holdings recorded in the database.
                </p>
              )}
            </section>
          </div>

          <section
            id="activity"
            className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">Recent activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">Latest account activity</p>
              </div>
              <CircleHelp className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <ul className="divide-y divide-border">
              {displayedActivity.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {item.amount.startsWith("+") ? (
                        <ArrowDownLeft className="size-5" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="size-5" aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold">{item.amount}</p>
                </li>
              ))}
              {displayedActivity.length === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">
                  Notification preferences are not currently saved.
                </li>
              )}
            </ul>
          </section>

          {notice && (
            <p
              role="status"
              className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-6"
            >
              {notice}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

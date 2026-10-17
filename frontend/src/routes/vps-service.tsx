import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  Bell,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LogOut,
  Server,
  Wallet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/vps-service")({
  head: () => ({
    meta: [
      { title: "VPS Service | Rewards Hub | EasyEquities" },
      {
        name: "description",
        content: "View VPS service features, eligibility requirements, and service details.",
      },
    ],
  }),
  component: VpsService,
});

const menuItems = [
  "Dashboard",
  "Finances",
  "Rewards Hub",
  "Analytics & Education",
  "Help Center",
  "Profile settings",
];

function VpsService() {
  return (
    <main className="min-h-screen bg-background text-foreground">
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
            <Link
              to="/finances"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Activity
            </Link>
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
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <Link to="/rewards-hub" className="font-semibold hover:text-foreground">
                  Rewards Hub
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-4" />
              </li>
              <li aria-current="page" className="font-semibold text-foreground">
                VPS Service
              </li>
            </ol>
          </nav>

          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Special service
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">VPS Service</h1>
              <p className="mt-2 text-base text-muted-foreground">
                Make your trading fast, stable, and secure
              </p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Supported platforms">
              <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold">
                MT4
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold">
                MT5
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Server className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-extrabold">Service details</h2>
                    <p className="text-sm text-muted-foreground">
                      VPS hosting for supported trading platforms
                    </p>
                  </div>
                </div>
                <p className="leading-7 text-muted-foreground">
                  A virtual private server can keep your trading platform running through local
                  power or internet interruptions. Connect remotely to an operating system with
                  MetaTrader and a starter set of indicators and expert advisors already installed.
                </p>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-extrabold">Free service eligibility</h2>
                <p className="mt-2 leading-7 text-muted-foreground">
                  To qualify, deposit at least $450 and trade a minimum of 3 lots during the first
                  month. Continue trading 3 or more lots each month to keep the service free.
                </p>
                <ol className="mt-5 space-y-4">
                  {[
                    "Deposit $450 or more and trade at least 3 lots in your first month.",
                    "Submit a VPS setup request.",
                    "Activate your VPS once setup is complete.",
                    "Maintain monthly trading volume of at least 3 lots.",
                  ].map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 leading-6 text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-extrabold">If monthly volume is below 3 lots</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  When the monthly volume requirement is missed, a $33 service fee may be charged to
                  the trading account assigned to VPS. If its balance is insufficient, the fee may
                  be collected from another available trading account.
                </p>
                <p className="mt-3 leading-7 text-muted-foreground">
                  If no account has enough funds, VPS access may be stopped. To qualify again after
                  that, make a new deposit of at least $450.
                </p>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-extrabold">Volume calculation notes</h2>
                <p className="mt-2 leading-7 text-muted-foreground">
                  Lot volumes for some instruments are converted before they count toward the
                  monthly requirement:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-5 leading-6 text-muted-foreground">
                  <li>1 lot on a Cent account counts as 0.01 standard lots.</li>
                  <li>
                    Stock lots are calculated as lot volume × contract size × price ÷ 100,000.
                  </li>
                  <li>
                    JP225 index lots are calculated as lot volume × contract size × price ÷
                    10,000,000.
                  </li>
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-extrabold">Cancel the service</h2>
                <p className="mt-2 leading-7 text-muted-foreground">
                  You may cancel VPS from its settings in your account at any time. Cancelling
                  doesn’t recalculate a fee already charged for the remaining part of that month.
                </p>
              </section>
            </div>

            <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock3 className="size-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-extrabold">Bonus statistics</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A one-time deposit of $450 or more is required to qualify for VPS.
              </p>
              <Link
                to="/finances"
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-extrabold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowDownToLine className="size-4" aria-hidden="true" />
                Deposit now
              </Link>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

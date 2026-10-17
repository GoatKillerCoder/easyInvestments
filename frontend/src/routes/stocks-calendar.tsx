import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/stocks-calendar")({
  head: () => ({
    meta: [
      { title: "Stocks Calendar | Analytics & Education | EasyEquities" },
      {
        name: "description",
        content: "Browse scheduled stock dividend dates and amounts.",
      },
    ],
  }),
  component: StocksCalendar,
});

type Dividend = readonly [symbol: string, instrument: string, amount: string];
type DividendDate = readonly [date: string, dividends: readonly Dividend[]];

const dividendSchedule: readonly DividendDate[] = [
  [
    "2026-10-06",
    [
      ["A", "A", "$0.26"],
      ["DG", "DG.US", "$0.59"],
      ["AU200", "AU200", "$0.35"],
      ["US500", "US500", "$1.12"],
      ["US30", "US30", "$9.81"],
      ["JPM", "JPM", "$1.65"],
    ],
  ],
  [
    "2026-10-07",
    [
      ["US100", "US100", "$1.49"],
      ["LEN", "LEN", "$0.50"],
      ["US500", "US500", "$0.19"],
      ["CMCSA", "CMCSA", "$0.33"],
    ],
  ],
  [
    "2026-10-08",
    [
      ["US100", "US100", "$0.48"],
      ["TW", "TW", "$1.20"],
      ["INTU", "INTU", "$1.38"],
      ["UK100", "UK100", "$0.32"],
      ["AU200", "AU200", "$0.09"],
      ["WPP", "WPP", "$7.50"],
      ["EU50", "EU50", "$2.74"],
      ["US500", "US500", "$0.04"],
      ["HK50", "HK50", "$10.12"],
    ],
  ],
  [
    "2026-10-09",
    [
      ["MA", "MASTERCARD", "$0.87"],
      ["T", "ATT", "$0.28"],
      ["NTAP", "NTAP", "$0.52"],
      ["US100", "US100", "$0.28"],
      ["AXP", "AXP", "$0.95"],
      ["ORCL", "ORACLE", "$0.50"],
      ["GD", "GD", "$1.59"],
      ["HK50", "HK50", "$21.71"],
      ["VZ", "VZ", "$0.71"],
      ["US500", "US500", "$0.98"],
    ],
  ],
  [
    "2026-10-13",
    [
      ["ACN", "ACN", "$1.71"],
      ["GIS", "GIS", "$0.61"],
    ],
  ],
  [
    "2026-10-14",
    [
      ["FMX", "FMX", "$1.78"],
      ["MU", "MU", "$0.15"],
      ["PNC", "PNC", "$2.00"],
    ],
  ],
  [
    "2026-10-15",
    [
      ["DGE", "DGE", "$22.69"],
      ["ITV", "ITV", "$1.70"],
      ["FCX", "FCX", "$0.15"],
      ["DAL", "DAL", "$0.22"],
      ["AFG", "AFG", "$0.97"],
      ["ABT", "ABT", "$0.63"],
      ["ABBV", "ABBV", "$1.73"],
    ],
  ],
  ["2026-10-16", [["EOG", "EOG", "$1.02"]]],
  [
    "2026-10-20",
    [
      ["DELL", "DELL", "$0.63"],
      ["CL", "CL", "$0.53"],
    ],
  ],
  ["2026-10-21", [["LOW", "LOW", "$1.25"]]],
  [
    "2026-10-22",
    [
      ["APA", "APA", "$0.25"],
      ["CVS", "CVS", "$0.67"],
    ],
  ],
  ["2026-10-23", [["SIG", "SIG", "$0.35"]]],
  ["2026-10-28", [["CLX", "CLX", "$1.25"]]],
  [
    "2026-10-30",
    [
      ["TXN", "TXN", "$1.52"],
      ["HUM", "HUM", "$0.89"],
    ],
  ],
  ["2026-11-10", [["TGT", "TGT", "$1.16"]]],
  ["2026-11-12", [["TJX", "TJX", "$0.48"]]],
  [
    "2026-11-13",
    [
      ["DUK", "DUK", "$1.09"],
      ["HON", "HON", "$0.70"],
    ],
  ],
  ["2026-11-16", [["KR", "KR", "$0.39"]]],
  [
    "2026-11-19",
    [
      ["MSFT", "MICROSOFT", "$0.98"],
      ["AMAT", "AMAT", "$0.53"],
    ],
  ],
  [
    "2026-11-25",
    [
      ["TMUS", "TMUS", "$1.17"],
      ["SPGI", "SPGI", "$0.97"],
    ],
  ],
  [
    "2026-12-01",
    [
      ["TSN", "TSN", "$0.51"],
      ["MCA", "MC", "$5.50"],
      ["MCD", "MCDONALDS", "$1.93"],
    ],
  ],
  ["2026-12-10", [["TSM", "TSM", "$1.09"]]],
  ["2026-12-11", [["WMT", "WALMART", "$0.25"]]],
  ["2026-12-16", [["ICE", "ICE", "$0.52"]]],
  ["2026-12-24", [["BATS", "BATS", "$61.26"]]],
  ["2026-12-31", [["TTE", "TTE", "$1.01"]]],
];

const menuItems = [
  "Dashboard",
  "Finances",
  "Rewards Hub",
  "Analytics & Education",
  "Help Center",
  "Profile settings",
];

function formatDividendDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function StocksCalendar() {
  const [startDate, setStartDate] = useState("2026-10-06");
  const visibleDates = dividendSchedule.filter(([date]) => date >= startDate);
  const dividendCount = visibleDates.reduce((count, [, dividends]) => count + dividends.length, 0);

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
          <div className="mb-7">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Markets
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Analytics &amp; Education
            </h1>
          </div>

          <nav aria-label="Analytics and education" className="mb-6 flex flex-wrap gap-2">
            <Link
              to="/analytics-education"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted"
            >
              <BookOpen className="size-4" aria-hidden="true" />
              Education
            </Link>
            <Link
              to="/events-calendar"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              Events calendar
            </Link>
            <Link
              to="/stocks-calendar"
              aria-current="page"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <ChartNoAxesCombined className="size-4" aria-hidden="true" />
              Stocks calendar
            </Link>
          </nav>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
              <div>
                <h2 className="text-xl font-extrabold">Dividend calendar</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scheduled dividend dates · {visibleDates.length} dates · {dividendCount} listings
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="stocks-calendar-date" className="text-sm font-semibold">
                  From date
                </label>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3">
                  <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="stocks-calendar-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-36 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              {visibleDates.map(([date, dividends]) => (
                <section
                  key={date}
                  aria-labelledby={`dividend-date-${date}`}
                  className="overflow-hidden rounded-xl border border-border"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 px-4 py-3">
                    <h3 id={`dividend-date-${date}`} className="font-extrabold">
                      {formatDividendDate(date)}
                    </h3>
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
                      Dividends
                    </span>
                  </div>
                  <ul className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
                    {dividends.map(([symbol, instrument, amount], index) => (
                      <li
                        key={`${symbol}-${index}`}
                        className="flex min-w-0 items-center gap-3 bg-card px-4 py-3"
                      >
                        <img
                          src={`https://fbs.com/i/instruments/${symbol}.svg`}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="size-9 shrink-0 rounded-full border border-border bg-background object-contain p-1"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-bold">
                          {instrument}
                        </span>
                        <span className="shrink-0 font-mono text-sm font-extrabold tabular-nums">
                          {amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {visibleDates.length === 0 && (
                <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No dividend dates are listed from this date onward.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

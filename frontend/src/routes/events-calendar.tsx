import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Radio,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/events-calendar")({
  head: () => ({
    meta: [
      { title: "Events Calendar | Analytics & Education | EasyEquities" },
      {
        name: "description",
        content: "View the economic events calendar and reported market data.",
      },
    ],
  }),
  component: EventsCalendar,
});

type CalendarEvent = readonly [
  time: string,
  country: string,
  event: string,
  actual: string,
  forecast: string,
  previous: string,
];

const events: CalendarEvent[] = [
  ["02:30", "AUS", "ANZ Job Advertisements", "2.2%", "—", "2.6%"],
  ["05:35", "JPN", "10-y Bond Auction", "3.1%", "—", "2.99%"],
  ["08:00", "DEU", "Factory Orders n.s.a. (YoY)", "2.7%", "—", "14%"],
  ["08:00", "DEU", "Factory Orders s.a. (MoM)", "-10.6%", "-1%", "3.2%"],
  ["08:35", "JPN", "BoJ Governor Ueda speech", "—", "—", "—"],
  ["08:45", "FRA", "Industrial Output (MoM)", "-0.3%", "0.3%", "-0.6%"],
  ["08:45", "FRA", "Budget Balance", "-159.6€", "—", "-145.91€"],
  ["09:00", "ESP", "Industrial Output Cal Adjusted (YoY)", "1.5%", "—", "2.5%"],
  ["09:00", "EMU", "ECB's Lane speech", "—", "—", "—"],
  ["10:00", "CHE", "Unemployment Rate s.a (MoM)", "3.1%", "—", "3.1%"],
  ["10:30", "GBR", "S&P Global Construction PMI", "46.1", "45.4", "44.3"],
  ["10:40", "ESP", "12-Month Letras Auction", "2.999%", "—", "2.832%"],
  ["10:40", "ESP", "6-Month Letras Auction", "2.769%", "—", "2.623%"],
  ["10:40", "GBR", "BoE's Mann speech", "—", "—", "—"],
  ["11:00", "EMU", "Retail Sales (YoY)", "0.8%", "1%", "0.4%"],
  ["11:00", "EMU", "Retail Sales (MoM)", "0.1%", "0.2%", "-0.6%"],
  ["14:15", "USA", "ADP Employment Change 4-week average", "23.75", "—", "22.5"],
  ["14:30", "USA", "Goods and Services Trade Balance", "-105.6$", "-102$", "-92.8$"],
  ["14:30", "USA", "Goods Trade Balance", "-132.07$", "—", "-132.6$"],
  ["14:30", "CAN", "International Merchandise Trade", "4.2$", "1.7$", "0.79$"],
  ["14:30", "CAN", "Imports", "73.71$", "—", "75.24$"],
  ["14:30", "CAN", "Exports", "77.91$", "—", "76.03$"],
  ["14:55", "USA", "Redbook Index (YoY)", "8.6%", "—", "8.2%"],
  ["15:00", "EMU", "ECB's Elderson speech", "—", "—", "—"],
  ["15:00", "EMU", "ECB's Cipollone speech", "—", "—", "—"],
  ["15:05", "USA", "Fed's Williams speech", "—", "—", "—"],
  ["16:00", "USA", "RealClearMarkets/TIPP Economic Optimism (MoM)", "46.8", "44.5", "45.6"],
  ["16:00", "CAN", "Ivey Purchasing Managers Index s.a", "58.2", "65.4", "64.3"],
  ["16:00", "CAN", "Ivey Purchasing Managers Index", "61.9", "—", "62.7"],
  ["16:45", "USA", "Fed's Bowman speech", "—", "—", "—"],
  ["17:00", "NZL", "GDT Price Index", "—", "—", "-1.1%"],
  ["18:00", "CHN", "National Day", "—", "—", "—"],
  ["19:00", "USA", "3-Year Note Auction", "—", "—", "4.474%"],
  ["22:30", "USA", "API Weekly Crude Oil Stock", "—", "—", "1.019"],
  ["00:30", "AUS", "Westpac Consumer Confidence (MoM)", "1.8%", "—", "-0.7%"],
  ["01:00", "NZL", "Electronic Card Retail Sales (MoM)", "0.6%", "0.4%", "-0.2%"],
  ["03:00", "CHN", "Caixin Services PMI", "51.8", "51.4", "51.6"],
  ["06:00", "JPN", "Household Spending (YoY)", "-1.2%", "-0.8%", "0.5%"],
  ["07:00", "DEU", "Industrial Production (MoM)", "0.4%", "0.2%", "-0.1%"],
  ["07:00", "GBR", "Halifax House Price Index (MoM)", "0.3%", "0.2%", "0.1%"],
  ["08:00", "CHE", "Foreign Currency Reserves", "724.6B", "—", "721.3B"],
  ["09:30", "ZAF", "Gross Domestic Product (QoQ)", "0.6%", "0.5%", "0.4%"],
  ["10:00", "ITA", "Retail Sales (MoM)", "0.2%", "0.1%", "-0.3%"],
  ["12:00", "USA", "MBA Mortgage Applications", "-1.4%", "—", "2.1%"],
  ["13:00", "USA", "NFIB Small Business Optimism", "98.7", "98.2", "97.9"],
  ["14:30", "USA", "Core Consumer Price Index (MoM)", "0.3%", "0.2%", "0.3%"],
  ["14:30", "USA", "Initial Jobless Claims", "221K", "225K", "228K"],
  ["15:45", "USA", "S&P Global Services PMI", "52.8", "52.5", "52.3"],
  ["16:00", "USA", "JOLTS Job Openings", "7.62M", "7.70M", "7.71M"],
  ["17:30", "USA", "EIA Crude Oil Inventories", "-1.2M", "—", "3.5M"],
  ["20:00", "USA", "Federal Reserve Beige Book", "—", "—", "—"],
  ["00:01", "GBR", "BRC Retail Sales Monitor (YoY)", "1.2%", "1.0%", "0.8%"],
  ["01:30", "AUS", "Building Permits (MoM)", "2.4%", "1.8%", "-0.9%"],
  ["04:00", "JPN", "Leading Economic Index", "107.2", "106.8", "106.1"],
  ["06:00", "JPN", "Coincident Index", "116.4", "—", "115.9"],
  ["07:00", "DEU", "Trade Balance", "18.6B€", "17.9B€", "17.2B€"],
  ["07:45", "FRA", "Trade Balance", "-7.4B€", "—", "-7.1B€"],
  ["08:00", "NOR", "Consumer Price Index (YoY)", "3.1%", "3.0%", "3.2%"],
  ["09:00", "ZAF", "Manufacturing Production (YoY)", "1.7%", "1.2%", "0.8%"],
  ["09:30", "GBR", "S&P Global Services PMI", "52.7", "52.5", "51.8"],
  ["10:00", "EMU", "ZEW Economic Sentiment", "18.4", "16.0", "14.2"],
  ["11:00", "ITA", "Producer Price Index (MoM)", "0.2%", "—", "-0.4%"],
  ["12:30", "USA", "Challenger Job Cuts (YoY)", "-8.1%", "—", "5.4%"],
  ["14:30", "USA", "Continuing Jobless Claims", "1.87M", "1.89M", "1.91M"],
  ["15:00", "CAN", "Ivey Employment Index", "54.1", "—", "52.8"],
  ["16:30", "USA", "EIA Natural Gas Storage Change", "72B", "65B", "80B"],
  ["21:00", "USA", "Consumer Credit Change", "12.4B$", "10.0B$", "7.8B$"],
];

const menuItems = [
  "Dashboard",
  "Finances",
  "Rewards Hub",
  "Analytics & Education",
  "Help Center",
  "Profile settings",
];

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDailyValue(value: string, daySeed: string, eventIndex: number, columnIndex: number) {
  const match = /^(-?)(\d+(?:\.\d+)?)(.*)$/.exec(value);
  if (!match || !daySeed) return value;

  const [, sign, numericValue, suffix] = match;
  const decimals = numericValue.includes(".")
    ? numericValue.length - numericValue.indexOf(".") - 1
    : 0;
  const seed = `${daySeed}:${eventIndex}:${columnIndex}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  }

  const dailyChange = (((hash >>> 0) / 0xffffffff) * 2 - 1) * 0.08;
  const adjustedValue = Number(numericValue) * (1 + dailyChange);
  return `${sign}${Math.abs(adjustedValue).toFixed(decimals)}${suffix}`;
}

function getLiveMarketValue(
  value: string,
  daySeed: string,
  eventIndex: number,
  columnIndex: number,
  tick: number,
) {
  const baseValue = getDailyValue(value, daySeed, eventIndex, columnIndex);
  const match = /^(-?)(\d+(?:\.\d+)?)(.*)$/.exec(baseValue);
  if (!match || tick === 0) return baseValue;

  const [, sign, numericValue, suffix] = match;
  const decimals = numericValue.includes(".")
    ? numericValue.length - numericValue.indexOf(".") - 1
    : 0;
  const seed = `${daySeed}:${eventIndex}:${columnIndex}:${tick}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  }

  const movement = (((hash >>> 0) / 0xffffffff) * 2 - 1) * 0.004;
  const adjustedValue = Number(`${sign}${numericValue}`) * (1 + movement);
  return `${adjustedValue.toFixed(decimals)}${suffix}`;
}

function getComparableValue(value: string) {
  const match = /^(-?)(\d+(?:\.\d+)?)/.exec(value);
  if (!match) return null;
  return Number(`${match[1]}${match[2]}`);
}

function EventsCalendar() {
  const [selectedDate, setSelectedDate] = useState(getLocalDateInputValue);
  const [marketTick, setMarketTick] = useState(0);
  const visibleEvents = events;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMarketTick((tick) => tick + 1);
    }, 1800);
    return () => window.clearInterval(interval);
  }, []);

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
              aria-current="page"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              Events calendar
            </Link>
            <Link
              to="/stocks-calendar"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted"
            >
              <ChartNoAxesCombined className="size-4" aria-hidden="true" />
              Stocks calendar
            </Link>
          </nav>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
              <div>
                <h2 className="text-xl font-extrabold">Events calendar</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  <Radio className="size-3.5 animate-pulse" aria-hidden="true" />
                  LIVE MARKET SIMULATION
                </span>
                <label htmlFor="calendar-date" className="text-sm font-semibold">
                  Custom dates
                </label>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3">
                  <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="calendar-date"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="w-36 bg-transparent text-sm outline-none"
                  />
                  <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Impact
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Time
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Country
                    </th>
                    <th scope="col" className="min-w-[280px] px-4 py-3 font-bold">
                      Event
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-bold">
                      Actual
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-bold">
                      Forecast
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-bold">
                      Previous
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleEvents.map(
                    ([time, country, event, baseActual, baseForecast, basePrevious], index) => {
                      const baseValues = [baseActual, baseForecast, basePrevious];
                      const currentValues = baseValues.map((value, columnIndex) =>
                        getLiveMarketValue(value, selectedDate, index, columnIndex, marketTick),
                      );
                      const previousValues = baseValues.map((value, columnIndex) =>
                        getLiveMarketValue(value, selectedDate, index, columnIndex, marketTick - 1),
                      );

                      return (
                        <tr
                          key={`${time}-${country}-${event}-${index}`}
                          className="hover:bg-muted/30"
                        >
                          <td className="px-4 py-3">
                            <span
                              className="inline-block size-2.5 rounded-full bg-amber-400"
                              aria-label="Impact not specified"
                              title="Impact not specified"
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">
                            {time}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-bold">
                              {country}
                            </span>
                          </td>
                          <th scope="row" className="px-4 py-3 font-semibold">
                            {event}
                          </th>
                          {currentValues.map((value, columnIndex) => {
                            const currentNumber = getComparableValue(value);
                            const previousNumber = getComparableValue(previousValues[columnIndex]);
                            const movingUp =
                              currentNumber !== null &&
                              previousNumber !== null &&
                              currentNumber > previousNumber;
                            const movingDown =
                              currentNumber !== null &&
                              previousNumber !== null &&
                              currentNumber < previousNumber;

                            return (
                              <td
                                key={columnIndex}
                                className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                                  movingUp
                                    ? "text-emerald-700"
                                    : movingDown
                                      ? "text-red-700"
                                      : columnIndex === 0
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                }`}
                              >
                                {movingUp && <span aria-hidden="true">▲ </span>}
                                {movingDown && <span aria-hidden="true">▼ </span>}
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    },
                  )}
                  {visibleEvents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No events are listed for this date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

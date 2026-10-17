import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, LayoutDashboard, LogOut, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/rewards-hub")({
  head: () => ({
    meta: [
      { title: "Rewards Hub | EasyEquities" },
      { name: "description", content: "Explore special services in the EasyEquities Rewards Hub." },
    ],
  }),
  component: RewardsHub,
});

const menuItems = [
  "Dashboard",
  "Finances",
  "Rewards Hub",
  "Analytics & Education",
  "Help Center",
  "Profile settings",
];

function RewardsHub() {
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
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Rewards Hub</h1>

          <section className="mt-10" aria-labelledby="special-services-heading">
            <h2 id="special-services-heading" className="mb-5 text-2xl font-bold tracking-tight">
              Special services
            </h2>
            <Link
              to="/vps-service"
              aria-label="View VPS Service details"
              className="group block max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <article>
                <div className="bg-slate-950">
                  <svg
                    viewBox="0 0 720 340"
                    role="img"
                    aria-label="Illustration of a secure server room with a trading workstation"
                    className="block aspect-[720/340] w-full"
                    preserveAspectRatio="xMidYMid slice"
                  >
                    <defs>
                      <linearGradient id="server-room-bg" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#111c23" />
                        <stop offset="55%" stopColor="#29383b" />
                        <stop offset="100%" stopColor="#10171d" />
                      </linearGradient>
                      <linearGradient id="server-floor" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#566263" />
                        <stop offset="100%" stopColor="#1d292b" />
                      </linearGradient>
                      <linearGradient id="monitor-glow" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ecfdf5" />
                        <stop offset="100%" stopColor="#a7f3d0" />
                      </linearGradient>
                    </defs>
                    <rect width="720" height="340" fill="url(#server-room-bg)" />
                    <path d="M0 238 265 189h190l265 49v102H0Z" fill="url(#server-floor)" />
                    <path
                      d="m265 189-68 151M455 189l68 151M360 190v150"
                      stroke="#d4e1d9"
                      strokeOpacity=".16"
                    />
                    <path
                      d="m0 280 279-55m441 55-279-55M0 315l320-65m400 65-320-65"
                      stroke="#d4e1d9"
                      strokeOpacity=".12"
                    />

                    {[24, 110, 196, 506, 592, 678].map((x) => (
                      <g key={x} transform={`translate(${x} 34)`}>
                        <rect
                          width="48"
                          height="210"
                          rx="4"
                          fill="#0b1114"
                          stroke="#536064"
                          strokeWidth="3"
                        />
                        <rect x="6" y="8" width="36" height="194" rx="2" fill="#172328" />
                        {[20, 64, 108, 152].map((y) => (
                          <g key={y}>
                            <rect x="10" y={y} width="28" height="32" rx="2" fill="#26363a" />
                            <path
                              d={`M15 ${y + 8}h18M15 ${y + 14}h18M15 ${y + 20}h18`}
                              stroke="#53686a"
                              strokeWidth="2"
                            />
                            <circle cx="15" cy={y + 27} r="2.5" fill="#72d184" />
                            <circle cx="24" cy={y + 27} r="2.5" fill="#86efac" fillOpacity=".65" />
                          </g>
                        ))}
                        <path
                          d="M2 40h3m-3 44h3m-3 44h3m-3 44h3"
                          stroke="#a3f27b"
                          strokeWidth="3"
                        />
                      </g>
                    ))}

                    <path
                      d="M285 101h150v104H285z"
                      fill="#101719"
                      stroke="#bac6c5"
                      strokeWidth="5"
                    />
                    <rect
                      x="296"
                      y="112"
                      width="128"
                      height="82"
                      rx="2"
                      fill="url(#monitor-glow)"
                    />
                    <path d="M349 205h22v21h-22z" fill="#aab8b7" />
                    <path d="M329 226h62v8h-62z" fill="#d0d9d8" />
                    <circle cx="360" cy="143" r="17" fill="#087d55" />
                    <path
                      d="m351 145 7 7 13-17"
                      fill="none"
                      stroke="#ecfdf5"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <text
                      x="360"
                      y="178"
                      fill="#16382c"
                      fontSize="15"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      VPS SERVICE
                    </text>
                    <path d="M435 153h53" stroke="#bbf7d0" strokeWidth="2" strokeDasharray="5 7" />
                    <circle cx="492" cy="153" r="5" fill="#86efac" />
                  </svg>
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="text-lg font-extrabold">VPS Service</h3>
                  <p className="mt-1 text-base leading-6 text-muted-foreground">
                    Make your trading fast, stable, and secure
                  </p>
                </div>
              </article>
            </Link>
          </section>
        </section>
      </div>
    </main>
  );
}

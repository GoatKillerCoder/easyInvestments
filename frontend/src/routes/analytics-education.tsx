import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Wallet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/analytics-education")({
  head: () => ({
    meta: [
      { title: "Analytics & Education | EasyEquities" },
      {
        name: "description",
        content: "Explore trading education courses and market calendar resources.",
      },
    ],
  }),
  component: AnalyticsEducation,
});

const menuItems = [
  "Dashboard",
  "Finances",
  "Rewards Hub",
  "Analytics & Education",
  "Help Center",
  "Profile settings",
];

const resources = [
  {
    label: "Education",
    description: "Trading courses and learning resources",
    href: "https://fbs.com/cabinet/content/education",
    icon: BookOpen,
  },
  {
    label: "Events calendar",
    description: "Upcoming market events",
    to: "/events-calendar",
    icon: CalendarDays,
  },
  {
    label: "Stocks calendar",
    description: "Key dates for stocks",
    to: "/stocks-calendar",
    icon: ChartNoAxesCombined,
  },
];

const learningLevels = [
  {
    level: "Beginner",
    href: "https://youtu.be/mEyuQVy3OHc?si=uVubVuT7wv4KGwZS",
    description:
      "Learn what online trading is, how it works, and the essential steps to get started.",
    courses: ["Introduction to online trading", "Cryptocurrency basics for traders"],
  },
  {
    level: "Intermediate",
    href: "https://youtu.be/lEk4cSA7cqc?list=PLqJjKuP8g79xgdI8SvWfe7LndcqKE_yUC",
    description:
      "Build market-analysis skills and learn to apply fundamental and technical analysis.",
    courses: ["Mastering Japanese candlesticks"],
  },
  {
    level: "Advanced",
    href: "https://youtu.be/PA4IrngJa54?si=GsBqr0js3aghNRKJ",
    description:
      "Explore advanced market-analysis tools and develop systematic trading strategies.",
    courses: ["Algo trading with MQL5"],
  },
];

function AnalyticsEducation() {
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
          <div className="mb-8">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Learn and explore
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Analytics &amp; Education
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
              Build your trading knowledge, follow important market dates, and explore learning
              materials for every stage of your journey.
            </p>
          </div>

          <nav aria-label="Learning resources" className="mb-10 grid gap-3 sm:grid-cols-3">
            {resources.map(({ label, description, href, to, icon: Icon }) => {
              const cardContent = (
                <>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                  </span>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary"
                    aria-hidden="true"
                  />
                </>
              );
              const className =
                "group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

              return to ? (
                <Link key={label} to={to} className={className}>
                  {cardContent}
                </Link>
              ) : (
                <a key={label} href={href} target="_blank" rel="noreferrer" className={className}>
                  {cardContent}
                </a>
              );
            })}
          </nav>

          <section aria-labelledby="learning-path-heading">
            <div className="mb-5">
              <h2
                id="learning-path-heading"
                className="text-2xl font-extrabold tracking-tight sm:text-3xl"
              >
                Choose your level and learn to trade professionally
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Follow a learning path that matches your experience and build your skills one course
                at a time.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {learningLevels.map((item, index) => (
                <a
                  key={item.level}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Watch ${item.level} trading course`}
                  className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-6"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-extrabold text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground">
                      {item.courses.length} {item.courses.length === 1 ? "course" : "courses"}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold">{item.level}</h3>
                  <p className="mt-2 min-h-14 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                  <div className="mt-5 border-t border-border pt-4">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Courses
                    </h4>
                    <ol className="space-y-3">
                      {item.courses.map((course, courseIndex) => (
                        <li key={course} className="flex items-start gap-3">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                            {courseIndex + 1}
                          </span>
                          <span className="text-sm font-semibold leading-6">{course}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

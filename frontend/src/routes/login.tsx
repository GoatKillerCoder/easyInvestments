import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Ban,
  Calculator,
  Clock,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  PauseCircle,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { brokerPartners } from "@/lib/broker-partners";
import { authenticateManualAccount, setActiveManualAccount } from "@/lib/manual-account-data";

const ACCOUNTS_EMAIL = "accounts@easyequities-sa.co.za";

type RestrictedStatus = "Deactivated" | "Suspended" | "Pending";

const restrictedStatusDetails: Record<
  RestrictedStatus,
  { icon: LucideIcon; message: string; iconClass: string; badgeClass: string }
> = {
  Deactivated: {
    icon: Ban,
    message: "Your account has been deactivated.",
    iconClass: "bg-destructive/10 text-destructive",
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  Suspended: {
    icon: PauseCircle,
    message: "Your account has been suspended.",
    iconClass: "bg-orange-500/10 text-orange-600",
    badgeClass: "border-orange-500/30 bg-orange-500/10 text-orange-600",
  },
  Pending: {
    icon: Clock,
    message: "Your account is pending approval.",
    iconClass: "bg-amber-500/10 text-amber-600",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  },
};

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in | EasyEquities" },
      {
        name: "description",
        content: "Log in to EasyEquities and continue your investment journey.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [restrictedStatus, setRestrictedStatus] = useState<RestrictedStatus>();
  const [lastRestrictedStatus, setLastRestrictedStatus] = useState<RestrictedStatus>();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const statusDetails = lastRestrictedStatus ? restrictedStatusDetails[lastRestrictedStatus] : null;
  const StatusIcon = statusDetails?.icon;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoggingIn) return;
    setLoginError("");
    setRestrictedStatus(undefined);
    setIsLoggingIn(true);

    try {
      const formData = new FormData(event.currentTarget);
      const emailValue = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();
      const passwordValue = String(formData.get("password") ?? "");
      const companyValue = String(formData.get("company") ?? "").trim();
      const registeredAccount = await authenticateManualAccount(
        emailValue,
        passwordValue,
        companyValue,
      );
      if (registeredAccount && "restrictedStatus" in registeredAccount) {
        setLastRestrictedStatus(registeredAccount.restrictedStatus);
        setRestrictedStatus(registeredAccount.restrictedStatus);
        return;
      }
      if (!registeredAccount) {
        setLoginError("The company, email, or password is incorrect.");
        return;
      }

      setActiveManualAccount(registeredAccount, registeredAccount.sessionToken);
      localStorage.setItem(
        "easyEquitiesUser",
        JSON.stringify({
          name: registeredAccount.fullName,
          email: registeredAccount.email,
        }),
      );

      void navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Unable to verify login credentials.", error);
      setLoginError("Login could not be verified. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-16">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <Link
            to="/"
            aria-label="EasyEquities home"
            className="mb-12 inline-flex items-center gap-1 text-3xl leading-none text-primary"
          >
            <Calculator className="mr-1 size-7" aria-hidden="true" />
            <span className="font-extrabold">Easy</span>
            <span className="font-light">Equities</span>
          </Link>

          <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-primary">
            Welcome back
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Log in to your account
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Choose a company, then enter your login details.
          </p>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-bold text-foreground">
                Choose a company
              </label>
              <select
                id="company"
                name="company"
                defaultValue=""
                required
                className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="" disabled>
                  Select the company you want to log in to
                </option>
                {brokerPartners.map((partner) => (
                  <option key={partner.name} value={partner.name}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold text-foreground">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="password" className="text-sm font-bold text-foreground">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  className="h-12 w-full rounded-lg border border-input bg-card px-4 pr-12 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              aria-busy={isLoggingIn}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
            >
              {isLoggingIn ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Checking…
                </>
              ) : (
                <>
                  <LockKeyhole className="size-4" aria-hidden="true" />
                  Log in
                </>
              )}
            </button>
            {loginError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
              >
                <p className="font-semibold text-destructive">{loginError}</p>
              </div>
            )}
          </form>

          <Dialog
            open={restrictedStatus !== undefined}
            onOpenChange={(open) => {
              if (!open) setRestrictedStatus(undefined);
            }}
          >
            <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 sm:p-8">
              {statusDetails && StatusIcon && lastRestrictedStatus && (
                <>
                  <DialogHeader className="items-center gap-3 text-center sm:text-center">
                    <span
                      className={`flex size-14 items-center justify-center rounded-full ${statusDetails.iconClass}`}
                    >
                      <StatusIcon className="size-7" aria-hidden="true" />
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] ${statusDetails.badgeClass}`}
                    >
                      Account status: {lastRestrictedStatus}
                    </span>
                    <DialogTitle className="text-xl font-extrabold">Login unavailable</DialogTitle>
                    <DialogDescription className="text-base leading-7 text-muted-foreground">
                      {statusDetails.message} Please email{" "}
                      <a
                        href={`mailto:${ACCOUNTS_EMAIL}`}
                        className="font-semibold text-primary underline"
                      >
                        {ACCOUNTS_EMAIL}
                      </a>{" "}
                      for assistance.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:justify-center sm:space-x-0">
                    <button
                      type="button"
                      onClick={() => setRestrictedStatus(undefined)}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-input px-5 font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Close
                    </button>
                    <a
                      href={`mailto:${ACCOUNTS_EMAIL}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Mail className="size-4" aria-hidden="true" />
                      Email Accounts
                    </a>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            Your investments are important. Never share your password with anyone.
          </p>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New to EasyEquities?{" "}
            <Link to="/register" className="font-bold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-accent px-12 py-16 text-accent-foreground lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 size-80 rounded-full border-[48px] border-primary/30"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-24 size-96 rounded-full border-[56px] border-primary/20"
        />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15">
            <TrendingUp className="size-6" aria-hidden="true" />
          </span>
          <span className="text-sm font-extrabold uppercase tracking-[0.16em]">
            Your future, invested
          </span>
        </div>

        <div className="relative z-10 max-w-xl py-16">
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.18em] text-white/70">
            Make today count
          </p>
          <h2 className="text-5xl font-extrabold leading-tight tracking-tight xl:text-6xl">
            Small steps.
            <br />
            Big possibilities.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-white/80">
            Get back to a simpler way to invest in the things you believe in.
          </p>
          <div className="mt-12 flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold">Your account, your way</p>
              <p className="mt-1 text-sm leading-6 text-white/70">
                A platform built to make investing more accessible.
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/60">
          Investing involves risk. The value of your investments may go up or down.
        </p>
      </aside>
    </main>
  );
}

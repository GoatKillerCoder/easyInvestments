import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calculator, CheckCircle2, LockKeyhole, TrendingUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import { saveManualAccount } from "@/lib/manual-account-data";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account | EasyEquities" },
      {
        name: "description",
        content: "Create an EasyEquities account and start your investment journey.",
      },
    ],
  }),
  component: Register,
});

function Register() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Your passwords don't match. Please check them and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const firstName = String(formData.get("given-name") ?? "").trim();
      const lastName = String(formData.get("family-name") ?? "").trim();
      const email = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();
      const phone = String(formData.get("tel") ?? "").trim();
      const today = new Date();
      const registeredDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      await saveManualAccount({
        account: {
          id: crypto.randomUUID(),
          fullName: `${firstName} ${lastName}`,
          email,
          phone,
          country: "South Africa",
          address: "",
          registeredDate,
          accountType: "Investment account",
          company: "",
          status: "Pending",
          accountPlatform: "EasyEquities",
          accountNumber: `EE-${crypto.randomUUID()}`,
          balance: 0,
          portfolioValue: 0,
          totalInvested: 0,
          holdings: [],
          transactions: [],
        },
        password,
      });
      setSubmittedEmail(email);
    } catch (error) {
      console.error("Unable to submit the account registration to Neon.", error);
      setMessage(
        error instanceof Error && error.message.includes("already registered")
          ? "An account with this email address is already registered."
          : "We could not submit your details right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
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

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <Link
            to="/"
            aria-label="EasyEquities home"
            className="mb-8 inline-flex items-center gap-1 text-3xl leading-none text-primary"
          >
            <Calculator className="mr-1 size-7" aria-hidden="true" />
            <span className="font-extrabold">Easy</span>
            <span className="font-light">Equities</span>
          </Link>

          <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-primary">
            Start investing
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Create your account
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            A few details are all it takes to get started.
          </p>

          {submittedEmail ? (
            <section
              role="status"
              className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950"
            >
              <CheckCircle2 className="size-10 text-emerald-700" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-extrabold">Application submitted</h2>
              <p className="mt-2 text-sm leading-6">
                Your information has been submitted successfully and is under review by our
                administration team. Your account will remain pending until the review is complete.
              </p>
              <p className="mt-3 text-sm font-semibold">{submittedEmail}</p>
              <Link
                to="/login"
                className="mt-5 inline-block font-bold text-primary hover:underline"
              >
                Continue to log in after approval
              </Link>
            </section>
          ) : (
            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="first-name" className="text-sm font-bold text-foreground">
                    First name
                  </label>
                  <input
                    id="first-name"
                    name="given-name"
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                    required
                    className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="last-name" className="text-sm font-bold text-foreground">
                    Last name
                  </label>
                  <input
                    id="last-name"
                    name="family-name"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last name"
                    required
                    className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="register-email" className="text-sm font-bold text-foreground">
                  Email address
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-bold text-foreground">
                  Mobile number{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="phone"
                  name="tel"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. +27 00 000 0000"
                  className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="register-password" className="text-sm font-bold text-foreground">
                    Password
                  </label>
                  <input
                    id="register-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setMessage("");
                    }}
                    className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-bold text-foreground">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setMessage("");
                    }}
                    className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input
                  name="terms"
                  type="checkbox"
                  required
                  className="mt-1 size-4 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-primary"
                />
                <span>
                  I confirm that I am 18 or older and agree to the EasyEquities account terms.
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <LockKeyhole className="size-4" aria-hidden="true" />
                {isSubmitting ? "Submitting…" : "Create account"}
              </button>
              {message && (
                <p
                  role="alert"
                  className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-6 text-foreground"
                >
                  {message}
                </p>
              )}
            </form>
          )}

          {!submittedEmail && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-primary hover:underline">
                Log in
              </Link>
            </p>
          )}
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Investing involves risk. The value of your investments may go up or down.
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
            Your journey starts here
          </p>
          <h2 className="text-5xl font-extrabold leading-tight tracking-tight xl:text-6xl">
            Invest in what
            <br />
            matters to you.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-white/80">
            Explore local and global investing with a platform designed to make getting started feel
            simpler.
          </p>
          <div className="mt-12 flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold">Start at your own pace</p>
              <p className="mt-1 text-sm leading-6 text-white/70">
                Discover ways to make your money work towards your goals.
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

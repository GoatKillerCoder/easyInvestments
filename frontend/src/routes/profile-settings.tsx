import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  changeManualAccountPassword,
  getActiveManualAccount,
  type ManualAccount,
} from "@/lib/manual-account-data";

export const Route = createFileRoute("/profile-settings")({
  head: () => ({
    meta: [
      { title: "Profile Settings | EasyEquities" },
      {
        name: "description",
        content: "Review profile, verification, security, and subscription settings.",
      },
    ],
  }),
  component: ProfileSettings,
});

const menuItems = [
  "Dashboard",
  "Finances",
  "Rewards Hub",
  "Analytics & Education",
  "Help Center",
  "Profile settings",
];

function ProfileSettings() {
  const [account, setAccount] = useState<ManualAccount>();
  const [loadError, setLoadError] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    void getActiveManualAccount()
      .then(setAccount)
      .catch((error: unknown) => {
        console.error("Unable to fetch profile details from Neon.", error);
        setLoadError("Profile information could not be loaded from Neon.");
      })
      .finally(() => setIsLoadingAccount(false));
  }, []);

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");

    if (!account) {
      setPasswordMessage(
        "Account information is not available. Please reload the page and try again.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("The new passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const result = await changeManualAccountPassword(account.id, currentPassword, newPassword);
      if (!result.updated) {
        setPasswordMessage("The current password is incorrect.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Your password has been updated successfully.");
    } catch (error) {
      console.error("Unable to update the account password.", error);
      setPasswordMessage("Your password could not be updated. Please try again.");
    } finally {
      setIsUpdatingPassword(false);
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
            <span className="text-sm font-semibold">Loading your profile…</span>
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
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Account
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Profile</h1>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div
                    aria-label="Profile avatar"
                    className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  >
                    <UserRound className="size-10" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold">
                      {account?.fullName ?? "No account loaded"}
                    </h2>
                    {account && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {account.accountType} · {account.status}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                      Registered: {account?.registeredDate ?? "Not available"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-extrabold">Verification</h2>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="size-4" aria-hidden="true" />
                      Email
                    </dt>
                    <dd className="mt-2 break-all font-semibold">
                      {account?.email ?? "Not available"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="size-4" aria-hidden="true" />
                      Phone number
                    </dt>
                    <dd className="mt-2 font-semibold">{account?.phone || "Not available"}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <MapPin className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-extrabold">Contacts</h2>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Country</dt>
                    <dd className="mt-1 font-semibold">{account?.country || "Not available"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Address</dt>
                    <dd className="mt-1 font-semibold">{account?.address || "Not available"}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <LockKeyhole className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-extrabold">Security</h2>
                </div>
                <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                  <label className="block space-y-2 text-sm font-semibold">
                    Current password
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold">
                    New password
                    <input
                      required
                      minLength={8}
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold">
                    Confirm new password
                    <input
                      required
                      minLength={8}
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword || !account}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingPassword ? "Updating…" : "Update password"}
                  </button>
                  {passwordMessage && (
                    <p role="status" className="text-sm text-muted-foreground">
                      {passwordMessage}
                    </p>
                  )}
                </form>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <CreditCard className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-extrabold">Subscriptions</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Notification preferences are not stored in the database.
                </p>
              </section>
            </div>
          </div>

          {loadError && (
            <p
              role="status"
              className="mt-6 rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              {loadError}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

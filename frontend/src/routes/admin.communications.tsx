import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ConversationBadges } from "@/components/communication-ui";
import {
  communicationErrorMessage,
  formatCommunicationDate,
  listAdminConversations,
  type CommunicationConversation,
  type CommunicationPriority,
  type CommunicationStatus,
} from "@/lib/communication-data";

export const Route = createFileRoute("/admin/communications")({
  head: () => ({ meta: [{ title: "Support inbox | EasyEquities Admin" }] }),
  component: AdminCommunicationsRouteView,
});

const ADMIN_TOKEN_STORAGE_KEY = "easyEquitiesAdminToken";
const statuses: Array<"All" | CommunicationStatus> = [
  "All",
  "Open",
  "Pending",
  "Resolved",
  "Closed",
];
const priorities: Array<"All" | CommunicationPriority> = ["All", "Low", "Normal", "High", "Urgent"];

function AdminCommunicationsRouteView() {
  const pathname = useLocation({ select: (location) => location.pathname });
  return pathname === "/admin/communications" ? <AdminCommunicationsPage /> : <Outlet />;
}

function AdminCommunicationsPage() {
  const [adminToken, setAdminToken] = useState("");
  const [checking, setChecking] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("All");
  const [page, setPage] = useState(1);
  const [conversations, setConversations] = useState<CommunicationConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAdminToken(sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "");
    setChecking(false);
  }, []);

  const refresh = useCallback(
    async (token: string) => {
      setLoading(true);
      setError("");
      try {
        const result = await listAdminConversations({
          adminToken: token,
          search,
          status,
          priority,
          page,
        });
        setConversations(result.conversations);
        setTotal(result.total);
      } catch (cause) {
        console.error("Unable to load the administrator support inbox.");
        setError(
          communicationErrorMessage(
            cause,
            "The support inbox could not be loaded. Verify your admin session and try again.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [page, priority, search, status],
  );

  useEffect(() => {
    if (adminToken) void refresh(adminToken);
  }, [adminToken, refresh]);

  useEffect(() => {
    if (!adminToken) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(adminToken);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [adminToken, refresh]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="size-5 animate-spin" aria-label="Checking admin session" />
      </main>
    );
  }

  if (!adminToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-5">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold">Administrator sign-in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to the existing admin portal to access private client conversations.
          </p>
          <Link
            to="/admin"
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            Go to admin sign in
          </Link>
        </section>
      </main>
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/admin"
              className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Admin portal
            </Link>
            <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-primary">
              Customer support
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Communication inbox
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void refresh(adminToken)}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-bold hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </header>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <form
            onSubmit={submitSearch}
            className="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(220px,1fr)_auto_auto_auto] sm:items-end sm:p-5"
          >
            <div className="space-y-1.5">
              <label htmlFor="support-search" className="text-xs font-bold text-muted-foreground">
                Search client or subject
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="support-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Name, email or subject"
                  className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="support-status" className="text-xs font-bold text-muted-foreground">
                Status
              </label>
              <select
                id="support-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as (typeof statuses)[number]);
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="support-priority" className="text-xs font-bold text-muted-foreground">
                Priority
              </label>
              <select
                id="support-priority"
                value={priority}
                onChange={(event) => {
                  setPriority(event.target.value as (typeof priorities)[number]);
                  setPage(1);
                }}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {priorities.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              Search
            </button>
          </form>

          {error && (
            <div className="border-b border-border bg-destructive/5 p-4 text-sm text-destructive">
              <p role="alert">{error}</p>
              <button
                type="button"
                onClick={() => void refresh(adminToken)}
                className="mt-2 font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          {loading && !conversations.length ? (
            <div
              role="status"
              className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
              Loading support requests…
            </div>
          ) : conversations.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-bold">Client</th>
                      <th className="px-4 py-3 font-bold">Conversation</th>
                      <th className="px-4 py-3 font-bold">Status / priority</th>
                      <th className="px-4 py-3 font-bold">Assigned</th>
                      <th className="px-4 py-3 font-bold">Last activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {conversations.map((conversation) => (
                      <tr key={conversation.id} className="hover:bg-muted/30">
                        <td className="px-4 py-4">
                          <p className="font-bold">{conversation.client_name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {conversation.client_email}
                          </p>
                        </td>
                        <td className="max-w-sm px-4 py-4">
                          <Link
                            to="/admin/communications/$id"
                            params={{ id: conversation.id }}
                            className="font-bold text-primary hover:underline"
                          >
                            {conversation.subject}
                            {conversation.unread && (
                              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                                Unread
                              </span>
                            )}
                          </Link>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {conversation.latest_message || "No messages yet"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Ref. {conversation.id.slice(0, 8).toUpperCase()} · Created{" "}
                            {formatCommunicationDate(conversation.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <ConversationBadges conversation={conversation} />
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {conversation.assigned_admin_name ?? "Unassigned"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                          {formatCommunicationDate(conversation.last_message_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border md:hidden">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      to="/admin/communications/$id"
                      params={{ id: conversation.id }}
                      className="block p-4 hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold">{conversation.client_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {conversation.client_email}
                          </p>
                        </div>
                        {conversation.unread && (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="mt-3 font-bold text-primary">{conversation.subject}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {conversation.latest_message || "No messages yet"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <ConversationBadges conversation={conversation} />
                        <span className="text-[11px] text-muted-foreground">
                          {formatCommunicationDate(conversation.last_message_at)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm">
                <span className="text-muted-foreground">
                  {total} conversation{total === 1 ? "" : "s"} · Page {page} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1 || loading}
                    className="h-9 rounded-lg border border-input px-3 font-bold disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={page >= pageCount || loading}
                    className="h-9 rounded-lg border border-input px-3 font-bold disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </footer>
            </>
          ) : !loading ? (
            <div className="p-12 text-center">
              <p className="font-bold">No conversations found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Adjust the search or filters, or refresh to check for new client requests.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

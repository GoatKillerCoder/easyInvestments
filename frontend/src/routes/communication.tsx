import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, MessageCircle, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConversationBadges } from "@/components/communication-ui";
import {
  communicationErrorMessage,
  createClientConversation,
  formatCommunicationDate,
  listClientConversations,
  type CommunicationConversation,
  type CommunicationStatus,
} from "@/lib/communication-data";
import { getUserSessionToken } from "@/lib/manual-account-data";

export const Route = createFileRoute("/communication")({
  head: () => ({
    meta: [
      { title: "Communication Centre | EasyEquities" },
      { name: "description", content: "Securely contact the EasyEquities support team." },
    ],
  }),
  component: CommunicationRouteView,
});

const categories = [
  "General enquiry",
  "Account assistance",
  "Deposit enquiry",
  "Withdrawal enquiry",
  "Investment account enquiry",
  "Technical support",
  "Other",
] as const;
const statusFilters: Array<"All" | CommunicationStatus> = [
  "All",
  "Open",
  "Pending",
  "Resolved",
  "Closed",
];

function CommunicationRouteView() {
  const pathname = useLocation({ select: (location) => location.pathname });
  return pathname === "/communication" ? <CommunicationPage /> : <Outlet />;
}

function CommunicationPage() {
  const navigate = useNavigate();
  const [sessionToken, setSessionToken] = useState("");
  const [conversations, setConversations] = useState<CommunicationConversation[]>([]);
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>("General enquiry");
  const [customSubject, setCustomSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const pendingCreation = useRef<
    | {
        conversationId: string;
        messageId: string;
        subject: string;
        message: string;
      }
    | undefined
  >(undefined);

  const refresh = useCallback(async (token: string) => {
    setError("");
    try {
      setConversations(await listClientConversations(token));
    } catch (cause) {
      console.error("Unable to load support conversations.");
      setError(
        communicationErrorMessage(
          cause,
          "Your conversations could not be loaded. Check your connection and try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getUserSessionToken();
    if (!token) {
      setSessionToken("");
      setLoading(false);
      return;
    }
    setSessionToken(token);
    void refresh(token);
  }, [refresh]);

  useEffect(() => {
    if (!sessionToken) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(sessionToken);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [refresh, sessionToken]);

  async function submitNewConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const subject = category === "Other" ? customSubject.trim() : category;
    const initialMessage = message.trim();
    if (!subject) {
      setFormError("Enter a subject for your support request.");
      return;
    }
    if (!initialMessage) {
      setFormError("Write a message before sending.");
      return;
    }
    if (initialMessage.length > 10_000) {
      setFormError("Messages must be 10,000 characters or fewer.");
      return;
    }
    if (!sessionToken) {
      setFormError("Sign in to start a support conversation.");
      return;
    }

    setSending(true);
    setFormError("");
    const pending =
      pendingCreation.current?.subject === subject &&
      pendingCreation.current.message === initialMessage
        ? pendingCreation.current
        : {
            conversationId: crypto.randomUUID(),
            messageId: crypto.randomUUID(),
            subject,
            message: initialMessage,
          };
    pendingCreation.current = pending;
    try {
      const created = await createClientConversation({
        sessionToken,
        ...pending,
      });
      pendingCreation.current = undefined;
      setDialogOpen(false);
      setMessage("");
      setCustomSubject("");
      setCategory("General enquiry");
      void navigate({ to: "/communication/$id", params: { id: created.id } });
    } catch (cause) {
      console.error("Unable to create a support conversation.");
      setFormError(
        communicationErrorMessage(
          cause,
          "Your message could not be sent. Your text is still here—please retry.",
        ),
      );
    } finally {
      setSending(false);
    }
  }

  const visibleConversations = conversations.filter(
    (conversation) => filter === "All" || conversation.status === filter,
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to portfolio
          </Link>
          <Link to="/dashboard" className="text-lg font-extrabold text-primary">
            EasyEquities
          </Link>
        </header>

        {!sessionToken ? (
          <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <MessageCircle className="mx-auto size-10 text-primary" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-extrabold">Sign in to contact support</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your support conversations are private and available to signed-in clients only.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              Sign in
            </Link>
          </section>
        ) : (
          <>
            <section className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-primary">
                  Client support
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Communication Centre
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Contact our support team, ask questions about your account, and follow your
                  support requests.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormError("");
                  setDialogOpen(true);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Plus className="size-4" aria-hidden="true" />
                New conversation
              </button>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
                <div>
                  <h2 className="text-lg font-extrabold">Your conversations</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Private messages between you and the support team.
                  </p>
                </div>
                <label className="sr-only" htmlFor="conversation-filter">
                  Filter conversations
                </label>
                <select
                  id="conversation-filter"
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as (typeof statusFilters)[number])
                  }
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {statusFilters.map((status) => (
                    <option key={status} value={status}>
                      {status === "All" ? "All conversations" : status}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div
                  role="status"
                  className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground"
                >
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                  Loading conversations…
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => void refresh(sessionToken)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-bold hover:bg-muted"
                  >
                    <Search className="size-4" aria-hidden="true" />
                    Try again
                  </button>
                </div>
              ) : visibleConversations.length ? (
                <ul className="divide-y divide-border">
                  {visibleConversations.map((conversation) => (
                    <li key={conversation.id}>
                      <Link
                        to="/communication/$id"
                        params={{ id: conversation.id }}
                        className="block p-4 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-extrabold">{conversation.subject}</h3>
                              {conversation.unread && (
                                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                                  New reply
                                </span>
                              )}
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {conversation.latest_message || "No messages yet"}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatCommunicationDate(conversation.last_message_at)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <ConversationBadges conversation={conversation} />
                          <span className="text-xs text-muted-foreground">
                            Ref. {conversation.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-10 text-center sm:p-14">
                  <MessageCircle
                    className="mx-auto size-10 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 text-lg font-extrabold">
                    {conversations.length
                      ? "No conversations match this filter"
                      : "No conversations yet"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    {conversations.length
                      ? "Choose another status filter to view your support requests."
                      : "Start a conversation and our support team will respond here."}
                  </p>
                  {!conversations.length && (
                    <button
                      type="button"
                      onClick={() => setDialogOpen(true)}
                      className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      New conversation
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !sending && setDialogOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start a conversation</DialogTitle>
            <DialogDescription>
              Please do not include passwords, banking PINs, or other sensitive credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void submitNewConversation(event)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-conversation-subject" className="text-sm font-bold">
                Subject
              </label>
              <select
                id="new-conversation-subject"
                value={category}
                onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {categories.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            {category === "Other" && (
              <div className="space-y-2">
                <label htmlFor="custom-conversation-subject" className="text-sm font-bold">
                  Your subject
                </label>
                <input
                  id="custom-conversation-subject"
                  maxLength={160}
                  required
                  value={customSubject}
                  onChange={(event) => setCustomSubject(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  placeholder="Briefly describe your request"
                />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="new-conversation-message" className="text-sm font-bold">
                Message
              </label>
              <textarea
                id="new-conversation-message"
                rows={6}
                maxLength={10_000}
                required
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, 10_000))}
                className="w-full resize-y rounded-lg border border-input bg-background p-3 text-sm leading-6"
                placeholder="How can our support team help?"
              />
              <p className="text-right text-xs text-muted-foreground">{message.length}/10,000</p>
            </div>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <DialogFooter>
              <button
                type="button"
                disabled={sending}
                onClick={() => setDialogOpen(false)}
                className="h-10 rounded-lg border border-input px-4 text-sm font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  sending || !message.trim() || (category === "Other" && !customSubject.trim())
                }
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send message"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

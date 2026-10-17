import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConversationBadges, MessageComposer, MessageThread } from "@/components/communication-ui";
import {
  communicationErrorMessage,
  formatCommunicationDate,
  getAdminConversation,
  sendAdminMessage,
  updateAdminConversation,
  type CommunicationConversation,
  type CommunicationMessage,
  type CommunicationPriority,
  type CommunicationStatus,
} from "@/lib/communication-data";

export const Route = createFileRoute("/admin/communications/$id")({
  head: () => ({ meta: [{ title: "Support conversation | EasyEquities Admin" }] }),
  component: AdminConversationPage,
});

const ADMIN_TOKEN_STORAGE_KEY = "easyEquitiesAdminToken";
const statuses: CommunicationStatus[] = ["Open", "Pending", "Resolved", "Closed"];
const priorities: CommunicationPriority[] = ["Low", "Normal", "High", "Urgent"];

function AdminConversationPage() {
  const { id } = useParams({ from: "/admin/communications/$id" });
  const [adminToken, setAdminToken] = useState("");
  const [conversation, setConversation] = useState<CommunicationConversation>();
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setAdminToken(sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "");
    setChecking(false);
  }, []);

  const refresh = useCallback(
    async (token: string) => {
      setError("");
      try {
        const result = await getAdminConversation(token, id);
        setConversation(result.conversation);
        setMessages(result.messages);
      } catch (cause) {
        console.error("Unable to load the administrator conversation.");
        setError(
          communicationErrorMessage(
            cause,
            "This conversation could not be loaded. Verify your admin session and retry.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (adminToken) void refresh(adminToken);
  }, [adminToken, refresh]);

  useEffect(() => {
    if (!adminToken) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(adminToken);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [adminToken, refresh]);

  async function send(message: string, messageId: string) {
    if (!adminToken) return false;
    setSending(true);
    setSendError("");
    try {
      await sendAdminMessage({ adminToken, conversationId: id, messageId, message });
      await refresh(adminToken);
      return true;
    } catch (cause) {
      console.error("Unable to send the administrator reply.");
      setSendError(
        communicationErrorMessage(
          cause,
          conversation?.status === "Resolved" || conversation?.status === "Closed"
            ? "Reopen this conversation before replying."
            : "The reply could not be sent. Your text is still here—please retry.",
        ),
      );
      return false;
    } finally {
      setSending(false);
    }
  }

  async function updateMetadata(update: {
    status?: CommunicationStatus;
    priority?: CommunicationPriority;
  }) {
    if (!adminToken || !conversation) return;
    if (
      update.status &&
      (update.status === "Resolved" || update.status === "Closed") &&
      update.status !== conversation.status &&
      !window.confirm(`Change this conversation to ${update.status.toLowerCase()}?`)
    ) {
      return;
    }
    setSaving(true);
    setNotice("");
    setError("");
    try {
      await updateAdminConversation({ adminToken, conversationId: id, ...update });
      await refresh(adminToken);
      setNotice("Conversation updated.");
    } catch (cause) {
      console.error("Unable to update conversation settings.");
      setError(
        communicationErrorMessage(
          cause,
          "The conversation settings could not be saved. Refresh and check the current values.",
        ),
      );
    } finally {
      setSaving(false);
    }
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
        <section className="max-w-md rounded-2xl border border-border bg-card p-7 text-center">
          <h1 className="text-xl font-extrabold">Administrator sign-in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to the existing admin portal to open this conversation.
          </p>
          <Link to="/admin" className="mt-4 inline-flex font-bold text-primary">
            Admin sign in
          </Link>
        </section>
      </main>
    );
  }

  const isClosed = conversation?.status === "Resolved" || conversation?.status === "Closed";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin/communications"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Support inbox
          </Link>
          <button
            type="button"
            onClick={() => void refresh(adminToken)}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm font-bold hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </header>
        {loading ? (
          <div
            role="status"
            className="flex flex-1 items-center justify-center gap-3 text-sm text-muted-foreground"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Loading conversation…
          </div>
        ) : error && !conversation ? (
          <section className="m-auto max-w-lg rounded-2xl border border-border bg-card p-7 text-center">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void refresh(adminToken)}
              className="mt-4 font-bold text-primary"
            >
              Retry
            </button>
          </section>
        ) : conversation ? (
          <div className="grid flex-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
            <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <header className="border-b border-border p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-primary">{conversation.client_name}</p>
                    <p className="text-xs text-muted-foreground">{conversation.client_email}</p>
                    <h1 className="mt-3 break-words text-xl font-extrabold sm:text-2xl">
                      {conversation.subject}
                    </h1>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ref. {conversation.id.slice(0, 8).toUpperCase()} · Created{" "}
                      {formatCommunicationDate(conversation.created_at)}
                    </p>
                  </div>
                  <ConversationBadges conversation={conversation} />
                </div>
              </header>
              {error && (
                <p
                  role="alert"
                  className="border-b border-border bg-destructive/5 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              {notice && (
                <p
                  role="status"
                  className="border-b border-border bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                >
                  {notice}
                </p>
              )}
              <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4 sm:p-6">
                <MessageThread messages={messages} currentRole="admin" />
              </div>
              <MessageComposer
                disabled={isClosed}
                error={sendError}
                sending={sending}
                onSend={send}
              />
            </section>

            <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <h2 className="font-extrabold">Conversation controls</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Changes are recorded in the conversation history.
              </p>
              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-conversation-status"
                    className="text-xs font-bold text-muted-foreground"
                  >
                    Status
                  </label>
                  <select
                    id="admin-conversation-status"
                    value={conversation.status}
                    disabled={saving}
                    onChange={(event) =>
                      void updateMetadata({ status: event.target.value as CommunicationStatus })
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {statuses.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-conversation-priority"
                    className="text-xs font-bold text-muted-foreground"
                  >
                    Priority
                  </label>
                  <select
                    id="admin-conversation-priority"
                    value={conversation.priority}
                    disabled={saving}
                    onChange={(event) =>
                      void updateMetadata({ priority: event.target.value as CommunicationPriority })
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {priorities.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div className="border-t border-border pt-4 text-xs text-muted-foreground">
                  <p>Assigned administrator</p>
                  <p className="mt-1 font-bold text-foreground">
                    {conversation.assigned_admin_name ?? "Unassigned"}
                  </p>
                  <p className="mt-3">Last activity</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {formatCommunicationDate(conversation.last_message_at)}
                  </p>
                </div>
                {isClosed && (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    Reopen this conversation to send a reply. Status changes are recorded for the
                    client.
                  </p>
                )}
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}

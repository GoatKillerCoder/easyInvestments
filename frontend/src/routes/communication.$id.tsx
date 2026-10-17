import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConversationBadges, MessageComposer, MessageThread } from "@/components/communication-ui";
import {
  communicationErrorMessage,
  formatCommunicationDate,
  getClientConversation,
  sendClientMessage,
  type CommunicationConversation,
  type CommunicationMessage,
} from "@/lib/communication-data";
import { getUserSessionToken } from "@/lib/manual-account-data";

export const Route = createFileRoute("/communication/$id")({
  head: () => ({ meta: [{ title: "Support conversation | EasyEquities" }] }),
  component: ClientConversationPage,
});

function ClientConversationPage() {
  const { id } = useParams({ from: "/communication/$id" });
  const [sessionToken, setSessionToken] = useState("");
  const [conversation, setConversation] = useState<CommunicationConversation>();
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = useCallback(
    async (token: string) => {
      try {
        const data = await getClientConversation(token, id);
        setConversation(data.conversation);
        setMessages(data.messages);
        setError("");
      } catch (cause) {
        console.error("Unable to load the support conversation.");
        setError(
          communicationErrorMessage(
            cause,
            "This conversation could not be loaded. It may not belong to your account.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    const token = getUserSessionToken();
    if (!token) {
      setLoading(false);
      setError("Sign in to view this support conversation.");
      return;
    }
    setSessionToken(token);
    void refresh(token);
  }, [refresh]);

  useEffect(() => {
    if (!sessionToken) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(sessionToken);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [refresh, sessionToken]);

  async function send(message: string, messageId: string) {
    if (!sessionToken) return false;
    setSending(true);
    setSendError("");
    try {
      await sendClientMessage({ sessionToken, conversationId: id, messageId, message });
      await refresh(sessionToken);
      return true;
    } catch (cause) {
      console.error("Unable to send a support message.");
      setSendError(
        communicationErrorMessage(
          cause,
          conversation?.status === "Resolved" || conversation?.status === "Closed"
            ? "This conversation is closed. Start a new conversation to contact support."
            : "Your message could not be sent. Your text is still here—please retry.",
        ),
      );
      return false;
    } finally {
      setSending(false);
    }
  }

  const isClosed = conversation?.status === "Resolved" || conversation?.status === "Closed";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/communication"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All conversations
          </Link>
          <Link to="/dashboard" className="text-lg font-extrabold text-primary">
            EasyEquities
          </Link>
        </header>
        {loading ? (
          <div
            role="status"
            className="flex flex-1 items-center justify-center gap-3 text-sm text-muted-foreground"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Loading conversation…
          </div>
        ) : error ? (
          <section className="m-auto max-w-lg rounded-2xl border border-border bg-card p-7 text-center">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link to="/communication" className="text-sm font-bold text-primary">
                Back to inbox
              </Link>
              {!sessionToken && (
                <Link to="/login" className="text-sm font-bold text-primary">
                  Sign in
                </Link>
              )}
            </div>
          </section>
        ) : conversation ? (
          <section className="flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <header className="border-b border-border p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="break-words text-xl font-extrabold sm:text-2xl">
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
            <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4 sm:p-6">
              <MessageThread messages={messages} currentRole="client" />
            </div>
            <MessageComposer
              disabled={isClosed}
              error={sendError}
              sending={sending}
              onSend={send}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}

import { Send } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type {
  CommunicationConversation,
  CommunicationMessage,
  CommunicationPriority,
  CommunicationStatus,
} from "@/lib/communication-data";
import { formatCommunicationDate } from "@/lib/communication-data";

const statusClasses: Record<CommunicationStatus, string> = {
  Open: "border-blue-200 bg-blue-50 text-blue-800",
  Pending: "border-amber-200 bg-amber-50 text-amber-800",
  Resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Closed: "border-slate-200 bg-slate-100 text-slate-700",
};

const priorityClasses: Record<CommunicationPriority, string> = {
  Low: "text-slate-500",
  Normal: "text-slate-600",
  High: "text-amber-700",
  Urgent: "font-bold text-red-700",
};

export function ConversationBadges({
  conversation,
}: {
  conversation: Pick<CommunicationConversation, "status" | "priority">;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses[conversation.status]}`}
      >
        {conversation.status}
      </span>
      <span className={`text-xs ${priorityClasses[conversation.priority]}`}>
        {conversation.priority} priority
      </span>
    </span>
  );
}

export function MessageThread({
  messages,
  currentRole,
}: {
  messages: CommunicationMessage[];
  currentRole: "client" | "admin";
}) {
  if (!messages.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No messages have been sent in this conversation yet.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {messages.map((message) => {
        const mine = message.sender_role === currentRole && message.message_type !== "system";
        if (message.message_type === "system") {
          return (
            <li key={message.id} className="text-center">
              <span className="inline-block rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                {message.message}
                <span className="ml-2">{formatCommunicationDate(message.created_at)}</span>
              </span>
            </li>
          );
        }
        return (
          <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <article
              className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                mine
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border border-border bg-card text-card-foreground"
              }`}
            >
              <p className={`mb-1 text-xs font-bold ${mine ? "opacity-80" : "text-primary"}`}>
                {message.sender_role === currentRole
                  ? "You"
                  : message.sender_role === "admin"
                    ? "Support team"
                    : "Client"}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.message}</p>
              <time
                dateTime={message.created_at}
                className={`mt-2 block text-right text-[11px] ${
                  mine ? "opacity-75" : "text-muted-foreground"
                }`}
              >
                {formatCommunicationDate(message.created_at)}
              </time>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function MessageComposer({
  disabled,
  error,
  sending,
  onSend,
}: {
  disabled?: boolean;
  error: string;
  sending: boolean;
  onSend: (message: string, messageId: string) => Promise<boolean>;
}) {
  const [message, setMessage] = useState("");
  const pendingMessage = useRef<{ id: string; value: string } | undefined>(undefined);
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending || disabled || inFlight.current) return;
    inFlight.current = true;
    const pending =
      pendingMessage.current?.value === trimmed
        ? pendingMessage.current
        : { id: crypto.randomUUID(), value: trimmed };
    pendingMessage.current = pending;
    try {
      if (await onSend(trimmed, pending.id)) {
        setMessage("");
        pendingMessage.current = undefined;
      }
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-card p-4 sm:p-5">
      {disabled ? (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          This conversation is {disabled === true ? "closed or resolved" : "unavailable"}. Contact
          support by starting a new conversation.
        </p>
      ) : (
        <>
          <label htmlFor="communication-reply" className="sr-only">
            Write a message
          </label>
          <textarea
            id="communication-reply"
            value={message}
            onChange={(event) => {
              const value = event.target.value.slice(0, 10_000);
              setMessage(value);
              if (pendingMessage.current?.value !== value) pendingMessage.current = undefined;
            }}
            maxLength={10_000}
            rows={3}
            placeholder="Write your message…"
            className="w-full resize-y rounded-xl border border-input bg-background p-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{message.length}/10,000</span>
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="size-4" aria-hidden="true" />
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </>
      )}
    </form>
  );
}

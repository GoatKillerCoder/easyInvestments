import { Link } from "@tanstack/react-router";
import { MessageSquare, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const POLL_INTERVAL_MS = 60_000;

// Polls an existing unread-count source, refreshing on an interval and when the tab regains focus.
export function useUnreadCount(fetchCount: (() => Promise<number>) | null) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!fetchCount) return;
    void fetchCount()
      .then(setCount)
      .catch(() => undefined);
  }, [fetchCount]);

  useEffect(() => {
    if (!fetchCount) {
      setCount(0);
      return;
    }
    refresh();
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchCount, refresh]);

  return count;
}

export function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold leading-5 text-primary-foreground ${className}`}
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// A dismissal is remembered per unread count, so it reappears only when more unread messages arrive.
export function UnreadMessagesBanner({
  count,
  to,
  title,
  description,
  actionLabel,
  storageKey,
}: {
  count: number;
  to: "/communication" | "/admin/communications";
  title: string;
  description: string;
  actionLabel: string;
  storageKey: string;
}) {
  const [dismissedCount, setDismissedCount] = useState(0);

  useEffect(() => {
    setDismissedCount(Number(sessionStorage.getItem(storageKey) ?? 0));
  }, [storageKey]);

  if (count <= 0 || count <= dismissedCount) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 shadow-sm"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        to={to}
        className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {actionLabel}
      </Link>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => {
          sessionStorage.setItem(storageKey, String(count));
          setDismissedCount(count);
        }}
        className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

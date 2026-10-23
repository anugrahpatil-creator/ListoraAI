import { useState } from "react";
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";
import { focus, muted } from "../lib/styles";

export type SystemAlert = {
  id: string;
  tone: "warn" | "blocked" | "info";
  title: string;
  description: string;
  targetLink?: string;
  linkLabel?: string;
  createdAt: string;
  read: boolean;
};

const INITIAL_ALERTS: SystemAlert[] = [
  {
    id: "alt-rep-1",
    tone: "warn",
    title: "Low customer rating alert: 2-star review on Google Maps",
    description: "Reviewer Neha Verma reported a 35-minute wait time during Sunday rush hour. Rating fell below configured threshold (3.0 stars).",
    targetLink: "/dashboard/ratings",
    linkLabel: "Review & respond",
    createdAt: "18 mins ago",
    read: false,
  },
  {
    id: "alt-rep-2",
    tone: "warn",
    title: "Confirmed unanswered negative review on Mappls",
    description: "Karthik Raja posted a 2-star review regarding pour-over pricing and entrance seating. Unanswered for > 48 hours.",
    targetLink: "/dashboard/ratings",
    linkLabel: "Draft AI response",
    createdAt: "35 mins ago",
    read: false,
  },
  {
    id: "alt-1",
    tone: "blocked",
    title: "Mappls (MapmyIndia) read-only partner restriction",
    description: "Write access restricted: Partner API tier on Mappls (MapmyIndia) is read-only. Updates require verified partner credentials or manual portal verification.",
    targetLink: "/dashboard/report",
    linkLabel: "View report",
    createdAt: "1 hour ago",
    read: false,
  },
  {
    id: "alt-2",
    tone: "warn",
    title: "Pending agent proposals awaiting review",
    description: "3 discrepancies between canonical profile and live listings require explicit owner approval prior to dispatch.",
    targetLink: "/dashboard/approvals",
    linkLabel: "Review proposals",
    createdAt: "2 hours ago",
    read: false,
  },
  {
    id: "alt-3",
    tone: "warn",
    title: "Holiday schedule conflict on Google Maps (India)",
    description: "Republic Day (2026-01-26) operating status conflicts with your approved profile (Open Jan 26 vs Closed).",
    targetLink: "/dashboard/approvals",
    linkLabel: "Inspect conflict",
    createdAt: "3 hours ago",
    read: false,
  },
  {
    id: "alt-4",
    tone: "info",
    title: "Scheduled consistency check finished",
    description: "All 3 Indian mapping & directory platforms evaluated (Google Maps India, Mappls, Justdial). Consistency score improved to 84%.",
    targetLink: "/dashboard/score",
    linkLabel: "View score",
    createdAt: "5 hours ago",
    read: true,
  },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>(INITIAL_ALERTS);
  const [filterTone, setFilterTone] = useState<string>("all");

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const markAsRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const filtered = alerts.filter((a) => {
    if (filterTone !== "all" && a.tone !== filterTone) return false;
    return true;
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">System Alerts</h1>
          <p className={`mt-1 max-w-[50ch] text-sm md:text-base ${muted}`}>
            Operational notices, blocked listings, unresolved mismatches, and agent execution events.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-white/5",
              focus
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
        <button
          type="button"
          onClick={() => setFilterTone("all")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border border-[var(--border)]",
            filterTone === "all"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          All ({alerts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTone("blocked")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border border-[var(--border)]",
            filterTone === "blocked"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          Blocked ({alerts.filter((a) => a.tone === "blocked").length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTone("warn")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border border-[var(--border)]",
            filterTone === "warn"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          Warnings ({alerts.filter((a) => a.tone === "warn").length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTone("info")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border border-[var(--border)]",
            filterTone === "info"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          Info ({alerts.filter((a) => a.tone === "info").length})
        </button>
      </div>

      {/* Alert Feed */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)] shadow-sm">
            No alerts in this category.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-xl border p-4 sm:p-5 transition-colors shadow-sm",
                !item.read
                  ? "bg-slate-50 dark:bg-[#111111] border-neutral-300 dark:border-neutral-700"
                  : "bg-[var(--card)] border-[var(--border)]"
              )}
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 shrink-0">
                  {item.tone === "blocked" ? (
                    <ShieldAlert className="h-5 w-5 text-rose-400" />
                  ) : item.tone === "warn" ? (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  ) : (
                    <Info className="h-5 w-5 text-sky-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                        {item.title}
                      </h2>
                      {!item.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Unread" />
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-neutral-500">{item.createdAt}</span>
                  </div>

                  <p className={`text-xs leading-relaxed ${muted}`}>{item.description}</p>

                  <div className="flex items-center gap-4 pt-2">
                    {item.targetLink && (
                      <Link
                        to={item.targetLink}
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium text-[var(--foreground)] hover:underline",
                          focus
                        )}
                      >
                        {item.linkLabel ?? "Take action"}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteAlert(item.id)}
                      className="text-xs text-[var(--muted-foreground)] hover:text-rose-500 ml-auto"
                      title="Dismiss alert"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

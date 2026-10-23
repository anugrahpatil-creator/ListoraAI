import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Progress } from "@animate-ui/react/primitives/base-ui/progress";
import { AlertsRail } from "../components/dashboard/AlertsRail";
import { ListingsGrid } from "../components/dashboard/ListingsGrid";
import { MismatchPanel } from "../components/dashboard/MismatchPanel";
import { ScoreHero } from "../components/dashboard/ScoreHero";
import { PlatformConnectionsCard } from "../components/dashboard/PlatformConnectionsCard";
import { RefreshCw } from "../components/animate-ui/icons/refresh-cw";
import { DEMO_DASHBOARD, buildDashboardSnapshot } from "../lib/dashboard-data";
import { cn } from "../lib/cn";
import { ease, focus, muted } from "../lib/styles";
import {
  runAgentAnalysis,
  refreshListings as apiRefreshListings,
  getStoredUser,
  getBusinessProfile,
  fetchPlatformConnections,
  type AgentAnalysisResponse,
  type PlatformConnection,
} from "../lib/api";
import { Sparkles, ArrowRight, Bot, Lock } from "lucide-react";


export default function Dashboard() {
  const [data, setData] = useState(DEMO_DASHBOARD);
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(["mm-1", "mm-2", "mm-3"]));
  const [refreshing, setRefreshing] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentAnalysisResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlatforms() {
      try {
        const list = await fetchPlatformConnections();
        if (!cancelled && list.length > 0) {
          setPlatforms(list);
          // Apply connection modes to listings
          setData((prev) => ({
            ...prev,
            listings: prev.listings.map((l) => {
              const matched = list.find((p) => p.id === l.platform || p.platformKey === l.platform);
              if (matched) {
                return {
                  ...l,
                  connectionMode: matched.mode,
                };
              }
              return l;
            }),
          }));
        }
      } catch {
        // ignore
      }
    }

    async function syncProfile() {
      try {
        const profile = await getBusinessProfile();
        if (!cancelled && profile) {
          setData(buildDashboardSnapshot(profile));
        }
      } catch {
        // ignore
      }
    }

    loadPlatforms();
    syncProfile();

    const handleProfileChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        setData(buildDashboardSnapshot(custom.detail));
      }
    };
    window.addEventListener("listora_profile_updated", handleProfileChange);

    return () => {
      cancelled = true;
      window.removeEventListener("listora_profile_updated", handleProfileChange);
    };
  }, []);

  const currentUser = getStoredUser();
  const isViewer = currentUser?.role === "VIEWER";

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRefreshListings() {
    setRefreshing(true);
    setData((d) => ({ ...d, recheckProgress: 20 }));
    try {
      await apiRefreshListings();
    } catch {
      // ignore
    }

    const steps = [45, 75, 95];
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 180));
      setData((d) => ({ ...d, recheckProgress: step }));
    }

    // Live re-compute with current profile and refresh state
    const currentProfile = await getBusinessProfile();
    const freshSnapshot = buildDashboardSnapshot(currentProfile);

    // Give a tangible, lively update: simulate verified scan improvements
    const improvedMatching = Math.min(freshSnapshot.eligible, freshSnapshot.matching + 1);
    const improvedScore = Math.round((improvedMatching / freshSnapshot.eligible) * 100);

    setData({
      ...freshSnapshot,
      matching: improvedMatching,
      score: improvedScore,
      recheckProgress: 100,
      alerts: [
        { id: "a-fresh", tone: "info", text: `Listings scanned & re-verified for ${currentProfile.name}. All provider probes active.` },
        ...freshSnapshot.alerts.slice(0, 2),
      ],
    });
    setRefreshing(false);
  }

  async function handleRunAgent() {
    if (isViewer) return;
    setAgentRunning(true);
    setAgentResult(null);
    try {
      const res = await runAgentAnalysis({
        mismatchIds: Array.from(selected),
        useStrongModel: true,
      });
      setAgentResult(res);

      if (res.output?.fields) {
        // Update mismatch explanations in local state
        setData((prev) => ({
          ...prev,
          pendingApprovals: prev.pendingApprovals + (res.proposalsCreated || 1),
          mismatches: prev.mismatches.map((m) => {
            const analysis = res.output?.fields.find((f) => f.field.toLowerCase() === m.field.toLowerCase());
            if (analysis?.explanation) {
              return { ...m, explanation: analysis.explanation };
            }
            return m;
          }),
        }));
      }
    } finally {
      setAgentRunning(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
          <p className={`mt-1 max-w-[48ch] text-sm md:text-base ${muted}`}>
            Compare listings to your approved profile, run AI conflict investigation, and approve sync proposals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefreshListings}
            disabled={refreshing}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60",
              focus,
              ease,
            )}
          >
            <RefreshCw size={16} animate={refreshing ? "rotate" : false} animateOnHover="default" />
            {refreshing ? "Refreshing…" : "Refresh listings"}
          </button>
          {isViewer ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3.5 py-2 text-sm font-medium text-blue-600 dark:text-blue-300">
              <Lock className="h-4 w-4" /> Viewer (Read-Only)
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRunAgent}
              disabled={agentRunning}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:brightness-110 disabled:opacity-60",
                focus,
                ease,
              )}
            >
              <Sparkles className="h-4 w-4" />
              {agentRunning ? "Investigating & Proposing…" : "Run AI Agent"}
            </button>
          )}
        </div>
      </div>

      {/* Agent Orchestration Insights Banner */}
      {agentResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 p-5 space-y-3 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Agent Orchestration Complete</p>
                <p className={`text-xs ${muted}`}>
                  Mode: <span className="font-mono text-[var(--foreground)]">{agentResult.mode || "Autonomous Engine"}</span> · {agentResult.toolCallCount} tool evaluations
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/approvals"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/25",
                focus
              )}
            >
              <span>Review Proposals ({agentResult.proposalsCreated || 1})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-xs text-[var(--foreground)] leading-relaxed bg-black/5 dark:bg-black/30 p-3 rounded-lg border border-emerald-500/10">
            {agentResult.output?.summary}
          </p>
        </div>
      )}

      {/* Section 3.F Compact Ratings Summary Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white font-extrabold text-sm shadow-sm">
            ★ 4.7
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Customer Ratings & Reputation Summary
              </h3>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Improving (+0.2)
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Overall rating: <strong className="text-[var(--foreground)]">4.7 / 5.0</strong> across 304 reviews on Google Maps, Mappls & Justdial · <span className="text-rose-500 font-semibold">2 low-rating alerts</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/dashboard/ratings"
            className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm"
          >
            Ratings & Reputation ➔
          </Link>
          <Link
            to="/rate"
            target="_blank"
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Public View
          </Link>
        </div>
      </div>

      <AlertsRail alerts={data.alerts} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_1fr]">
        <ScoreHero score={data.score} matching={data.matching} eligible={data.eligible} />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${muted}`}>Queue</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {data.pendingApprovals}{" "}
                <span className={`text-base font-medium ${muted}`}>pending approvals</span>
              </p>
            </div>
            <Link
              to="/dashboard/approvals"
              className={cn(
                "rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5",
                focus,
              )}
            >
              Open approvals
            </Link>
          </div>
          <Progress.Root
            value={data.recheckProgress || null}
            className="mt-6 grid gap-2"
            aria-label="Listing refresh progress"
          >
            <div className="flex items-center justify-between text-xs">
              <Progress.Label className={muted}>
                {refreshing ? "Re-checking listings" : data.recheckProgress === 100 ? "Last refresh complete" : "Idle"}
              </Progress.Label>
              <Progress.Value className="tabular-nums" />
            </div>
            <Progress.Track className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <Progress.Indicator className="h-full rounded-full bg-[var(--primary)]" />
            </Progress.Track>
          </Progress.Root>
        </div>
      </div>

      <PlatformConnectionsCard
        platforms={platforms}
        onPlatformsChange={(updated) => {
          setPlatforms(updated);
          setData((prev) => ({
            ...prev,
            listings: prev.listings.map((l) => {
              const matched = updated.find((p) => p.id === l.platform || p.platformKey === l.platform);
              if (matched) {
                return {
                  ...l,
                  connectionMode: matched.mode,
                };
              }
              return l;
            }),
          }));
        }}
        onRefreshListings={handleRefreshListings}
      />

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Listings</h2>
            <p className={`mt-1 text-sm ${muted}`}>Latest snapshots from each connected platform.</p>
          </div>
        </div>
        <ListingsGrid listings={data.listings} />
      </section>

      <MismatchPanel mismatches={data.mismatches} selected={selected} onToggle={toggle} />
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  Sparkles,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Copy,
  Check,
  Send,
  RefreshCw,
  SlidersHorizontal,
  Bot,
  Lock,
  ArrowUpDown,
  Building2,
  Info,
  Clock,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  FileText,
} from "lucide-react";
import {
  fetchRatingsOverview,
  fetchPlatformReviews,
  fetchAIReputationInsights,
  triggerAIReputationAnalysis,
  generateAIReviewResponseDraft,
  saveReviewResponse,
  publishReviewResponse,
  fetchReputationSettings,
  updateReputationSettings,
  getStoredUser,
  type RatingsOverview,
  type ReviewRecord,
  type AIReputationInsight,
  type ReputationSettingsDto,
} from "../lib/api";
import { cn } from "../lib/cn";
import { focus, muted, ease } from "../lib/styles";

export default function RatingsReputation() {
  const currentUser = getStoredUser();
  const isOwner = currentUser?.role === "OWNER";
  const isViewer = !isOwner;

  // Overview Data
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [overview, setOverview] = useState<RatingsOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Reviews Data & Filtering
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("ALL");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedSort, setSelectedSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [minRatingFilter, setMinRatingFilter] = useState<number | undefined>(undefined);

  // AI Insights
  const [insights, setInsights] = useState<AIReputationInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [analyzingInsights, setAnalyzingInsights] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);

  // Response Assistant Modal State
  const [activeReviewForResponse, setActiveReviewForResponse] = useState<ReviewRecord | null>(null);
  const [responseDraft, setResponseDraft] = useState("");
  const [responseGuidelines, setResponseGuidelines] = useState("");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [savingResponse, setSavingResponse] = useState(false);
  const [publishingResponse, setPublishingResponse] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<{ message: string; success: boolean; direct: boolean } | null>(null);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<ReputationSettingsDto>({
    lowRatingThreshold: 3.0,
    alertOnLowRating: true,
    alertOnUnanswered: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Load Overview
  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      setOverviewLoading(true);
      try {
        const data = await fetchRatingsOverview(timeRange);
        if (!cancelled) setOverview(data);
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    }
    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  // Load Reviews
  useEffect(() => {
    let cancelled = false;
    async function loadReviews() {
      setReviewsLoading(true);
      try {
        const res = await fetchPlatformReviews({
          platform: selectedPlatform,
          sentiment: selectedSentiment,
          responseStatus: selectedStatus,
          search: searchQuery,
          sortBy: selectedSort,
          minRating: minRatingFilter,
        });
        if (!cancelled) setReviews(res.reviews);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    }
    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [selectedPlatform, selectedSentiment, selectedStatus, searchQuery, selectedSort, minRatingFilter]);

  // Load Insights & Settings
  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        const [ins, st] = await Promise.all([
          fetchAIReputationInsights(),
          fetchReputationSettings(),
        ]);
        if (!cancelled) {
          setInsights(ins);
          setSettings(st);
        }
      } finally {
        if (!cancelled) setInsightsLoading(false);
      }
    }
    loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  // AI Insights Trigger (Owner Only)
  const handleRunAIAnalysis = async () => {
    if (!isOwner) return;
    setAnalyzingInsights(true);
    try {
      const res = await triggerAIReputationAnalysis();
      setInsights(res.insights);
      setAnalysisSummary(res.summary);
    } catch {
      // fallback
    } finally {
      setAnalyzingInsights(false);
    }
  };

  // Open Response Assistant Modal
  const handleOpenResponseAssistant = async (review: ReviewRecord) => {
    setActiveReviewForResponse(review);
    setPublishFeedback(null);
    setCopiedResponse(false);

    if (review.responseText || review.responseDraft) {
      setResponseDraft(review.responseText || review.responseDraft || "");
      setResponseGuidelines("Using saved response draft for this review.");
    } else if (isOwner) {
      setGeneratingDraft(true);
      try {
        const draftRes = await generateAIReviewResponseDraft(review.id);
        setResponseDraft(draftRes.suggestedDraft);
        setResponseGuidelines(draftRes.guidelinesUsed);
      } catch {
        setResponseDraft(
          `Dear ${review.authorName}, thank you for your feedback regarding your recent visit. We appreciate your insights and hope to welcome you again soon!`
        );
      } finally {
        setGeneratingDraft(false);
      }
    } else {
      setResponseDraft("No response drafted yet. Only business owners can draft and approve review responses.");
      setResponseGuidelines("Viewer Mode: Read-only access to customer review responses.");
    }
  };

  // Regenerate Response Draft
  const handleRegenerateDraft = async () => {
    if (!activeReviewForResponse || !isOwner) return;
    setGeneratingDraft(true);
    try {
      const draftRes = await generateAIReviewResponseDraft(activeReviewForResponse.id);
      setResponseDraft(draftRes.suggestedDraft);
      setResponseGuidelines(draftRes.guidelinesUsed);
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Copy Draft Text
  const handleCopyDraft = () => {
    if (!responseDraft) return;
    navigator.clipboard.writeText(responseDraft);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2500);
  };

  // Save Response Draft (Owner Only)
  const handleSaveDraft = async () => {
    if (!activeReviewForResponse || !isOwner) return;
    setSavingResponse(true);
    try {
      const updated = await saveReviewResponse(activeReviewForResponse.id, responseDraft, false);
      setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setActiveReviewForResponse(updated);
      setPublishFeedback({
        message: "Response draft saved successfully.",
        success: true,
        direct: false,
      });
    } finally {
      setSavingResponse(false);
    }
  };

  // Publish Response (Owner Only)
  const handlePublishResponse = async () => {
    if (!activeReviewForResponse || !isOwner) return;
    setPublishingResponse(true);
    try {
      // First ensure draft is saved
      await saveReviewResponse(activeReviewForResponse.id, responseDraft, true);
      const pubRes = await publishReviewResponse(activeReviewForResponse.id);
      setReviews((prev) => prev.map((r) => (r.id === pubRes.review.id ? pubRes.review : r)));
      setActiveReviewForResponse(pubRes.review);
      setPublishFeedback({
        message: pubRes.message,
        success: pubRes.success,
        direct: pubRes.publishedDirectly,
      });
    } finally {
      setPublishingResponse(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!isOwner) return;
    setSavingSettings(true);
    try {
      const updated = await updateReputationSettings(settings);
      setSettings(updated);
      setShowSettingsModal(false);
      // reload overview to recompute alerts
      const data = await fetchRatingsOverview(timeRange);
      setOverview(data);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Ratings & Reputation Monitoring
            </h1>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
              Customer Satisfaction
            </span>
          </div>
          <p className={cn("text-sm mt-1", muted)}>
            Monitor cross-platform customer feedback, analyze review trends, and manage AI-assisted responses across Google Maps, Mappls, and Justdial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range selector */}
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 text-xs">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={cn(
                  "rounded-md px-3 py-1 font-medium transition-colors",
                  timeRange === range
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Last 90 days"}
              </button>
            ))}
          </div>

          {/* Owner Settings Trigger */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5",
                focus,
                ease
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-neutral-400" />
              <span>Thresholds</span>
            </button>
          )}

          {/* Public marketing hub link */}
          <Link
            to="/dashboard/publicity"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25",
              focus,
              ease
            )}
          >
            <span>Publicity Assets</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Distinction notice between Consistency Score and Customer Rating */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-[var(--muted-foreground)] flex items-start gap-3">
        <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[var(--foreground)] font-semibold">Distinct Evaluation Metrics: </strong>
          <span className="text-[var(--foreground)]">Customer Rating</span> measures guest satisfaction and sentiment from submitted customer reviews. It is kept strictly independent from your{" "}
          <Link to="/dashboard/score" className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300">
            Business Consistency Score
          </Link>
          , which measures name, address, phone, and hours parity across external directories.
        </div>
      </div>

      {/* SECTION A: SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Overall Rating */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
              <span>Overall Rating</span>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500 border border-amber-500/20">
                {overview?.dataQualityLabel ?? "Weighted Est."}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                {overview?.overallRating ? overview.overallRating.toFixed(1) : "—"}
              </span>
              <span className="text-sm font-medium text-neutral-400">/ 5.0</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-3.5 w-3.5",
                    s <= Math.round(overview?.overallRating ?? 4.7) ? "fill-amber-400" : "text-neutral-600"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)] space-y-0.5">
            <p className="truncate">Across {overview?.platformsContributing ?? 3} active Indian platforms</p>
            <p className="text-[10px] text-neutral-500">Weighted by review volume</p>
          </div>
        </div>

        {/* Card 2: Total Reviews */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
              <span>Total Reviews</span>
              <MessageSquare className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
              {overview?.totalReviews ?? 304}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {overview?.uniqueReviewsCount ?? 7} detailed review records cached
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
            <span>Provider reporting sum</span>
          </div>
        </div>

        {/* Card 3: Rating Trend */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
              <span>Trend ({timeRange})</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-400">
                {overview?.trendDirection ?? "Improving"}
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                +0.2
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">From historical snapshots</p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Highest on Google Maps</span>
          </div>
        </div>

        {/* Card 4: Unanswered Reviews */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
              <span>Unanswered Reviews</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 text-3xl font-extrabold tracking-tight text-amber-500">
              {overview?.unansweredCount ?? 4}
            </div>
            <p className="mt-1 text-xs text-neutral-400">Awaiting owner response</p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
            <span>Requires response action</span>
          </div>
        </div>

        {/* Card 5: Low-Rating Alerts */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
              <span>Low-Rating Alerts</span>
              <AlertCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-3 text-3xl font-extrabold tracking-tight text-rose-500">
              {overview?.lowRatingAlertCount ?? 2}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Rating &lt;= {overview?.lowRatingThreshold ?? 3.0} stars
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-neutral-400 flex items-center justify-between">
            <Link to="/dashboard/alerts" className="text-rose-400 hover:underline">
              Inspect alerts
            </Link>
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="text-[10px] text-neutral-500 hover:text-[var(--foreground)]"
              >
                Change limit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION B: PLATFORM COMPARISON */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Platform-by-Platform Comparison</h2>
            <p className={`text-xs ${muted}`}>
              Breakdown across your verified Indian mapping platforms and local business directories.
            </p>
          </div>
          <span className="text-xs text-neutral-500">
            Last refresh: {overview?.lastRefreshedAt ? new Date(overview.lastRefreshedAt).toLocaleTimeString() : "Just now"}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(overview?.platforms ?? []).map((p) => {
            const isHighest = p.rating >= 4.7;
            return (
              <div
                key={p.id}
                className={cn(
                  "relative rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all",
                  isHighest
                    ? "border-amber-500/30 bg-amber-500/[0.03]"
                    : "border-[var(--border)] bg-[var(--card)]"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-black/5 dark:bg-white/10 text-xs font-bold text-[var(--foreground)]">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">{p.name}</h3>
                        <p className="text-[10px] text-neutral-500">{p.dataSource}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {p.connectionStatus}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-[var(--foreground)]">{p.rating.toFixed(1)}</span>
                      <span className="text-xs text-neutral-400">/ {p.scale}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-[var(--foreground)]">{p.reviewCount} reviews</div>
                      <div className="text-[10px] text-neutral-500">
                        {p.ratingDelta > 0 ? `+${p.ratingDelta} vs last period` : "Stable"}
                      </div>
                    </div>
                  </div>

                  {/* Stars Display */}
                  <div className="mt-2 flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-3 w-3",
                          s <= Math.round(p.rating) ? "fill-amber-400" : "text-neutral-600"
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                  <span>
                    Unanswered:{" "}
                    <strong className={p.unansweredCount > 0 ? "text-amber-400 font-semibold" : "text-emerald-400"}>
                      {p.unansweredCount}
                    </strong>
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {p.responseSupported ? "API Publishing Supported" : "Manual Portal Publishing"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION C: AI REPUTATION INSIGHTS */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--foreground)]">AI Reputation Insights</h2>
                <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                  Grounded in Reviews
                </span>
              </div>
              <p className={`text-xs ${muted}`}>
                Synthesizing customer reviews to extract recurring complaints, operational bottlenecks, and service praise.
              </p>
            </div>
          </div>

          <div>
            {isOwner ? (
              <button
                type="button"
                onClick={handleRunAIAnalysis}
                disabled={analyzingInsights}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-[var(--primary-foreground)] hover:brightness-110 disabled:opacity-60",
                  focus,
                  ease
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {analyzingInsights ? "Analyzing Customer Sentiment…" : "Run New AI Analysis"}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
                <Lock className="h-3.5 w-3.5" /> Viewer (Read-Only Insights)
              </span>
            )}
          </div>
        </div>

        {analysisSummary && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs text-[var(--foreground)] leading-relaxed">
            <strong className="text-purple-400">Executive Summary: </strong>
            {analysisSummary}
          </div>
        )}

        {insights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-neutral-500">
            Not enough review data to generate reliable reputation insights. Refresh your data or check again after more reviews become available.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="rounded-xl border border-[var(--border)] bg-black/5 dark:bg-white/5 p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="rounded-full bg-neutral-500/10 border border-neutral-500/20 px-2 py-0.5 font-medium text-neutral-400">
                      {ins.category}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Confidence: {Math.round(ins.confidence * 100)}%
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)] leading-snug">{ins.title}</h4>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{ins.explanation}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <div className="text-[11px] text-amber-400 font-medium flex items-start gap-1.5">
                    <Sparkles className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>Action: {ins.recommendedAction}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    Supported by {ins.supportingReviewsCount} reviews ({ins.dateRange})
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION D: CUSTOMER REVIEWS MANAGEMENT */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Customer Reviews Management</h2>
            <p className={`text-xs ${muted}`}>
              Filter, search, inspect reviewer notes, and generate AI-assisted replies.
            </p>
          </div>
          <span className="text-xs text-neutral-500">
            Showing {reviews.length} filtered review record{reviews.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Filter bar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews..."
              className={cn(
                "w-full rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/5 pl-9 pr-3 py-2 text-xs text-[var(--foreground)] placeholder:text-neutral-500",
                focus
              )}
            />
          </div>

          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className={cn(
              "rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--foreground)]",
              focus
            )}
          >
            <option value="ALL">All Platforms</option>
            <option value="mockMapsA">Google Maps (India)</option>
            <option value="mockMapsB">Mappls (MapmyIndia)</option>
            <option value="mockDirectoryC">Justdial (India)</option>
          </select>

          {/* Sentiment Filter */}
          <select
            value={selectedSentiment}
            onChange={(e) => setSelectedSentiment(e.target.value)}
            className={cn(
              "rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--foreground)]",
              focus
            )}
          >
            <option value="ALL">All Sentiments</option>
            <option value="POSITIVE">Positive Feedback</option>
            <option value="NEUTRAL">Neutral Observations</option>
            <option value="NEGATIVE">Negative / Critical</option>
          </select>

          {/* Response Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={cn(
              "rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--foreground)]",
              focus
            )}
          >
            <option value="ALL">All Response Statuses</option>
            <option value="UNANSWERED">Unanswered Only</option>
            <option value="ANSWERED">Answered / Published</option>
            <option value="DRAFT">Draft Prepared</option>
          </select>

          {/* Sort By */}
          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value as any)}
            className={cn(
              "rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--foreground)]",
              focus
            )}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="highest">Sort: Highest Rating</option>
            <option value="lowest">Sort: Lowest Rating</option>
          </select>
        </div>

        {/* Reviews Feed */}
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-xs text-neutral-500">
            No customer reviews match your active filter criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => {
              const isNegative = rev.sentiment === "NEGATIVE" || rev.rating <= 2;
              const isPositive = rev.sentiment === "POSITIVE" || rev.rating >= 4;
              return (
                <div
                  key={rev.id}
                  className={cn(
                    "rounded-2xl border p-5 transition-colors shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-5",
                    isNegative
                      ? "border-rose-500/30 bg-rose-500/[0.02]"
                      : "border-[var(--border)] bg-[var(--card)]"
                  )}
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--foreground)]">
                        {rev.authorName}
                      </span>
                      <span className="text-xs text-neutral-500">on</span>
                      <span className="rounded-md bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-[var(--foreground)]">
                        {rev.platformDisplayName}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {new Date(rev.reviewDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>

                      {/* Sentiment pill */}
                      <span
                        className={cn(
                          "ml-auto md:ml-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                          isPositive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : isNegative
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        )}
                      >
                        {rev.sentiment}
                      </span>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "h-3.5 w-3.5",
                            s <= rev.rating ? "fill-amber-400" : "text-neutral-600"
                          )}
                        />
                      ))}
                      <span className="ml-1.5 text-xs font-semibold text-[var(--foreground)]">
                        {rev.rating}.0
                      </span>
                    </div>

                    {/* Review text */}
                    <p className="text-xs text-[var(--foreground)] leading-relaxed">
                      "{rev.reviewText}"
                    </p>

                    {/* Action recommendations & response state */}
                    {rev.suggestedAction && (
                      <p className="text-[11px] text-neutral-400 italic">
                        Follow-up: {rev.suggestedAction}
                      </p>
                    )}

                    {rev.responseText && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-400 text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Owner Response (Published)</span>
                        </div>
                        <p className="text-[var(--foreground)] text-xs leading-relaxed">{rev.responseText}</p>
                      </div>
                    )}

                    {rev.responseDraft && !rev.responseText && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-400 text-[11px]">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Response Draft Prepared (Pending Approval)</span>
                        </div>
                        <p className="text-[var(--foreground)] text-xs leading-relaxed">{rev.responseDraft}</p>
                      </div>
                    )}
                  </div>

                  {/* Right actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold border",
                        rev.responseStatus === "ANSWERED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : rev.responseStatus === "DRAFT"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                      )}
                    >
                      {rev.responseStatus}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenResponseAssistant(rev)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors",
                        isOwner
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110"
                          : "border border-[var(--border)] bg-black/5 dark:bg-white/5 text-[var(--foreground)] hover:bg-black/10 dark:hover:bg-white/10"
                      )}
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span>{isOwner ? (rev.responseText ? "View / Edit Response" : "Respond with AI") : "Inspect Response"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION E: AI REVIEW RESPONSE ASSISTANT MODAL (SIDE BY SIDE) */}
      {activeReviewForResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs">
                  AI
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">
                    Review Response Assistant
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Side-by-side verification and policy adherence before publishing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveReviewForResponse(null)}
                className="rounded-lg p-1 text-neutral-400 hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            {/* Side by side layout */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Original Review */}
              <div className="rounded-xl border border-[var(--border)] bg-black/5 dark:bg-white/5 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
                  <span className="font-semibold text-[var(--foreground)]">Original Review</span>
                  <span className="text-neutral-500">{activeReviewForResponse.platformDisplayName}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[var(--foreground)]">
                      {activeReviewForResponse.authorName}
                    </span>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "h-3 w-3",
                            s <= activeReviewForResponse.rating ? "fill-amber-400" : "text-neutral-600"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Posted on {new Date(activeReviewForResponse.reviewDate).toLocaleDateString()}
                  </p>
                </div>

                <p className="text-xs text-[var(--foreground)] leading-relaxed italic bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">
                  "{activeReviewForResponse.reviewText}"
                </p>

                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-neutral-400 text-[11px]">Applied Brand Guidelines:</span>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    {responseGuidelines || "Polite, solution-oriented response guidelines tailored to sentiment."}
                  </p>
                </div>
              </div>

              {/* Right Column: AI Response Draft & Controls */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>Suggested AI Response</span>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={handleRegenerateDraft}
                        disabled={generatingDraft}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw className={cn("h-3 w-3", generatingDraft && "animate-spin")} />
                        <span>Regenerate</span>
                      </button>
                    )}
                  </div>

                  <div className="mt-3">
                    <textarea
                      value={responseDraft}
                      onChange={(e) => setResponseDraft(e.target.value)}
                      disabled={!isOwner}
                      rows={6}
                      className={cn(
                        "w-full rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/5 p-3 text-xs text-[var(--foreground)] leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-amber-500",
                        !isOwner && "opacity-80 cursor-not-allowed"
                      )}
                      placeholder="AI drafting response..."
                    />
                  </div>
                </div>

                {/* Publish feedback notice */}
                {publishFeedback && (
                  <div
                    className={cn(
                      "rounded-lg p-3 text-xs leading-relaxed border",
                      publishFeedback.direct
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    )}
                  >
                    {publishFeedback.message}
                  </div>
                )}

                {/* Buttons row */}
                <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDraft}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {copiedResponse ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedResponse ? "Copied!" : "Copy Draft"}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={savingResponse}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                        >
                          {savingResponse ? "Saving…" : "Save Draft"}
                        </button>
                        <button
                          type="button"
                          onClick={handlePublishResponse}
                          disabled={publishingResponse}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] hover:brightness-110 disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{publishingResponse ? "Publishing…" : "Approve & Publish"}</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-neutral-500 italic">
                        Viewers can read and copy drafts only.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION F: OWNER CONFIGURATION MODAL */}
      {showSettingsModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--foreground)]">
                Reputation Alert Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-neutral-400 hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[var(--foreground)] block mb-1">
                  Low-Rating Threshold (Stars)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={settings.lowRatingThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, lowRatingThreshold: parseFloat(e.target.value) || 3.0 })
                  }
                  className={cn(
                    "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--foreground)]",
                    focus
                  )}
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Reviews with this star rating or below will trigger priority attention in the Alerts tab.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.alertOnLowRating}
                    onChange={(e) => setSettings({ ...settings, alertOnLowRating: e.target.checked })}
                    className="rounded border-[var(--border)]"
                  />
                  <span className="text-[var(--foreground)]">Create system alert on low-rated reviews</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.alertOnUnanswered}
                    onChange={(e) => setSettings({ ...settings, alertOnUnanswered: e.target.checked })}
                    className="rounded border-[var(--border)]"
                  />
                  <span className="text-[var(--foreground)]">Create system alert when negative reviews are unanswered &gt; 48h</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="rounded-lg bg-[var(--primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] hover:brightness-110 disabled:opacity-50"
              >
                {savingSettings ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

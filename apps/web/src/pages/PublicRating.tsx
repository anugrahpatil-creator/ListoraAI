import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Send,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  ThumbsUp,
  Share2,
} from "lucide-react";
import {
  fetchRatingSummary,
  submitReview,
  type RatingSummary,
  type SubmitReviewResult,
} from "../lib/api";
import ThemeTogglerDemo from "../components/ThemeToggler";
import { focus } from "../lib/styles";

export default function PublicRating() {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [accuracyScore, setAccuracyScore] = useState<number>(5);
  const [reliabilityScore, setReliabilityScore] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Impact feedback modal
  const [impactResult, setImpactResult] = useState<SubmitReviewResult | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await fetchRatingSummary();
      setSummary(data);
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim()) {
      setErrorMsg("Please provide your name.");
      return;
    }
    if (!comment.trim() || comment.trim().length < 5) {
      setErrorMsg("Please provide a short feedback review (at least 5 characters).");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await submitReview({
        authorName,
        authorEmail,
        rating,
        accuracyScore,
        reliabilityScore,
        comment,
      });

      setImpactResult(res);
      // Reset form
      setAuthorName("");
      setAuthorEmail("");
      setComment("");
      // Reload refreshed ratings
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const activeStar = hoverRating !== null ? hoverRating : rating;

  const starLabels: Record<number, string> = {
    1: "Inaccurate / Poor",
    2: "Needs Better Information",
    3: "Average Listing Accuracy",
    4: "Very Reliable & Accurate",
    5: "Flawless & Verified Information",
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--primary)] selection:text-[var(--primary-foreground)]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur px-6 md:px-[8vw]">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          <span className="text-[var(--border)]">|</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">ListoraAI Verified Directory</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Live Ratings
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className={`flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${focus}`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>{copiedShare ? "Link Copied!" : "Share Profile"}</span>
          </button>
          <ThemeTogglerDemo />
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        {/* Business Identity Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-10 shadow-sm">
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {summary?.publicity.tier || "Elite Gold Verified"}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Synced across Google Maps, Mappls & Justdial
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight md:text-4xl text-[var(--foreground)]">
                {summary?.publicity.businessName || "The Bombay Roastery & Café"}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  {summary?.publicity.address || "Indiranagar, Bengaluru, Karnataka 560038"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  Open Mon–Sat 07:00–22:00
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-500" />
                  +91 80 4123 4567
                </span>
              </div>
            </div>

            {/* Overall Score Box */}
            <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-center min-w-[170px]">
              <span className="text-4xl font-extrabold tracking-tight text-amber-500">
                {summary ? summary.overallRating.toFixed(1) : "4.9"}
              </span>
              <div className="flex items-center gap-1 mt-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <span className="mt-2 text-xs font-medium text-[var(--muted-foreground)]">
                {summary?.totalReviews ?? 4} Verified Ratings
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                99% Listing Consistency
              </span>
            </div>
          </div>
        </div>

        {/* Real-Time Viewer Impact Celebratory Card */}
        {impactResult && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 shadow-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-emerald-700 dark:text-emerald-300">
                    🎉 Real-Time Rating Impact Verified!
                  </h3>
                  <p className="mt-1 text-sm text-[var(--foreground)]">
                    {impactResult.message}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Previous Rating: <span className="font-mono">{impactResult.previousRating.toFixed(1)} ★</span> ➔ New Public Rating: <span className="font-mono font-bold text-amber-500">{impactResult.newRating.toFixed(1)} ★</span> ({impactResult.totalReviews} total reviews)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setImpactResult(null)}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/30 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Review Submission Form & Distribution Grid */}
        <div className="mt-10 grid gap-8 lg:grid-cols-12">
          {/* Left: Interactive Review Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  Rate Business & Listing Accuracy
                </h2>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Your rating helps travelers and visitors find accurate hours, addresses, and phone numbers. It actively impacts this business's verified publicity status!
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {/* Star Selector */}
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-2">
                    Overall Experience & Authenticity Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                        title={`${starVal} Star`}
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            starVal <= activeStar
                              ? "fill-amber-400 text-amber-400"
                              : "text-neutral-300 dark:text-neutral-700"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-3 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {starLabels[activeStar]}
                    </span>
                  </div>
                </div>

                {/* Sub-ratings: Listing Accuracy & Reliability */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] p-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--foreground)] mb-1">
                      Listing Information Accuracy
                    </label>
                    <p className="text-[10px] text-[var(--muted-foreground)] mb-2">
                      Did the address and phone match real life?
                    </p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAccuracyScore(v)}
                          className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                            accuracyScore === v
                              ? "bg-amber-500 text-white shadow-sm"
                              : "border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/10"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--foreground)] mb-1">
                      Hours & Contact Reliability
                    </label>
                    <p className="text-[10px] text-[var(--muted-foreground)] mb-2">
                      Were opening/closing hours verified?
                    </p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setReliabilityScore(v)}
                          className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                            reliabilityScore === v
                              ? "bg-amber-500 text-white shadow-sm"
                              : "border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/10"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                    Your Customer Review
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share how accurate the listing information was (e.g., 'Found on Google Maps, hours were accurate, easy to find!')..."
                    className={`w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm placeholder:text-[var(--muted-foreground)]/60 ${focus}`}
                  />
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="e.g. Rahul Mehta"
                      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]/60 ${focus}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                      Email Address <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={authorEmail}
                      onChange={(e) => setAuthorEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]/60 ${focus}`}
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs font-medium text-rose-500">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 active:scale-[0.99] transition-all disabled:opacity-50 ${focus}`}
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? "Verifying & Posting..." : "Submit Rating & Affect Public Score"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right: Rating Breakdown & Publicity Spotlight */}
          <div className="lg:col-span-5 space-y-6">
            {/* Score Breakdown Card */}
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
                Public Rating Breakdown
              </h3>

              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = summary?.distribution[stars] || 0;
                  const total = summary?.totalReviews || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={stars} className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 w-10 font-mono text-[var(--muted-foreground)]">
                        {stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </span>
                      <div className="relative h-2 flex-1 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-[var(--muted-foreground)]">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] p-3">
                  <span className="text-xs text-[var(--muted-foreground)]">Listing Accuracy</span>
                  <p className="text-lg font-bold text-[var(--foreground)] mt-0.5">
                    {summary?.accuracyAverage.toFixed(1) || "4.9"} / 5.0
                  </p>
                </div>
                <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] p-3">
                  <span className="text-xs text-[var(--muted-foreground)]">Contact Reliability</span>
                  <p className="text-lg font-bold text-[var(--foreground)] mt-0.5">
                    {summary?.reliabilityAverage.toFixed(1) || "4.8"} / 5.0
                  </p>
                </div>
              </div>
            </div>

            {/* Owner Publicity Spotlight Card */}
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Verified Publicity Badge
                </h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                Because of verified viewer feedback, this business earns the <strong>Top-Rated Publicity Badge</strong>, displayed on public search feeds and partner directories.
              </p>

              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  ★ {summary?.overallRating.toFixed(1) || "4.9"} Top-Rated Consistent Business
                </div>
                <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                  ListoraAI Verified Business Certificate
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Anti-fraud verified
                </span>
                <Link
                  to="/dashboard/publicity"
                  className="font-medium text-[var(--foreground)] hover:underline"
                >
                  Owner Publicity Hub ➔
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Recent Reviews Feed */}
        <section className="mt-14 border-t border-[var(--border)] pt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                Verified Customer Reviews & Feedback
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Real customer feedback verifying opening hours, location accuracy, and contact information.
              </p>
            </div>
            <span className="font-mono text-xs text-[var(--muted-foreground)]">
              {summary?.recentReviews.length || 0} reviews
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {summary?.recentReviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:border-black/20 dark:hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--foreground)]">
                      {rev.authorName}
                    </h4>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {new Date(rev.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= rev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-neutral-300 dark:text-neutral-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[var(--foreground)]/90">
                  "{rev.comment}"
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted-foreground)]">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified Listing Visitor
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> Helpful
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

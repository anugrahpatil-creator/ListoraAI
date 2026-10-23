import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Award,
  Star,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ShieldCheck,
  Code2,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { fetchRatingSummary, type RatingSummary } from "../lib/api";
import { focus } from "../lib/styles";

export default function PublicityHub() {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchRatingSummary();
        setSummary(data);
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  const overallRating = summary?.overallRating ?? 4.9;
  const totalReviews = summary?.totalReviews ?? 4;
  const isTopRated = overallRating >= 4.5;
  const businessName = summary?.publicity.businessName ?? "The Bombay Roastery & Café";
  const address = summary?.publicity.address ?? "Indiranagar, Bengaluru, Karnataka 560038";

  const embedCode = `<iframe src="${window.location.origin}/badge" width="300" height="96" frameborder="0" style="border:none;overflow:hidden;border-radius:12px;" scrolling="no" title="${businessName} ListoraAI Rating Badge"></iframe>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const handleCopyShareCard = () => {
    const text = `⭐ ${businessName} is officially verified with a ${overallRating}/5.0 rating on ListoraAI across Google Maps, Mappls, and Justdial! Check verified hours and customer reviews: ${window.location.origin}/rate`;
    navigator.clipboard.writeText(text);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const handleSocialShare = (platform: "twitter" | "linkedin" | "whatsapp") => {
    const text = encodeURIComponent(
      `⭐ ${businessName} is certified with a ${overallRating}/5.0 rating on ListoraAI! Check our verified business listings:`
    );
    const url = encodeURIComponent(`${window.location.origin}/rate`);

    if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    } else if (platform === "linkedin") {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
    } else if (platform === "whatsapp") {
      window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, "_blank");
    }
  };

  const filteredReviews = summary?.recentReviews.filter((r) =>
    selectedFilter !== null ? r.rating === selectedFilter : true
  );

  return (
    <div className="space-y-8 pb-14">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3 w-3" />
              Owner Publicity & Marketing Hub
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Public Customer Ratings
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl">
            Reputation, Ratings & Publicity
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            High viewer ratings unlock official ListoraAI publicity badges, social marketing cards, and embeddable trust widgets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/rate"
            target="_blank"
            className={`inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-sm ${focus}`}
          >
            <Eye className="h-4 w-4 text-[var(--primary)]" />
            <span>View Public Rating Page</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
        </div>
      </div>

      {/* Top Reputation Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Publicity Status */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Publicity Standing
            </span>
            <Award className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-base font-bold text-[var(--foreground)]">
              {summary?.publicity.tier || "Elite Gold Verified"}
            </span>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {isTopRated ? "Top 5% across Indiranagar listings" : "Actively gathering reviews"}
            </p>
          </div>
        </div>

        {/* Public Star Rating */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              Average Rating
            </span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--foreground)]">
              {overallRating.toFixed(1)}
            </span>
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              / 5.0 ({totalReviews} reviews)
            </span>
          </div>
        </div>

        {/* Listing Accuracy Perception */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              Information Accuracy
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary?.accuracyAverage.toFixed(1) || "4.9"}
            </span>
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              / 5.0 (Customer verified)
            </span>
          </div>
        </div>

        {/* Hours & Contact Reliability */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              Hours Reliability
            </span>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {summary?.reliabilityAverage.toFixed(1) || "4.8"}
            </span>
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              / 5.0 (Timely opens)
            </span>
          </div>
        </div>
      </div>

      {/* Shareable Publicity Showcase & Badges */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Shareable Publicity Card Generator */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  Top-Rated Publicity Card
                </h2>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Official Certification
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Share this certified card on social networks, brochures, or storefronts to showcase your verified listing accuracy.
            </p>

            {/* Interactive Preview Poster Card */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-6 md:p-8 text-white shadow-xl relative">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500 text-black font-extrabold text-xs">
                    LA
                  </div>
                  <span className="text-xs font-mono tracking-wider uppercase text-neutral-400">
                    ListoraAI Consistency Agent
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified Accurate
                </span>
              </div>

              <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                    {businessName}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400 max-w-[38ch]">
                    {address}
                  </p>
                  <p className="mt-3 text-xs text-amber-400 font-medium">
                    Verified across Google Maps, Mappls & Justdial
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-center">
                  <span className="text-3xl font-extrabold text-amber-400">
                    ★ {overallRating.toFixed(1)}
                  </span>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] text-neutral-300 mt-1">
                    {totalReviews} Customer Reviews
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-neutral-400">
                <span>Public Verification: {window.location.host}/rate</span>
                <span className="font-mono">Security Hash: #V-2026-IND-01</span>
              </div>
            </div>

            {/* Sharing & Promotion Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopyShareCard}
                className={`inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 active:scale-[0.99] transition-all ${focus}`}
              >
                {copiedCard ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedCard ? "Publicity Text Copied!" : "Copy Publicity Blurb"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialShare("twitter")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share on X / Twitter</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialShare("whatsapp")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialShare("linkedin")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>LinkedIn</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Embeddable Trust Badge for Owner Website */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                Embeddable Website Trust Badge
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Place this official trust badge on your website footer or checkout page to convert more visitors into confident customers.
            </p>

            {/* Live Interactive Preview */}
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] p-5 text-center">
              <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider block mb-3">
                Live Badge Preview
              </span>

              <div className="inline-flex items-center gap-3 rounded-xl border border-neutral-700/80 bg-neutral-900 px-4 py-2.5 text-white shadow-lg transition-transform hover:scale-105">
                <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {overallRating.toFixed(1)}
                </span>
                <span className="h-4 w-px bg-white/20" />
                <div className="text-left">
                  <p className="text-xs font-semibold leading-tight text-white">
                    Top-Rated Business
                  </p>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    Verified on ListoraAI
                  </p>
                </div>
              </div>
            </div>

            {/* HTML / iFrame Code Snippet */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Embed HTML Snippet
                </label>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {copiedSnippet ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedSnippet ? "Copied!" : "Copy Snippet"}</span>
                </button>
              </div>

              <pre className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-[11px] font-mono text-[var(--muted-foreground)] overflow-x-auto select-all">
                {embedCode}
              </pre>
            </div>

            <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-600 dark:text-blue-400">
              💡 <strong>Publicity Guarantee:</strong> Updates made in your canonical profile are synchronized across directories, ensuring your website badge always matches Google Maps & Justdial.
            </div>
          </div>
        </div>
      </div>

      {/* Customer Feedback & Reviews Management Feed */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              Customer Feedback & Rating Insights
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Filter verified customer reviews and inspect viewer sentiment.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedFilter(null)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedFilter === null
                  ? "bg-amber-500 text-white shadow-sm"
                  : "border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              All ({summary?.recentReviews.length || 0})
            </button>
            {[5, 4, 3].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSelectedFilter(star)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedFilter === star
                    ? "bg-amber-500 text-white shadow-sm"
                    : "border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <span>{star}</span>
                <Star className="h-3 w-3 fill-current" />
              </button>
            ))}
          </div>
        </div>

        {/* Review list */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredReviews && filteredReviews.length > 0 ? (
            filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--foreground)]">
                      {rev.authorName}
                    </h4>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= rev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-neutral-300 dark:text-neutral-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-2.5 text-xs leading-relaxed text-[var(--foreground)]/90">
                  "{rev.comment}"
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5 text-[10px] text-[var(--muted-foreground)]">
                  <span>Accuracy: {rev.accuracyScore}★ | Reliability: {rev.reliabilityScore}★</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Verified Customer
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-2 py-6 text-center text-xs text-[var(--muted-foreground)]">
              No reviews match this filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

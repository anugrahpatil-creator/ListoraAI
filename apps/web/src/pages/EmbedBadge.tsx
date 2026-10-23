import { useState, useEffect } from "react";
import { Star, ShieldCheck } from "lucide-react";
import { fetchRatingSummary } from "../lib/api";

export default function EmbedBadge() {
  const [rating, setRating] = useState<number>(4.9);
  const [reviewsCount, setReviewsCount] = useState<number>(4);
  const [businessName, setBusinessName] = useState<string>("The Bombay Roastery & Café");

  useEffect(() => {
    fetchRatingSummary().then((data) => {
      setRating(data.overallRating);
      setReviewsCount(data.totalReviews);
      setBusinessName(data.publicity.businessName);
    }).catch(() => {});
  }, []);

  return (
    <div className="m-0 p-2 flex items-center justify-center bg-transparent select-none font-sans">
      <a
        href="/rate"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-white shadow-xl hover:border-amber-500/50 transition-all text-decoration-none"
        title={`${businessName} — Verified ${rating} Star Rating on ListoraAI`}
      >
        <div className="flex flex-col items-center justify-center border-r border-neutral-700/80 pr-3">
          <div className="flex items-center gap-1 text-base font-extrabold text-amber-400">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
          </div>
          <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
            {reviewsCount} reviews
          </span>
        </div>

        <div className="text-left">
          <p className="text-xs font-bold leading-tight text-white group-hover:text-amber-400 transition-colors">
            Top-Rated Business
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] text-neutral-400 leading-tight">
              ListoraAI Verified
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}

import { StarIcon } from "@heroicons/react/24/solid";
import { STAR_COLORS, type RatingHistogram } from "./types";

function formatCompact(n: number) {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const STAR_ORDER = ["5", "4", "3", "2", "1"] as const;

function StarBreakdown({ histogram }: { histogram: RatingHistogram }) {
  const total = STAR_ORDER.reduce((sum, star) => sum + histogram[star], 0);
  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      {STAR_ORDER.map((star) => {
        const count = histogram[star];
        const pct = Math.round((count / total) * 100);
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-gray-400">{star}</span>
            <StarIcon className="size-3 text-amber-400 shrink-0" />
            <div className="flex-1 h-2 rounded-full bg-[#0d0f14] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: STAR_COLORS[star] }}
              />
            </div>
            <span className="w-9 text-right text-gray-400">{pct}%</span>
            <span className="w-16 text-right text-gray-500">{formatCompact(count)}</span>
          </div>
        );
      })}
    </div>
  );
}

type Props = {
  store: "ios" | "android";
  rating: number | null;
  ratingCount: number | null;
  ratingHistogram: RatingHistogram | null;
};

export function CurrentRatingCard({ store, rating, ratingCount, ratingHistogram }: Props) {
  const hasBreakdown = !!ratingHistogram && STAR_ORDER.some((star) => ratingHistogram[star] > 0);

  return (
    <div className="rounded-xl bg-[#1a1d24] p-5 ring-1 ring-white/[0.08]">
      <p className="text-sm font-medium text-gray-300 mb-4">Current rating</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-2xl font-bold text-white leading-none">
            {rating != null ? rating.toFixed(2) : "—"}
            <StarIcon className="size-4 text-amber-400" />
          </p>
          <p className="mt-1 text-xs text-gray-500">current average rating</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white leading-none">
            {ratingCount != null ? ratingCount.toLocaleString() : "—"}
          </p>
          <p className="mt-1 text-xs text-gray-500">total ratings</p>
        </div>
      </div>

      <div className="mt-4">
        {hasBreakdown ? (
          <StarBreakdown histogram={ratingHistogram!} />
        ) : (
          <p className="text-xs text-gray-600">
            {store === "ios"
              ? "Apple doesn’t publish a per-star breakdown for App Store ratings — only the average and total shown above are available."
              : "No per-star breakdown available for this app yet."}
          </p>
        )}
      </div>
    </div>
  );
}

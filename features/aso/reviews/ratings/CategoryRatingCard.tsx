import { ArrowUpIcon, ArrowDownIcon, StarIcon } from "@heroicons/react/24/solid";
import type { CategoryBenchmark } from "@/libs/contracts";

function formatCompact(n: number) {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function DeltaBadge({ value, avg }: { value: number; avg: number }) {
  if (avg === 0) return null;
  const diffPct = Math.round(((value - avg) / avg) * 100);
  if (Math.abs(diffPct) < 3) {
    return <span className="text-xs font-medium text-gray-500">on par with category</span>;
  }
  const up = diffPct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-400" : "text-amber-400"}`}>
      {up ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
      {Math.abs(diffPct)}% {up ? "above" : "below"} category avg
    </span>
  );
}

type Props = {
  rating: number | null;
  category: CategoryBenchmark;
};

export function CategoryRatingCard({ rating, category }: Props) {
  const categoryLabel = category?.genreName || "category";

  return (
    <div className="rounded-xl bg-[#1a1d24] p-5 ring-1 ring-white/[0.08]">
      <p className="text-sm font-medium text-gray-300 mb-4">My category ({categoryLabel})</p>

      {category ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-2xl font-bold text-white leading-none">
                {category.avgRating != null ? category.avgRating.toFixed(2) : "—"}
                <StarIcon className="size-4 text-amber-400" />
              </p>
              <p className="mt-1 text-xs text-gray-500">average rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">
                {category.medianRatingCount != null ? formatCompact(category.medianRatingCount) : "—"}
              </p>
              <p className="mt-1 text-xs text-gray-500">median ratings (top apps)</p>
            </div>
          </div>
          {rating != null && category.avgRating != null && (
            <div className="mt-3">
              <DeltaBadge value={rating} avg={category.avgRating} />
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-600">
          Category comparison isn&rsquo;t available for this app right now.
        </p>
      )}
    </div>
  );
}

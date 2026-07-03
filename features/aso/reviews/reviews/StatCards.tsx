import { StarIcon } from "@heroicons/react/24/solid";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";
import { STAR_COLORS, type ReviewStats } from "./types";

function DeltaChip({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
      {Math.abs(Math.round(pct))}%
    </span>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#1a1d24] p-5 ring-1 ring-white/[0.08] flex flex-col">
      <p className="text-sm font-medium text-gray-300 mb-3">{label}</p>
      {children}
    </div>
  );
}

const STAR_ORDER = ["5", "4", "3", "2", "1"] as const;

function StarDistributionBar({ histogram }: { histogram: ReviewStats["starDistribution"] }) {
  const total = STAR_ORDER.reduce((sum, star) => sum + histogram[star], 0);
  return (
    <div className="flex-1 flex items-center h-8 rounded-lg overflow-hidden bg-[#0d0f14]">
      {total === 0 ? (
        <span className="w-full text-center text-xs text-gray-600">No data</span>
      ) : (
        STAR_ORDER.map((star) => {
          const pct = (histogram[star] / total) * 100;
          if (pct === 0) return null;
          return <div key={star} style={{ width: `${pct}%`, backgroundColor: STAR_COLORS[star] }} className="h-full" />;
        })
      )}
    </div>
  );
}

type Props = { stats: ReviewStats };

export function StatCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard label="Avg Rating (New reviews)">
        <div className="flex items-center gap-3">
          <p className="flex items-center gap-1.5 text-2xl font-bold text-white leading-none">
            {stats.avgRating != null ? stats.avgRating.toFixed(1) : "—"}
            <StarIcon className="size-4 text-amber-400" />
          </p>
          <DeltaChip pct={stats.avgRatingDeltaPct} />
        </div>
      </StatCard>

      <StatCard label="Total New Reviews">
        <div className="flex items-center gap-3">
          <p className="text-2xl font-bold text-white leading-none">{stats.totalNew.toLocaleString()}</p>
          <DeltaChip pct={stats.totalNewDeltaPct} />
        </div>
      </StatCard>

      <StatCard label="Star distribution">
        <StarDistributionBar histogram={stats.starDistribution} />
      </StatCard>
    </div>
  );
}

"use client";

import { ArrowUpIcon, ArrowDownIcon, StarIcon } from "@heroicons/react/24/solid";
import { ExclamationTriangleIcon, InformationCircleIcon, DevicePhoneMobileIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import type { App, StoreData, CategoryBenchmark } from "@/libs/contracts";
import { countryFlag } from "@/libs/countries";
import { FollowButton } from "@/features/aso/AppHeader";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { FeatureLocked } from "@/features/subscription/FeatureLocked";
import { isPlanAtLeast } from "@/features/subscription/planTiers";

type Props = { app: App; storeData: StoreData; benchmark: CategoryBenchmark; daysSinceUpdate?: number };

// invert: for metrics where a lower value is the better outcome (e.g. days since
// last update), so "below category avg" reads as the positive/emerald state instead.
function DeltaBadge({ value, avg, invert = false }: { value: number; avg: number; invert?: boolean }) {
  if (avg === 0) return null;
  const diffPct = Math.round(((value - avg) / avg) * 100);
  if (Math.abs(diffPct) < 3) {
    return <span className="text-xs font-medium text-gray-500">on par with category</span>;
  }
  const up = diffPct > 0;
  const positive = invert ? !up : up;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-emerald-400" : "text-amber-400"}`}>
      {up ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
      {Math.abs(diffPct)}% {up ? "above" : "below"} category avg
    </span>
  );
}

function formatCompact(n: number) {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function LengthComparisonCard({
  title, value, avg, unit, invert = false, compact = false,
}: { title: string; value: number; avg?: number | null; unit: string; invert?: boolean; compact?: boolean }) {
  const fmt = compact ? formatCompact : (n: number) => n.toLocaleString();
  return (
    <BenchmarkCard title={title}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-white leading-none">{fmt(value)}</p>
          <p className="mt-1 text-xs text-gray-500">your app, {unit}</p>
        </div>
        {avg != null && (
          <div>
            <p className="text-2xl font-bold text-gray-400 leading-none">{fmt(avg)}</p>
            <p className="mt-1 text-xs text-gray-500">category avg</p>
          </div>
        )}
      </div>
      {avg != null && (
        <div className="mt-3">
          <DeltaBadge value={value} avg={avg} invert={invert} />
        </div>
      )}
    </BenchmarkCard>
  );
}

function RatingCard({ rating, avgRating }: { rating?: number; avgRating: number | null }) {
  return (
    <BenchmarkCard title="App rating">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-2xl font-bold text-white leading-none">
            {rating ? rating.toFixed(1) : "—"}
            <StarIcon className="size-4 text-amber-400" />
          </p>
          <p className="mt-1 text-xs text-gray-500">your app</p>
        </div>
        {avgRating !== null && (
          <div>
            <p className="flex items-center gap-1.5 text-2xl font-bold text-gray-400 leading-none">
              {avgRating.toFixed(1)}
              <StarIcon className="size-4 text-gray-500" />
            </p>
            <p className="mt-1 text-xs text-gray-500">category avg</p>
          </div>
        )}
      </div>
      {rating && avgRating !== null && (
        <div className="mt-3">
          <DeltaBadge value={rating} avg={avgRating} />
        </div>
      )}
    </BenchmarkCard>
  );
}

function BenchmarkCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col rounded-xl bg-[#1a1d24] p-5 ring-1 ring-white/[0.08]">
      <p className="text-sm font-medium text-gray-300 mb-4">{title}</p>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <main className="h-full flex items-center justify-center bg-[#111318] p-6">
      <div className="text-center max-w-sm">
        <ExclamationTriangleIcon className="size-8 text-gray-700 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="mt-1 text-xs text-gray-600">{message}</p>
      </div>
    </main>
  );
}

export default function MetadataBenchmark({ app, storeData, benchmark, daysSinceUpdate }: Props) {
  const planSlug = usePlanSlug();

  if (!isPlanAtLeast(planSlug, "pro_plus")) {
    return (
      <main className="flex flex-col h-full overflow-hidden bg-[#111318]">
        <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.07]">
          {app.icon_url && <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />}
          <p className="text-sm font-semibold text-white">{app.name}</p>
        </div>
        <FeatureLocked
          minPlan="pro_plus"
          icon={ChartBarIcon}
          title="Benchmark is a Pro+ feature"
          description="Upgrade to Pro+ or above to see how your metadata compares to your category."
          benefits={[
            "Compare your title, subtitle, and description length to category norms",
            "See how your rating and review count stack up against peers",
            "Spot gaps in screenshots, video, or localization versus competitors",
          ]}
        />
      </main>
    );
  }

  if (!storeData) {
    return (
      <EmptyState
        title="Couldn't load store data for this app"
        message="The app store listing may be temporarily unavailable. Try again in a moment."
      />
    );
  }

  const titleLength = (storeData.name || app.name).length;
  const subtitleLength = storeData.subtitle.length;
  const descriptionLength = storeData.description.length;
  const screenshotCount = storeData.screenshotUrls.length;
  const hasVideo = !!storeData.hasPreviewVideo;
  const categoryLabel = benchmark?.genreName || storeData.primaryGenreName || "category";

  return (
    <main className="flex flex-col h-full overflow-hidden bg-[#111318]">
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          {app.icon_url ? (
            <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="size-8 rounded-xl bg-[#0d0f14] shrink-0 flex items-center justify-center">
              <DevicePhoneMobileIcon className="size-4 text-gray-500" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{app.name}</p>
            <p className="text-xs text-gray-500 leading-tight">
              {app.store === "ios" ? "App Store" : "Google Play"}
              {app.country && <span className="ml-1.5">&middot; {countryFlag(app.country)} {app.country.toUpperCase()}</span>}
            </p>
          </div>
          <FollowButton app={app} />
        </div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm font-semibold text-white">Benchmark</h1>
          <InformationCircleIcon className="size-4 text-gray-500" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-xl font-semibold text-white">Metadata Benchmarks</h2>
        <p className="mt-1 text-sm text-gray-500">
          {benchmark
            ? `How ${app.name}'s metadata compares to ${benchmark.peerCount} other top ${categoryLabel} apps`
            : `${app.name}'s current metadata stats`}
        </p>

        {!benchmark && (
          <p className="mt-3 text-xs text-amber-400/80">
            Category comparison isn&rsquo;t available for this app right now &mdash; showing its own stats only.
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LengthComparisonCard title="Title length" value={titleLength} avg={benchmark?.avgTitleLength} unit="characters" />

          <LengthComparisonCard title="Subtitle length" value={subtitleLength} avg={benchmark?.avgSubtitleLength} unit="characters" />

          <LengthComparisonCard title="Description length" value={descriptionLength} avg={benchmark?.avgDescriptionLength} unit="characters" />

          <RatingCard rating={storeData.rating} avgRating={benchmark?.avgRating ?? null} />

          {storeData.ratingCount !== undefined && (
            <LengthComparisonCard
              title="Reviews"
              value={storeData.ratingCount}
              avg={benchmark?.medianRatingCount}
              unit="ratings"
              compact
            />
          )}

          {daysSinceUpdate !== undefined && (
            <LengthComparisonCard
              title="Last updated"
              value={daysSinceUpdate}
              avg={benchmark?.avgDaysSinceUpdate}
              unit="days since update"
              invert
            />
          )}

          {app.store === "ios" ? (
            <LengthComparisonCard
              title="Localization"
              value={storeData.languageCount ?? 0}
              avg={benchmark?.avgLanguageCount}
              unit="languages"
            />
          ) : (
            <BenchmarkCard title="Localization">
              <p className="text-xs text-gray-600">Not available for Android apps yet.</p>
            </BenchmarkCard>
          )}

          <LengthComparisonCard
            title="Preview video in category"
            value={hasVideo ? 100 : 0}
            avg={benchmark?.pctWithPreviewVideo}
            unit="% have a preview video"
          />

          <LengthComparisonCard title="Screenshots" value={screenshotCount} avg={benchmark?.avgScreenshotCount} unit="screenshots" />
        </div>
      </div>
    </main>
  );
}

"use client";

import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon } from "@heroicons/react/24/outline";
import type { App } from "@/libs/contracts";

type StoreData = {
  screenshotUrls: string[];
  subtitle: string;
  description: string;
  releaseNotes: string;
  rating?: number;
  ratingCount?: number;
  primaryGenreName: string;
  contentAdvisoryRating: string;
} | null;

export function IosStatusIcons({ className }: { className: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Cellular signal */}
      <svg viewBox="0 0 20 12" className="h-2.5 w-4" fill="currentColor">
        <rect x="0" y="7" width="3.2" height="5" rx="1" />
        <rect x="5.6" y="5" width="3.2" height="7" rx="1" />
        <rect x="11.2" y="3" width="3.2" height="9" rx="1" />
        <rect x="16.8" y="0" width="3.2" height="12" rx="1" />
      </svg>
      {/* WiFi */}
      <svg viewBox="0 0 24 24" className="h-3 w-3.5" fill="currentColor">
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
      </svg>
      {/* Battery */}
      <svg viewBox="0 0 25 13" className="h-3 w-6">
        <rect x="0.5" y="0.5" width="21" height="12" rx="3.5" stroke="currentColor" strokeOpacity="0.4" fill="none" />
        <rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor" />
        <rect x="22.5" y="4.5" width="1.6" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4" />
      </svg>
    </div>
  );
}

function ratingBars(avg: number): number[] {
  const five = Math.min(0.95, Math.max(0.15, ((avg - 1) / 4) * 0.85 + 0.1));
  const one = Math.min(0.4, Math.max(0.02, ((5 - avg) / 4) * 0.25));
  const two = one * 1.3;
  const remaining = 1 - five - one - two;
  const three = remaining * 0.28;
  const four = remaining * 0.72;
  return [five, four, three, two, one];
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── iOS App Store ────────────────────────────────────────────────────────────

function IosStarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) =>
        i <= Math.round(rating) ? (
          <StarSolid key={i} className="size-2.5 text-gray-400" />
        ) : (
          <StarIcon key={i} className="size-2.5 text-gray-600" />
        )
      )}
    </div>
  );
}

function IosPreview({ app, dark, storeData, videoUrl }: { app: App; dark: boolean; storeData: StoreData; videoUrl?: string | null }) {
  const bg = dark ? "bg-black" : "bg-white";
  const text = dark ? "text-white" : "text-black";
  const subtext = dark ? "text-gray-400" : "text-gray-500";
  const border = dark ? "border-gray-800" : "border-gray-200";
  const divider = dark ? "divide-gray-800" : "divide-gray-200";
  const cardBg = dark ? "bg-gray-900" : "bg-gray-50";
  const screenshotBg = dark ? "bg-gray-800" : "bg-gray-100";

  const screenshots = storeData?.screenshotUrls ?? [];
  const rating = storeData?.rating;
  const ratingCount = storeData?.ratingCount;
  const genre = storeData?.primaryGenreName ?? "App";
  const ageRating = storeData?.contentAdvisoryRating ?? "4+";
  const subtitle = storeData?.subtitle ?? app.bundle_id;
  const description = storeData?.description ?? "";
  const releaseNotes = storeData?.releaseNotes ?? "";
  const bars = rating !== undefined ? ratingBars(rating) : null;

  return (
    <div className={`relative mx-auto w-[400px] h-[860px] rounded-[44px] ring-[8px] shadow-2xl overflow-hidden flex-shrink-0 flex flex-col ${dark ? "ring-gray-700" : "ring-gray-300"} ${bg}`}>
      {/* Status bar */}
      <div className={`shrink-0 flex items-center justify-between px-7 pt-4 pb-1 text-xs font-semibold ${text}`}>
        <span>9:41</span>
        <IosStatusIcons className={text} />
      </div>

      {/* Nav bar */}
      <div className={`shrink-0 flex items-center justify-between px-5 py-2 ${bg}`}>
        <span className="text-blue-400 text-sm">‹ Search</span>
        <span className={`text-xs font-semibold ${subtext}`}>App Store</span>
        <span className="size-6" aria-hidden="true" />
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* App header */}
        <div className={`px-5 pb-4 ${bg}`}>
          <div className="flex items-start gap-3">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="size-20 rounded-[18px] shrink-0 object-cover shadow" />
            ) : (
              <div className="size-20 rounded-[18px] bg-gray-700 shrink-0 flex items-center justify-center">
                <DevicePhoneMobileIcon className="size-9 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0 pt-1">
              <p className={`text-base font-bold leading-tight ${text}`}>{app.name}</p>
              <p className={`text-xs mt-0.5 ${subtext}`}>{subtitle}</p>
              <div className="mt-3 flex items-center gap-2">
                <button className="rounded-lg bg-blue-500 px-5 py-1.5 text-sm font-bold text-white">GET</button>
                <span className={`text-[10px] ${subtext}`}>In-App Purchases</span>
              </div>
            </div>
          </div>
          <div className={`flex items-start mt-4 pt-3 border-t divide-x ${border} ${divider}`}>
            {rating !== undefined && (
              <div className="flex-1 flex flex-col items-center gap-0.5 pr-3">
                <span className={`text-xs font-bold ${text}`}>{rating.toFixed(1)}</span>
                <IosStarRating rating={rating} />
                <span className={`text-[10px] ${subtext}`}>{ratingCount ? formatCount(ratingCount) : "—"} Ratings</span>
              </div>
            )}
            <div className="flex-1 flex flex-col items-center gap-0.5 px-3">
              <span className={`text-xs font-bold ${text}`}>{ageRating}</span>
              <span className={`text-[10px] ${subtext}`}>Age</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 pl-3">
              <span className={`text-[10px] font-bold ${text} text-center leading-tight`}>{genre}</span>
              <span className={`text-[10px] ${subtext}`}>Category</span>
            </div>
          </div>
        </div>

        {/* Screenshots */}
        <div className={`px-4 pb-4 border-t ${border} pt-4 ${bg}`}>
          <div className="flex gap-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {videoUrl && (
              <video src={videoUrl} className="w-[150px] h-[280px] shrink-0 rounded-2xl object-cover" muted loop autoPlay playsInline />
            )}
            {screenshots.map((url, i) => (
              <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="w-[150px] h-[280px] shrink-0 rounded-2xl object-cover object-top" />
            ))}
            {screenshots.length === 0 && !videoUrl && [...Array(2)].map((_, i) => (
              <div key={i} className={`w-[150px] h-[280px] rounded-2xl shrink-0 ${screenshotBg}`} />
            ))}
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className={`px-5 pb-5 border-t ${border} pt-4 ${bg}`}>
            <p className={`text-xs leading-relaxed line-clamp-4 ${subtext}`}>{description}</p>
            <button className="mt-1 text-xs text-blue-400">more</button>
          </div>
        )}

        {/* What's New */}
        {releaseNotes && (
          <div className={`px-5 py-4 border-t ${border} ${bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-bold ${text}`}>What's New</p>
              <span className={`text-[10px] ${subtext}`}>Version history</span>
            </div>
            <p className={`text-xs leading-relaxed line-clamp-3 ${subtext}`}>{releaseNotes}</p>
            <button className="mt-1 text-xs text-blue-400">more</button>
          </div>
        )}

        {/* Ratings & Reviews */}
        {rating !== undefined && (
          <div className={`px-5 py-4 border-t ${border} ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-sm font-bold ${text}`}>Ratings & Reviews</p>
              <span className="text-xs text-blue-400">See All</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex flex-col items-center shrink-0">
                <span className={`text-5xl font-black leading-none ${text}`}>{rating.toFixed(1)}</span>
                <span className={`text-[10px] mt-1 ${subtext}`}>out of 5</span>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                {bars && bars.map((pct, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className={`text-[9px] w-2 text-right shrink-0 ${subtext}`}>{5 - i}</span>
                    <div className={`flex-1 h-1.5 rounded-full ${dark ? "bg-gray-800" : "bg-gray-200"}`}>
                      <div className="h-full rounded-full bg-gray-400" style={{ width: `${Math.round(pct * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {ratingCount && <p className={`text-right text-[10px] mb-3 ${subtext}`}>{formatCount(ratingCount)} Ratings</p>}
            <div className={`rounded-2xl p-4 ${cardBg}`}>
              <div className="flex items-start justify-between mb-1">
                <p className={`text-xs font-semibold ${text} truncate max-w-[60%]`}>Great app!</p>
                <span className={`text-[10px] ${subtext}`}>just now</span>
              </div>
              <div className="flex items-center gap-0.5 mb-2">
                {[1,2,3,4,5].map((i) => (
                  <StarSolid key={i} className={`size-2.5 ${i <= Math.round(rating) ? "text-yellow-400" : "text-gray-600"}`} />
                ))}
              </div>
              <p className={`text-[11px] leading-relaxed ${subtext}`}>This app is really helpful and easy to use. Highly recommend it!</p>
              <p className={`mt-2 text-[10px] ${subtext}`}>A user</p>
            </div>
          </div>
        )}

        {/* Developer */}
        <div className={`px-5 py-4 border-t ${border} ${bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-400">{app.bundle_id.split(".").slice(0, 2).join(".")}</p>
              <p className={`text-[10px] mt-0.5 ${subtext}`}>Developer</p>
            </div>
            <svg className={`size-3.5 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        <div className="h-4" />
      </div>

      {/* Tab bar */}
      <div className={`shrink-0 border-t ${border} ${bg}`}>
        <div className="flex items-end justify-around px-2 pt-2 pb-1">
          <div className={`flex flex-col items-center gap-0.5 ${subtext}`}>
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="5" width="22" height="20" rx="4" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M3 11h22" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M9 3v4M19 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <rect x="7" y="15" width="4" height="4" rx="1" fill="currentColor"/>
            </svg>
            <span className="text-[9px] font-medium">Today</span>
          </div>
          <div className={`flex flex-col items-center gap-0.5 ${subtext}`}>
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <path d="M6 14c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8z" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M11 14h6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="19.5" cy="12.5" r="1" fill="currentColor"/>
              <circle cx="19.5" cy="15.5" r="1" fill="currentColor"/>
            </svg>
            <span className="text-[9px] font-medium">Games</span>
          </div>
          <div className={`flex flex-col items-center gap-0.5 ${subtext}`}>
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <rect x="4" y="4" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="16" y="4" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="4" y="16" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="16" y="16" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
            <span className="text-[9px] font-medium">Apps</span>
          </div>
          <div className={`flex flex-col items-center gap-0.5 ${subtext}`}>
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <path d="M14 5l2.5 5.5H22l-4.5 3.5 1.7 5.5L14 16.5l-5.2 3 1.7-5.5L6 10.5h5.5L14 5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
            <span className="text-[9px] font-medium">Arcade</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-blue-400">
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M17.5 17.5l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className="text-[9px] font-semibold">Search</span>
          </div>
        </div>
        <div className="flex justify-center pb-2 pt-1">
          <div className={`w-28 h-1 rounded-full ${dark ? "bg-gray-600" : "bg-gray-300"}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Android / Google Play ────────────────────────────────────────────────────

function AndroidPreview({ app, dark, storeData, videoUrl }: { app: App; dark: boolean; storeData: StoreData; videoUrl?: string | null }) {
  const bg = dark ? "bg-[#1a1a1a]" : "bg-white";
  const text = dark ? "text-white" : "text-black";
  const subtext = dark ? "text-gray-400" : "text-gray-500";
  const border = dark ? "border-gray-800" : "border-gray-200";
  const cardBg = dark ? "bg-[#2a2a2a]" : "bg-gray-50";
  const screenshotBg = dark ? "bg-gray-800" : "bg-gray-100";
  const barTrack = dark ? "bg-gray-700" : "bg-gray-200";

  const screenshots = storeData?.screenshotUrls ?? [];
  const rating = storeData?.rating;
  const ratingCount = storeData?.ratingCount;
  const genre = storeData?.primaryGenreName ?? "App";
  const ageRating = storeData?.contentAdvisoryRating ?? "3+";
  const subtitle = storeData?.subtitle ?? "";
  const description = storeData?.description ?? "";
  const bars = rating !== undefined ? ratingBars(rating) : null;

  return (
    <div className={`relative mx-auto w-[400px] h-[860px] rounded-[32px] ring-[6px] shadow-2xl overflow-hidden flex-shrink-0 flex flex-col ${dark ? "ring-gray-600" : "ring-gray-300"} ${bg}`}>
      {/* Status bar */}
      <div className={`shrink-0 flex items-center justify-between px-5 pt-3 pb-1 text-xs font-medium ${text}`}>
        <span>12:30</span>
        <div className="flex items-center gap-1">
          {/* WiFi */}
          <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c5-5 13-5 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
          {/* Signal */}
          <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M1 1l22 22-1.41 1.41L17 18.83V23h-2v-4.17L4.41 8.41 1 5 2.41 3.59zm16.74.26L21 4.52l-2 2.01-2.44-2.44A9.96 9.96 0 0112 3C8.85 3 6 4.23 3.89 6.27L2 4.38C4.54 1.67 8.09 0 12 0c2.34 0 4.53.62 6.44 1.7zM12 6c1.9 0 3.6.76 4.85 1.99L15 9.84V9h-2v3l-4-4 1.15-1.15A5.97 5.97 0 0112 6zm0 6l2 2V15h-2v-3z"/></svg>
          {/* Battery */}
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
        </div>
      </div>

      {/* Nav bar */}
      <div className={`shrink-0 flex items-center justify-between px-4 py-2 ${bg}`}>
        <svg className={`size-5 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <div className="flex items-center gap-4">
          <svg className={`size-5 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <svg className={`size-5 ${subtext}`} fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
          </svg>
        </div>
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* App header */}
        <div className={`px-4 pb-4 ${bg}`}>
          <div className="flex items-start gap-4">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="size-24 rounded-2xl shrink-0 object-cover shadow" />
            ) : (
              <div className="size-24 rounded-2xl bg-gray-700 shrink-0 flex items-center justify-center">
                <DevicePhoneMobileIcon className="size-10 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0 pt-1">
              <p className={`text-xl font-bold leading-tight ${text}`}>{app.name}</p>
              <p className="text-sm text-green-400 mt-1">{app.bundle_id.split(".").slice(0, 2).join(".")}</p>
              {subtitle && <p className={`text-xs mt-1 leading-snug ${subtext}`}>{subtitle}</p>}
              <p className={`text-xs mt-0.5 ${subtext}`}>In-app purchases</p>
            </div>
          </div>

          {/* Stats row */}
          <div className={`flex items-center mt-4 pt-3 border-t ${border} divide-x ${dark ? "divide-gray-700" : "divide-gray-200"}`}>
            {rating !== undefined && (
              <div className="flex-1 flex flex-col items-center gap-0.5 pr-3">
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-bold ${text}`}>{rating.toFixed(1)}</span>
                  <StarSolid className="size-3.5 text-gray-400" />
                </div>
                <span className={`text-[10px] ${subtext}`}>{ratingCount ? formatCount(ratingCount) : "—"} reviews</span>
              </div>
            )}
            <div className="flex-1 flex flex-col items-center gap-0.5 px-3">
              <span className={`text-sm font-bold ${text}`}>N/A</span>
              <span className={`text-[10px] ${subtext}`}>Downloads</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 pl-3">
              <svg className={`size-5 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
              <span className={`text-[10px] ${subtext}`}>{ageRating}</span>
            </div>
          </div>

          {/* Install button */}
          <button className="mt-4 w-full rounded-full bg-[#01875f] py-3 text-sm font-bold text-white">
            Install
          </button>
        </div>

        {/* Screenshots */}
        <div className={`px-4 pb-4 border-t ${border} pt-4 ${bg}`}>
          <div className="flex gap-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {videoUrl && (
              <video src={videoUrl} className="w-[145px] h-[270px] shrink-0 rounded-xl object-cover" muted loop autoPlay playsInline />
            )}
            {screenshots.map((url, i) => (
              <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="w-[145px] h-[270px] shrink-0 rounded-xl object-cover object-top" />
            ))}
            {screenshots.length === 0 && !videoUrl && [...Array(3)].map((_, i) => (
              <div key={i} className={`w-[145px] h-[270px] rounded-xl shrink-0 ${screenshotBg}`} />
            ))}
          </div>
        </div>

        {/* About */}
        {description && (
          <div className={`px-4 py-4 border-t ${border} ${bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-bold ${text}`}>About this app</p>
              <svg className={`size-4 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
            <p className={`text-xs leading-relaxed line-clamp-3 ${subtext}`}>{description}</p>
            <span className={`inline-block mt-3 rounded-full border px-3 py-1 text-[11px] ${border} ${subtext}`}>{genre}</span>
          </div>
        )}

        {/* Ratings and reviews */}
        {rating !== undefined && (
          <div className={`px-4 py-4 border-t ${border} ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className={`text-sm font-bold ${text}`}>Ratings and reviews</p>
                <svg className={`size-3.5 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" strokeLinecap="round"/>
                </svg>
              </div>
              <svg className={`size-4 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>

            <div className="flex items-center gap-4 mb-3">
              <div className="flex flex-col items-center shrink-0">
                <span className={`text-5xl font-black leading-none ${text}`}>{rating.toFixed(1)}</span>
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                {bars && bars.map((pct, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-[9px] w-2 text-right shrink-0 ${subtext}`}>{5 - i}</span>
                    <div className={`flex-1 h-1.5 rounded-full ${barTrack}`}>
                      <div className="h-full rounded-full bg-[#01875f]" style={{ width: `${Math.round(pct * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {ratingCount && (
              <p className={`text-[10px] mb-3 ${subtext}`}>{formatCount(ratingCount)} reviews</p>
            )}

            {/* Review card */}
            <div className={`rounded-2xl p-4 ${cardBg}`}>
              <div className="flex items-start justify-between mb-2">
                <p className={`text-xs font-semibold ${text}`}>A user</p>
                <span className={`text-[10px] ${subtext}`}>just now</span>
              </div>
              <div className="flex items-center gap-0.5 mb-2">
                {[1,2,3,4,5].map((i) => (
                  <StarSolid key={i} className={`size-2.5 ${i <= Math.round(rating) ? "text-[#01875f]" : "text-gray-600"}`} />
                ))}
              </div>
              <p className={`text-[11px] leading-relaxed ${subtext}`}>This app is really helpful and easy to use. Highly recommend!</p>
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Android bottom nav */}
      <div className={`shrink-0 border-t ${border} ${bg} flex items-center justify-around px-8 py-3`}>
        {/* Back */}
        <svg className={`size-5 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        {/* Home */}
        <div className={`size-5 rounded-full border-2 ${dark ? "border-gray-500" : "border-gray-400"}`} />
        {/* Recents */}
        <div className={`size-4 rounded-sm border-2 ${dark ? "border-gray-500" : "border-gray-400"}`} />
      </div>
    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function PhonePreview({
  app,
  dark,
  storeData,
  videoUrl,
}: {
  app: App;
  dark: boolean;
  storeData: StoreData;
  videoUrl?: string | null;
}) {
  return (
    <div className="w-[520px] shrink-0 flex items-start justify-center overflow-y-auto p-8">
      {app.store === "android" ? (
        <AndroidPreview app={app} dark={dark} storeData={storeData} videoUrl={videoUrl} />
      ) : (
        <IosPreview app={app} dark={dark} storeData={storeData} videoUrl={videoUrl} />
      )}
    </div>
  );
}

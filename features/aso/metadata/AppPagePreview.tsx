"use client";

import { useState } from "react";
import {
  DevicePhoneMobileIcon,
  QuestionMarkCircleIcon,
  ClockIcon,
  EyeIcon,
  SunIcon,
  MoonIcon,
  Squares2X2Icon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import DashboardSidebar from "@/features/dashboard/DashboardSidebar";
import AppSwitcher from "@/features/aso/AppSwitcher";
import type { App, Workspace } from "@/libs/contracts";
import { COUNTRY_MAP, countryFlag } from "@/libs/countries";

type Tab = "text" | "visual" | "details";

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

type Props = {
  app: App;
  allApps: App[];
  workspaces: Workspace[];
  storeData: StoreData;
};

function CharBadge({ count, limit }: { count: number; limit: number }) {
  const ok = count <= limit;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"}`}>
      <span className={`size-1.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />
      {count} characters
    </span>
  );
}

function LiveSearch({ words }: { words: string[] }) {
  if (!words.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className="text-xs text-gray-600">Live search:</span>
      {words.map((w, i) => (
        <span key={i} className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-400 ring-1 ring-white/10">
          {w}
        </span>
      ))}
    </div>
  );
}

function MetadataSection({
  title,
  value,
  limit,
  placeholder,
  dark,
}: {
  title: string;
  value: string;
  limit: number;
  placeholder: string;
  dark: boolean;
}) {
  const words = value.trim() ? value.trim().split(/\s+/).slice(0, 12) : [];

  return (
    <div className="rounded-2xl bg-gray-800/40 ring-1 ring-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <QuestionMarkCircleIcon className="size-4 text-gray-600" />
        </div>
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <ClockIcon className="size-3.5" />
          Metadata history
        </button>
      </div>

      <div className={`relative rounded-xl p-3 ring-1 ring-white/10 ${dark ? "bg-gray-950" : "bg-gray-900"}`}>
        {value ? (
          <p className="text-sm text-white leading-relaxed">{value}</p>
        ) : (
          <p className="text-sm text-gray-600 italic">{placeholder}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <CharBadge count={value.length} limit={limit} />
          <EyeIcon className="size-4 text-gray-600 cursor-pointer hover:text-gray-400 transition-colors" />
        </div>
      </div>

      <LiveSearch words={words} />
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        i <= Math.round(rating)
          ? <StarSolid key={i} className="size-2.5 text-gray-400" />
          : <StarIcon key={i} className="size-2.5 text-gray-600" />
      ))}
    </div>
  );
}

function PhonePreview({ app, dark, storeData }: { app: App; dark: boolean; storeData: StoreData }) {
  const bg = dark ? "bg-black" : "bg-white";
  const text = dark ? "text-white" : "text-black";
  const subtext = dark ? "text-gray-400" : "text-gray-500";
  const border = dark ? "border-gray-800" : "border-gray-200";
  const screenshotBg = dark ? "bg-gray-800" : "bg-gray-100";

  const screenshots = storeData?.screenshotUrls ?? [];
  const rating = storeData?.rating;
  const ratingCount = storeData?.ratingCount;
  const genre = storeData?.primaryGenreName ?? (app.store === "ios" ? "App" : "App");
  const ageRating = storeData?.contentAdvisoryRating ?? "4+";
  const subtitle = storeData?.subtitle ?? app.bundle_id;
  const description = storeData?.description ?? "";

  function formatRatingCount(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className={`relative mx-auto w-[400px] rounded-[44px] ring-[8px] shadow-2xl overflow-hidden flex-shrink-0 ${dark ? "ring-gray-700" : "ring-gray-300"} ${bg}`}>
      {/* Status bar */}
      <div className={`flex items-center justify-between px-7 pt-4 pb-1 text-xs font-semibold ${text}`}>
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <span>▐▐▐▐</span>
          <span>WiFi</span>
          <span className="font-bold">⬤</span>
        </div>
      </div>

      {/* Nav bar */}
      <div className={`flex items-center justify-between px-5 py-2 ${bg}`}>
        <span className="text-blue-400 text-sm">‹ Search</span>
        <span className={`text-xs font-semibold ${subtext}`}>App Store</span>
        <button className="rounded-full bg-gray-700/60 p-1">
          <svg className="size-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

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

        {/* Stats row */}
        <div className={`flex items-start mt-4 pt-3 border-t divide-x ${border} ${dark ? "divide-gray-800" : "divide-gray-200"}`}>
          {rating !== undefined && (
            <div className="flex-1 flex flex-col items-center gap-0.5 pr-3">
              <span className={`text-xs font-bold ${text}`}>{rating.toFixed(1)}</span>
              <StarRating rating={rating} />
              <span className={`text-[10px] ${subtext}`}>{ratingCount ? formatRatingCount(ratingCount) : "—"} Ratings</span>
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
      <div className={`px-4 pb-4 ${bg}`}>
        <div className="flex gap-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {screenshots.length > 0
            ? screenshots.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  className="w-[150px] h-[280px] shrink-0 rounded-2xl object-cover object-top"
                />
              ))
            : [...Array(2)].map((_, i) => (
                <div key={i} className={`w-[150px] h-[280px] rounded-2xl shrink-0 ${screenshotBg}`} />
              ))}
        </div>
      </div>

      {/* Description snippet */}
      {description && (
        <div className={`px-5 pb-5 border-t ${border} pt-4 ${bg}`}>
          <p className={`text-xs leading-relaxed line-clamp-4 ${subtext}`}>{description}</p>
          <button className="mt-1 text-xs text-blue-400">more</button>
        </div>
      )}

      {/* Tab bar */}
      <div className={`border-t ${border} ${bg}`}>
        <div className="flex items-end justify-around px-2 pt-2 pb-1">
          {/* Today */}
          <div className={`flex flex-col items-center gap-0.5 ${subtext}`}>
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="5" width="22" height="20" rx="4" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M3 11h22" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M9 3v4M19 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <rect x="7" y="15" width="4" height="4" rx="1" fill="currentColor"/>
            </svg>
            <span className="text-[9px] font-medium">Today</span>
          </div>
          {/* Games */}
          <div className={`flex flex-col items-center gap-0.5 ${subtext}`}>
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <path d="M6 14c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8z" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M11 14h6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="19.5" cy="12.5" r="1" fill="currentColor"/>
              <circle cx="19.5" cy="15.5" r="1" fill="currentColor"/>
            </svg>
            <span className="text-[9px] font-medium">Games</span>
          </div>
          {/* Apps */}
          <div className={`flex flex-col items-center gap-0.5 ${subtext}`}>
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <rect x="4" y="4" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="16" y="4" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="4" y="16" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="16" y="16" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
            <span className="text-[9px] font-medium">Apps</span>
          </div>
          {/* Arcade */}
          <div className={`flex flex-col items-center gap-0.5 ${subtext}`}>
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <path d="M14 5l2.5 5.5H22l-4.5 3.5 1.7 5.5L14 16.5l-5.2 3 1.7-5.5L6 10.5h5.5L14 5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
            <span className="text-[9px] font-medium">Arcade</span>
          </div>
          {/* Search — active */}
          <div className="flex flex-col items-center gap-0.5 text-blue-400">
            <svg className="size-6" viewBox="0 0 28 28" fill="none">
              <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M17.5 17.5l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className="text-[9px] font-semibold">Search</span>
          </div>
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pb-2 pt-1">
          <div className={`w-28 h-1 rounded-full ${dark ? "bg-gray-600" : "bg-gray-300"}`} />
        </div>
      </div>
    </div>
  );
}

export default function AppPagePreview({ app, allApps, workspaces, storeData }: Props) {
  const [tab, setTab] = useState<Tab>("text");
  const [dark, setDark] = useState(true);
  const [previewMode, setPreviewMode] = useState<"phone" | "tablet">("phone");

  const tabs: { key: Tab; label: string }[] = [
    { key: "text", label: "App Text" },
    { key: "visual", label: "App Visual" },
    { key: "details", label: "App Details" },
  ];

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <DashboardSidebar
        currentPath="/dashboard/metadata/preview"
        workspaces={workspaces}
        activeWorkspaceId={app.workspace_id}
        activeAppId={app.id}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page header */}
        <div className="shrink-0 border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AppSwitcher current={app} apps={allApps} />
            </div>

            <div className="flex items-center gap-2">
              {app.country && (
                <span className="flex items-center gap-1.5 rounded-lg bg-gray-800 ring-1 ring-white/10 px-3 py-3.5 text-xs text-gray-300">
                  {countryFlag(app.country)} {COUNTRY_MAP[app.country] ?? app.country}
                </span>
              )}

              <div className="flex items-center gap-1 rounded-lg bg-gray-800 ring-1 ring-white/10 p-1.5">
                <button onClick={() => setPreviewMode("phone")} className={`rounded-md p-2 transition-colors ${previewMode === "phone" ? "bg-white/10 text-white" : "text-gray-500"}`}>
                  <DevicePhoneMobileIcon className="size-4" />
                </button>
                <button onClick={() => setPreviewMode("tablet")} className={`rounded-md p-2 transition-colors ${previewMode === "tablet" ? "bg-white/10 text-white" : "text-gray-500"}`}>
                  <Squares2X2Icon className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-gray-800 ring-1 ring-white/10 p-1.5">
                <button onClick={() => setDark(false)} className={`rounded-md p-2 transition-colors ${!dark ? "bg-white/10 text-white" : "text-gray-500"}`}>
                  <SunIcon className="size-4" />
                </button>
                <button onClick={() => setDark(true)} className={`rounded-md p-2 transition-colors ${dark ? "bg-white/10 text-white" : "text-gray-500"}`}>
                  <MoonIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: metadata fields */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-white/10">
            <div className="shrink-0 flex items-center justify-between px-6 border-b border-white/10">
              <div className="flex">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      tab === t.key
                        ? "border-indigo-500 text-white"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear all</button>
                <button className="rounded-lg bg-gray-800 ring-1 ring-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors">Search Preview</button>
                <button className="rounded-lg bg-gray-800 ring-1 ring-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors">Compare versions</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {tab === "text" && (
                <>
                  <MetadataSection title="App Name" value={app.name} limit={30} placeholder="Enter app name…" dark={dark} />
                  <MetadataSection title="App Subtitle" value={storeData?.subtitle ?? ""} limit={30} placeholder="Enter subtitle…" dark={dark} />
                  <MetadataSection title="Promotional Text" value="" limit={170} placeholder="Enter promotional text…" dark={dark} />
                  <MetadataSection title="Description" value={storeData?.description ?? ""} limit={4000} placeholder="Enter description…" dark={dark} />
                </>
              )}
              {tab === "visual" && (
                <div className="flex items-center justify-center h-48 rounded-2xl bg-gray-800/40 ring-1 ring-white/10">
                  <p className="text-sm text-gray-600">App Visual — coming soon</p>
                </div>
              )}
              {tab === "details" && (
                <div className="flex items-center justify-center h-48 rounded-2xl bg-gray-800/40 ring-1 ring-white/10">
                  <p className="text-sm text-gray-600">App Details — coming soon</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: phone preview */}
          <div className="w-[520px] shrink-0 flex items-start justify-center overflow-y-auto p-8">
            <PhonePreview app={app} dark={dark} storeData={storeData} />
          </div>
        </div>
      </div>
    </div>
  );
}

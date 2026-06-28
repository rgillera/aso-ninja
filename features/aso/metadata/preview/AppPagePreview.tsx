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
} from "@heroicons/react/24/outline";
import PhonePreview from "@/features/aso/metadata/preview/PhonePreview";
import type { App, Workspace, StoreData } from "@/libs/contracts";
import { COUNTRY_MAP, countryFlag } from "@/libs/countries";

type Tab = "text" | "visual" | "details";

type Props = {
  app: App;
  allApps: App[];
  workspaces?: Workspace[];
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
    <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <QuestionMarkCircleIcon className="size-4 text-gray-600" />
        </div>
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <ClockIcon className="size-3.5" />
          Metadata history
        </button>
      </div>

      {/* Inner content area */}
      <div className={`mx-4 mb-4 rounded-xl ring-1 ring-white/[0.06] ${dark ? "bg-[#0d0f14]" : "bg-[#13151b]"}`}>
        <div className="px-4 pt-3 pb-2 min-h-[60px]">
          {value ? (
            <p className="text-sm text-white leading-relaxed">{value}</p>
          ) : (
            <p className="text-sm text-gray-600 italic">{placeholder}</p>
          )}
        </div>
        <div className="flex items-center justify-between px-4 pb-3">
          <CharBadge count={value.length} limit={limit} />
          <EyeIcon className="size-4 text-gray-600 cursor-pointer hover:text-gray-400 transition-colors" />
        </div>
      </div>

      {words.length > 0 && (
        <div className="px-5 pb-4">
          <LiveSearch words={words} />
        </div>
      )}
    </div>
  );
}


export default function AppPagePreview({ app, storeData }: Props) {
  const [tab, setTab] = useState<Tab>("text");
  const [dark, setDark] = useState(true);
  const [previewMode, setPreviewMode] = useState<"phone" | "tablet">("phone");

  const tabs: { key: Tab; label: string }[] = [
    { key: "text", label: "App Text" },
    { key: "visual", label: "App Visual" },
    { key: "details", label: "App Details" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
        {/* Page header */}
        <div className="shrink-0 border-b border-white/[0.07] bg-[#111318] px-6 py-4">
          <div className="flex items-center justify-between">
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
            </div>

            <div className="flex items-center gap-2">
              {app.country && (
                <span className="flex items-center gap-1.5 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-3.5 text-xs text-gray-300">
                  {countryFlag(app.country)} {COUNTRY_MAP[app.country] ?? app.country}
                </span>
              )}

              <div className="flex items-center gap-1 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] p-1.5">
                <button onClick={() => setPreviewMode("phone")} className={`rounded-md p-2 transition-colors ${previewMode === "phone" ? "bg-white/10 text-white" : "text-gray-500"}`}>
                  <DevicePhoneMobileIcon className="size-4" />
                </button>
                <button onClick={() => setPreviewMode("tablet")} className={`rounded-md p-2 transition-colors ${previewMode === "tablet" ? "bg-white/10 text-white" : "text-gray-500"}`}>
                  <Squares2X2Icon className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] p-1.5">
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
          <div className="flex-1 flex flex-col overflow-hidden border-r border-white/[0.07]">
            <div className="shrink-0 flex items-center justify-between px-6 border-b border-white/[0.07] bg-[#111318]">
              <div className="flex">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
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
                <button className="rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors">Search Preview</button>
                <button className="rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors">Compare versions</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#111318]">
              {tab === "text" && (
                <>
                  <MetadataSection title="App Name" value={app.name} limit={30} placeholder="Enter app name…" dark={dark} />
                  <MetadataSection title="App Subtitle" value={storeData?.subtitle ?? ""} limit={30} placeholder="Enter subtitle…" dark={dark} />
                  <MetadataSection title="Promotional Text" value="" limit={170} placeholder="Enter promotional text…" dark={dark} />
                  <MetadataSection title="Description" value={storeData?.description ?? ""} limit={4000} placeholder="Enter description…" dark={dark} />
                </>
              )}
              {tab === "visual" && (
                <div className="flex items-center justify-center h-48 rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08]">
                  <p className="text-sm text-gray-600">App Visual — coming soon</p>
                </div>
              )}
              {tab === "details" && (
                <div className="flex items-center justify-center h-48 rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08]">
                  <p className="text-sm text-gray-600">App Details — coming soon</p>
                </div>
              )}
            </div>
          </div>

          <PhonePreview app={app} dark={dark} storeData={storeData} />
        </div>
      </div>
  );
}

"use client";

import { useState } from "react";
import {
  DevicePhoneMobileIcon,
  SunIcon,
  MoonIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import PhonePreview from "@/features/aso/metadata/preview/PhonePreview";
import AppTextPreview from "@/features/aso/metadata/preview/AppTextPreview";
import AppVisualPreview from "@/features/aso/metadata/preview/AppVisualPreview";
import SearchPreviewModal from "@/features/aso/metadata/preview/SearchPreviewModal";
import CompareVersionsModal from "@/features/aso/metadata/preview/CompareVersionsModal";
import type { App, Workspace, StoreData } from "@/libs/contracts";
import { COUNTRY_MAP, countryFlag } from "@/libs/countries";

type Tab = "text" | "visual";

type Props = {
  app: App;
  allApps: App[];
  workspaces?: Workspace[];
  storeData: StoreData;
};

export default function AppPagePreview({ app, storeData }: Props) {
  const [tab, setTab] = useState<Tab>("text");
  const [dark, setDark] = useState(true);
  const [previewMode, setPreviewMode] = useState<"phone" | "tablet">("phone");

  // Local, unsaved overrides for trying out new creatives against the live preview
  const [customIconUrl, setCustomIconUrl] = useState<string | null>(null);
  const [customScreenshotUrls, setCustomScreenshotUrls] = useState<string[]>([]);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [showSearchPreview, setShowSearchPreview] = useState(false);
  const [showCompareVersions, setShowCompareVersions] = useState(false);

  // Local, unsaved overrides for the editable text fields
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [subtitleOverride, setSubtitleOverride] = useState<string | null>(null);
  const [promoTextOverride, setPromoTextOverride] = useState("");
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(null);

  function handleClearAll() {
    if (customIconUrl) URL.revokeObjectURL(customIconUrl);
    customScreenshotUrls.forEach((url) => URL.revokeObjectURL(url));
    if (customVideoUrl) URL.revokeObjectURL(customVideoUrl);
    setCustomIconUrl(null);
    setCustomScreenshotUrls([]);
    setCustomVideoUrl(null);
    setNameOverride(null);
    setSubtitleOverride(null);
    setPromoTextOverride("");
    setDescriptionOverride(null);
  }

  function handleIconUpload(file: File) {
    const url = URL.createObjectURL(file);
    setCustomIconUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  function handleScreenshotUpload(files: FileList) {
    const urls = Array.from(files).map((file) => URL.createObjectURL(file));
    setCustomScreenshotUrls((prev) => [...prev, ...urls]);
  }

  function handleRemoveScreenshot(url: string) {
    setCustomScreenshotUrls((prev) => prev.filter((u) => u !== url));
    URL.revokeObjectURL(url);
  }

  function handleVideoUpload(file: File) {
    const url = URL.createObjectURL(file);
    setCustomVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  const previewApp: App = {
    ...app,
    icon_url: customIconUrl ?? app.icon_url,
    name: nameOverride ?? app.name,
  };

  const previewStoreData: StoreData = {
    screenshotUrls: [...customScreenshotUrls, ...(storeData?.screenshotUrls ?? [])],
    subtitle: subtitleOverride ?? storeData?.subtitle ?? "",
    description: descriptionOverride ?? storeData?.description ?? "",
    releaseNotes: storeData?.releaseNotes ?? "",
    rating: storeData?.rating,
    ratingCount: storeData?.ratingCount,
    primaryGenreName: storeData?.primaryGenreName ?? "",
    contentAdvisoryRating: storeData?.contentAdvisoryRating ?? "",
    version: storeData?.version,
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "text", label: "App Text" },
    { key: "visual", label: "App Visual" },
  ];

  return (
    <>
    <div className="h-full flex flex-col overflow-hidden">
        {/* Page header */}
        <div className="shrink-0 border-b border-white/[0.07] bg-[#111318] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {previewApp.icon_url ? (
                <img src={previewApp.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />
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
                <button onClick={handleClearAll} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear all</button>
                <button onClick={() => setShowSearchPreview(true)} className="rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors">Search Preview</button>
                <button onClick={() => setShowCompareVersions(true)} className="rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors">Compare versions</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#111318]">
              {tab === "text" && (
                <AppTextPreview
                  app={previewApp}
                  storeData={previewStoreData}
                  dark={dark}
                  promotionalText={promoTextOverride}
                  originalName={app.name}
                  originalSubtitle={storeData?.subtitle ?? ""}
                  originalDescription={storeData?.description ?? ""}
                  onNameChange={setNameOverride}
                  onSubtitleChange={setSubtitleOverride}
                  onPromotionalTextChange={setPromoTextOverride}
                  onDescriptionChange={setDescriptionOverride}
                />
              )}
              {tab === "visual" && (
                <AppVisualPreview
                  app={previewApp}
                  storeData={storeData}
                  onIconUpload={handleIconUpload}
                  customScreenshotUrls={customScreenshotUrls}
                  onScreenshotUpload={handleScreenshotUpload}
                  onRemoveScreenshot={handleRemoveScreenshot}
                  customVideoUrl={customVideoUrl}
                  onVideoUpload={handleVideoUpload}
                />
              )}
            </div>
          </div>

          <PhonePreview app={previewApp} dark={dark} storeData={previewStoreData} videoUrl={customVideoUrl} />
        </div>
      </div>

      {showSearchPreview && (
        <SearchPreviewModal app={previewApp} storeData={previewStoreData} onClose={() => setShowSearchPreview(false)} />
      )}
      {showCompareVersions && (
        <CompareVersionsModal
          currentApp={app}
          currentStoreData={storeData}
          yourApp={previewApp}
          yourStoreData={previewStoreData}
          yourVideoUrl={customVideoUrl}
          onClose={() => setShowCompareVersions(false)}
        />
      )}
    </>
  );
}

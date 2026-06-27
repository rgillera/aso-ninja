"use client";

import { useState, useRef, useEffect } from "react";
import { DevicePhoneMobileIcon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import DashboardSidebar from "@/features/dashboard/DashboardSidebar";
import type { App, Workspace } from "@/libs/contracts";
import { COUNTRY_MAP, countryFlag } from "@/libs/countries";

type Props = {
  app: App;
  allApps: App[];
  workspaces: Workspace[];
};

function StoreBadge({ store }: { store: App["store"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        store === "ios"
          ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
          : "bg-green-500/10 text-green-400 ring-green-500/20"
      }`}
    >
      {store === "ios" ? "App Store" : "Google Play"}
    </span>
  );
}

function AppIcon({ app, size = "sm" }: { app: App; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "size-16 rounded-2xl" : "size-8 rounded-xl";
  return app.icon_url ? (
    <img src={app.icon_url} alt={app.name} className={`${cls} shrink-0 object-cover`} />
  ) : (
    <div className={`${cls} bg-gray-700 shrink-0 flex items-center justify-center`}>
      <DevicePhoneMobileIcon className={size === "lg" ? "size-7 text-gray-500" : "size-4 text-gray-500"} />
    </div>
  );
}

function AppSwitcher({ current, apps }: { current: App; apps: App[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-xl bg-gray-800/50 ring-1 ring-white/10 px-4 py-2.5 hover:bg-gray-800 transition-colors"
      >
        <AppIcon app={current} size="sm" />
        <div className="text-left">
          <p className="text-sm font-semibold text-white leading-tight">{current.name}</p>
          <p className="text-xs text-gray-500 leading-tight">{current.store === "ios" ? "App Store" : "Google Play"}</p>
        </div>
        <ChevronDownIcon
          className={`size-4 text-gray-500 ml-1 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-xl bg-gray-900 ring-1 ring-white/10 shadow-xl overflow-hidden">
          <div className="p-1.5 max-h-72 overflow-y-auto">
            {apps.map((a) => (
              <a
                key={a.id}
                href={`/dashboard/apps/${a.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <AppIcon app={a} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {a.store === "ios" ? "App Store" : "Google Play"}
                    {a.country ? ` · ${a.country}` : ""}
                  </p>
                </div>
                {a.id === current.id && <CheckIcon className="size-4 text-indigo-400 shrink-0" />}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AsoReportPage({ app, allApps, workspaces }: Props) {
  const countryName = app.country ? (COUNTRY_MAP[app.country] ?? app.country) : null;

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <DashboardSidebar
        currentPath="/dashboard/report"
        workspaces={workspaces}
        activeWorkspaceId={app.workspace_id}
        activeAppId={app.id}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Top bar: app switcher + app meta */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex items-center gap-5">
              <AppIcon app={app} size="lg" />
              <div>
                <h1 className="text-2xl font-semibold text-white">{app.name}</h1>
                <p className="mt-0.5 text-sm text-gray-500">{app.bundle_id}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StoreBadge store={app.store} />
                  {countryName && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/5 text-gray-400 ring-1 ring-inset ring-white/10">
                      <span>{countryFlag(app.country!)}</span>
                      {countryName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {allApps.length > 1 && (
              <AppSwitcher current={app} apps={allApps} />
            )}
          </div>

          {/* Report sections — placeholder */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {["Visibility Score", "Keyword Rankings", "Ratings & Reviews"].map((title) => (
              <div
                key={title}
                className="rounded-2xl bg-gray-800/50 ring-1 ring-white/10 p-6"
              >
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <p className="mt-8 text-center text-sm text-gray-600">Coming soon</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

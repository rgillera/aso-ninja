"use client";

import { useState } from "react";
import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import DashboardSidebar from "@/features/dashboard/DashboardSidebar";
import AppSwitcher from "@/features/aso/AppSwitcher";
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

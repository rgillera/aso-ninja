"use client";

import { useState } from "react";
import { DevicePhoneMobileIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { App } from "@/libs/contracts";
import { COUNTRY_MAP, countryFlag } from "@/libs/countries";

export default function AppPicker({ apps, basePath }: { apps: App[]; basePath?: string }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? apps.filter(
        (a) =>
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.bundle_id.toLowerCase().includes(query.toLowerCase())
      )
    : apps;

  return (
    <div className="w-full max-w-md px-4">
      <h2 className="text-lg font-semibold text-white mb-1">Select an app</h2>
      <p className="text-sm text-gray-500 mb-4">Choose which app to view the ASO report for.</p>

      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 pointer-events-none" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps…"
          className="w-full rounded-lg bg-[#1a1d24] border border-white/[0.08] pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-600 py-10">No apps match &ldquo;{query}&rdquo;</p>
        ) : (
          filtered.map((app) => {
            const countryName = app.country ? (COUNTRY_MAP[app.country] ?? app.country) : null;
            return (
              <a
                key={app.id}
                href={basePath ? `/dashboard/apps/${app.id}/${basePath}` : `/dashboard/apps/${app.id}`}
                className="flex items-center gap-4 rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] p-4 hover:bg-[#22252f] shadow-lg shadow-black/20 transition-colors"
              >
                {app.icon_url ? (
                  <img
                    src={app.icon_url}
                    alt={app.name}
                    className="size-12 rounded-xl shrink-0 object-cover"
                  />
                ) : (
                  <div className="size-12 rounded-xl bg-[#0d0f14] shrink-0 flex items-center justify-center">
                    <DevicePhoneMobileIcon className="size-5 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{app.name}</p>
                  <p className="text-xs text-gray-500 truncate">{app.bundle_id}</p>
                  {countryName && (
                    <p className="mt-1 text-xs text-gray-600">
                      {countryFlag(app.country!)} {countryName}
                    </p>
                  )}
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}

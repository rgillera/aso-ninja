"use client";

import { useState } from "react";
import Link from "next/link";
import { DevicePhoneMobileIcon, ChevronLeftIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { countryFlag } from "@/libs/countries";
import { groupAppsByBundle, keywordCountLabel } from "@/libs/mobile-nav";

type PickerApp = {
  id: string;
  name: string;
  store: string;
  bundle_id: string;
  icon_url: string | null;
  country: string | null;
  keywordCount: number;
};

export function AppPicker({ workspaceId, apps }: { workspaceId: string; apps: PickerApp[] }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const groups = groupAppsByBundle(apps);

  return (
    <main className="mx-auto max-w-md">
      <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-4">
        <Link href="/mobile?switch=1" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
          <ChevronLeftIcon className="size-3.5" />
          Workspaces
        </Link>
      </header>

      <p className="px-4 pt-4 pb-2 text-xs text-gray-600">Pick an app to view its keyword rankings</p>

      <ul className="divide-y divide-white/[0.06]">
        {groups.map((group) => {
          const { primary, entries, key } = group;
          const multiCountry = entries.length > 1;
          const expanded = expandedKey === key;

          const icon = primary.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primary.icon_url} alt="" className="size-9 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
              <DevicePhoneMobileIcon className="size-4 text-gray-500" />
            </div>
          );

          return (
            <li key={key}>
              {multiCountry ? (
                <button
                  onClick={() => setExpandedKey(expanded ? null : key)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/[0.04]"
                >
                  {icon}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-200">{primary.name}</p>
                    <p className="text-xs text-gray-600">
                      {primary.store === "ios" ? "App Store" : "Google Play"} · {entries.length} countries
                    </p>
                  </div>
                  <ChevronDownIcon className={`size-4 shrink-0 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
              ) : (
                <Link
                  href={`/mobile/${workspaceId}/${primary.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.04]"
                >
                  {icon}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-200">{primary.name}</p>
                    <p className="text-xs text-gray-600">
                      {primary.store === "ios" ? "App Store" : "Google Play"}
                      {primary.country ? ` · ${countryFlag(primary.country)} ${primary.country}` : ""}
                      {` · ${keywordCountLabel(primary.keywordCount)}`}
                    </p>
                  </div>
                </Link>
              )}

              {multiCountry && expanded && (
                <ul className="bg-black/20">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <Link
                        href={`/mobile/${workspaceId}/${entry.id}`}
                        className="flex items-center gap-2 py-2.5 pl-16 pr-4 text-sm text-gray-300 active:bg-white/[0.04]"
                      >
                        {entry.country && <span className="text-base leading-none">{countryFlag(entry.country)}</span>}
                        <span>{entry.country}</span>
                        <span className="ml-auto text-xs text-gray-600">{keywordCountLabel(entry.keywordCount)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

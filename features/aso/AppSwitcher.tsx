"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DevicePhoneMobileIcon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { App } from "@/libs/contracts";

function AppIcon({ app }: { app: App }) {
  return app.icon_url ? (
    <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl shrink-0 object-cover" />
  ) : (
    <div className="size-8 rounded-xl bg-[#0d0f14] shrink-0 flex items-center justify-center">
      <DevicePhoneMobileIcon className="size-4 text-gray-500" />
    </div>
  );
}

export default function AppSwitcher({ current, apps }: { current: App; apps: App[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Extract sub-path after /dashboard/apps/[id]/  e.g. "preview", "timeline", ""
  const subPath = pathname.replace(/^\/dashboard\/apps\/[^/]+\/?/, "");

  function buildHref(appId: string) {
    return subPath ? `/dashboard/apps/${appId}/${subPath}` : `/dashboard/apps/${appId}`;
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const canSwitch = apps.length > 1;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => canSwitch && setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] px-4 py-2.5 transition-colors shadow-lg shadow-black/20 hover:bg-[#22252f]"
      >
        <AppIcon app={current} />
        <div className="text-left">
          <p className="text-sm font-semibold text-white leading-tight">{current.name}</p>
          <p className="text-xs text-gray-500 leading-tight">
            {current.store === "ios" ? "App Store" : "Google Play"}
          </p>
        </div>
        {canSwitch && (
          <ChevronDownIcon
            className={`size-4 text-gray-500 ml-1 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-xl shadow-black/30 overflow-hidden">
          <div className="p-1.5 max-h-72 overflow-y-auto">
            {apps.map((a) => (
              <a
                key={a.id}
                href={buildHref(a.id)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.05] transition-colors"
              >
                <AppIcon app={a} />
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

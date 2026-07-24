"use client";

import { useEffect, useState } from "react";
import { countryFlag } from "@/libs/countries";
import { isIosDevice, isStandaloneDisplay } from "@/features/mobile/pwa-install";
import { enableAppAlerts, disableAppAlerts } from "@/features/mobile/push-subscription";

export type NotificationSettingsApp = {
  id: string;
  name: string;
  country: string | null;
  workspaceName: string;
  enabled: boolean;
};

export function NotificationSettingsList({ apps }: { apps: NotificationSettingsApp[] }) {
  const [enabledIds, setEnabledIds] = useState(
    () => new Set(apps.filter((a) => a.enabled).map((a) => a.id))
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [needsInstall, setNeedsInstall] = useState(false);

  // iOS only exposes the Push API once the app's been added to the home
  // screen — distinguishes "not installed yet" from a genuinely unsupported
  // browser, so the message can actually tell you what to do about it.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      setNeedsInstall(isIosDevice() && !isStandaloneDisplay());
    }
  }, []);

  async function toggle(appId: string) {
    const enabling = !enabledIds.has(appId);
    setBusyId(appId);
    try {
      if (enabling) await enableAppAlerts(appId);
      else await disableAppAlerts(appId);
      setEnabledIds((prev) => {
        const next = new Set(prev);
        if (enabling) next.add(appId);
        else next.delete(appId);
        return next;
      });
    } finally {
      setBusyId(null);
    }
  }

  if (!supported) {
    return (
      <p className="px-4 py-8 text-center text-sm text-gray-500">
        {needsInstall
          ? "Add this app to your home screen to enable notifications."
          : "Push notifications aren’t supported in this browser."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.06]">
      {apps.map((app) => {
        const enabled = enabledIds.has(app.id);
        return (
          <li key={app.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-200">
                {app.name}
                {app.country ? ` ${countryFlag(app.country)} ${app.country}` : ""}
              </p>
              <p className="truncate text-xs text-gray-600">{app.workspaceName}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`Rank-change alerts for ${app.name}${app.country ? ` (${app.country})` : ""}`}
              disabled={busyId === app.id}
              onClick={() => toggle(app.id)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                enabled ? "bg-indigo-500" : "bg-white/[0.12]"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

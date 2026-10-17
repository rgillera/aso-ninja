"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { ClockIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { countryFlag } from "@/libs/countries";
import { setActiveAppAction } from "@/features/app/actions";
import type { App, WorkspaceRole } from "@/libs/contracts";

// Re-shows a dismissed notice after this long, so it's seen again before the
// grace period ends.
const DISMISS_MS = 24 * 60 * 60 * 1000;

function dismissKey(workspaceId: string) {
  return `aso_app_limit_notice_dismissed_${workspaceId}`;
}

function readDismissed(workspaceId: string): boolean {
  try {
    const at = Number(localStorage.getItem(dismissKey(workspaceId)));
    return !!at && Date.now() - at < DISMISS_MS;
  } catch {
    // Storage unavailable: just keep showing the notice.
    return false;
  }
}

const noopSubscribe = () => () => {};

// The app reconcile_app_limits would keep: latest pin, else the oldest row.
function keptApp(apps: App[]): App | undefined {
  const pinned = apps
    .filter((a) => a.pinned_at)
    .sort((a, b) => (b.pinned_at ?? "").localeCompare(a.pinned_at ?? ""))[0];
  return pinned ?? [...apps].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
}

// Shown on Free workspaces that tracked more than one app (or country) when
// the Free plan dropped to 1, while their grace period is still running. See
// supabase/migrations/20261017000002_free_app_limit_grace.sql.
export function AppLimitNotice({
  workspaceId,
  graceUntil,
  apps,
  role,
}: {
  workspaceId: string;
  graceUntil: string;
  apps: App[];
  role: WorkspaceRole | undefined;
}) {
  const storedDismissed = useSyncExternalStore(noopSubscribe, () => readDismissed(workspaceId), () => false);
  const [dismissed, setDismissed] = useState(false);
  const [selectedId, setSelectedId] = useState(() => keptApp(apps)?.id ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (dismissed || storedDismissed) return null;

  const canChoose = role === "owner" || role === "admin";
  const date = new Date(graceUntil).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const sorted = [...apps].sort((a, b) => a.name.localeCompare(b.name) || (a.country ?? "").localeCompare(b.country ?? ""));

  function choose(appId: string) {
    setSelectedId(appId);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await setActiveAppAction(appId);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-amber-500/5 ring-1 ring-amber-500/20 px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
        <ClockIcon className="size-5 text-amber-500 light:text-amber-700" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white light:text-gray-900">
          From {date}, the Free plan covers 1 app in 1 country
        </p>
        <p className="text-xs text-gray-400 light:text-gray-600">
          You&apos;re tracking {apps.length} apps and countries. They all keep updating until {date}. After that, only the one
          you choose keeps updating. The others stay saved and resume as soon as you upgrade.
        </p>

        {canChoose ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="app-limit-keep" className="text-xs text-gray-400 light:text-gray-600">
              Keep updating:
            </label>
            <select
              id="app-limit-keep"
              value={selectedId}
              disabled={isPending}
              onChange={(e) => choose(e.target.value)}
              className="rounded-lg bg-[#1a1d24] light:bg-white px-2.5 py-1.5 text-xs text-gray-200 light:text-gray-800 ring-1 ring-white/[0.08] light:ring-black/[0.08] disabled:opacity-60"
            >
              {sorted.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {countryFlag(a.country ?? "")} {(a.country ?? "").toUpperCase()}
                </option>
              ))}
            </select>
            {isPending && <span className="text-xs text-gray-500">Saving...</span>}
            {saved && !isPending && <span className="text-xs text-emerald-500 light:text-emerald-700">Saved</span>}
            {error && <span className="text-xs text-red-400/80 light:text-red-600">{error}</span>}
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">Ask a workspace owner or admin to choose which app keeps updating.</p>
        )}
      </div>

      <Link
        href="/dashboard/subscription"
        className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-400"
      >
        Keep all with Pro
      </Link>

      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(dismissKey(workspaceId), String(Date.now()));
          } catch {
            // Storage unavailable: dismiss for this page view only.
          }
          setDismissed(true);
        }}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:text-gray-300 light:hover:text-gray-700 hover:bg-white/[0.06] light:hover:bg-black/[0.05] transition-colors"
        title="Dismiss"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";

function dismissKey(workspaceId: string) {
  return `aso_trial_banner_dismissed_${workspaceId}`;
}

export function TrialBanner({ workspaceId, trialDays }: { workspaceId: string; trialDays: number }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(dismissKey(workspaceId)) === "1") setDismissed(true);
  }, [workspaceId]);

  if (dismissed) return null;

  return (
    <div className="mx-6 mt-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 ring-1 ring-indigo-500/20 px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15">
        <SparklesIcon className="size-5 text-indigo-400" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Try Pro free for {trialDays} days</p>
        <p className="text-xs text-gray-400">Unlock more apps, keywords, and ranking monitoring — no charge until your trial ends.</p>
      </div>

      <Link
        href="/dashboard/subscription"
        className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-400"
      >
        See plans
      </Link>

      <button
        type="button"
        onClick={() => {
          localStorage.setItem(dismissKey(workspaceId), "1");
          setDismissed(true);
        }}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
        title="Dismiss"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

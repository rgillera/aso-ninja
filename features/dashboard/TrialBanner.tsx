"use client";

import { useState, useTransition } from "react";
import { RocketLaunchIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { startProTrialAction } from "@/features/subscription/actions";

// Opt-in Pro trial for Free users who never had the signup one. When it
// shows is decided by PromoBanner.
export function TrialBanner({ onStarted, onDismiss }: { onStarted: () => void; onDismiss: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startProTrialAction();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onStarted();
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 ring-1 ring-indigo-500/20 px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15">
        <RocketLaunchIcon className="size-5 text-indigo-400 light:text-indigo-600" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white light:text-gray-900">Try Pro free for 7 days. No credit card required.</p>
        <p className="text-xs text-gray-400 light:text-gray-600">
          {error ?? "Unlock the Keyword Inspector, Long Tail Keywords and more competitors. You move back to Free automatically when it ends."}
        </p>
      </div>

      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-60"
      >
        {pending ? "Starting..." : "Start free trial"}
      </button>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:text-gray-300 light:hover:text-gray-700 hover:bg-white/[0.06] light:hover:bg-black/[0.05] transition-colors"
        title="Dismiss"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

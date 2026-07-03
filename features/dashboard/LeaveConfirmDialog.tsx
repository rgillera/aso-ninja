"use client";

import { useEffect, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type Props = {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LeaveConfirmDialog({ message, onCancel, onConfirm }: Props) {
  // Leaving is a hard page navigation (full reload), which takes a beat —
  // show immediate feedback so the click doesn't read as unresponsive.
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!leaving && e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, leaving]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={leaving ? undefined : onCancel} />

      <div className="relative w-full max-w-md rounded-2xl bg-gray-900 ring-1 ring-white/10 shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="shrink-0 flex size-9 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
            <ExclamationTriangleIcon className="size-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Leave this page?</h2>
            <p className="mt-1 text-sm text-gray-400">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={leaving}
            autoFocus
            className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={() => { setLeaving(true); onConfirm(); }}
            disabled={leaving}
            className="flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-70 disabled:cursor-wait transition-colors"
          >
            {leaving && <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {leaving ? "Leaving…" : "Leave anyway"}
          </button>
        </div>
      </div>
    </div>
  );
}

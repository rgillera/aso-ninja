"use client";

import { useEffect, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const REASONS = [
  "Too expensive",
  "Missing features I need",
  "Not using it enough",
  "Switching to another tool",
  "Technical issues or bugs",
  "Other",
];

type Props = {
  onCancel: () => void;
  onConfirm: (reason: string, recommendation: string) => void;
};

export function DowngradeConfirmDialog({ onCancel, onConfirm }: Props) {
  const [step, setStep] = useState<"ask" | "survey">("ask");
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [recommendation, setRecommendation] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!confirming && e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, confirming]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={confirming ? undefined : onCancel} />

      <div className="relative w-full max-w-md rounded-2xl bg-gray-900 ring-1 ring-white/10 shadow-2xl p-6">
        {step === "ask" ? (
          <>
            <div className="flex items-start gap-3 mb-5">
              <div className="shrink-0 flex size-9 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                <ExclamationTriangleIcon className="size-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Move to the Free plan?</h2>
                <p className="mt-1 text-sm text-gray-400">
                  You&apos;ll keep your current plan&apos;s access until the end of this billing period, then your
                  subscription will be canceled.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                autoFocus
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                Keep my plan
              </button>
              <button
                type="button"
                onClick={() => setStep("survey")}
                className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
              >
                Yes, move to Free
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-5">
              <div className="shrink-0 flex size-9 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                <ExclamationTriangleIcon className="size-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Before you go…</h2>
                <p className="mt-1 text-sm text-gray-400">Help us understand why, so we can improve.</p>
              </div>
            </div>

            <div className="space-y-4">
              <fieldset>
                <legend className="text-sm font-medium text-gray-300 mb-2">Why are you leaving?</legend>
                <div className="space-y-1.5">
                  {REASONS.map((r) => (
                    <label key={r} className="flex items-center gap-2.5 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        disabled={confirming}
                        className="size-3.5 border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="cancel-recommendation" className="text-sm font-medium text-gray-300">
                  Any recommendations for us?
                </label>
                <textarea
                  id="cancel-recommendation"
                  rows={3}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  disabled={confirming}
                  placeholder="Optional"
                  className="mt-2 w-full resize-none rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-gray-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5">
              <button
                type="button"
                onClick={() => setStep("ask")}
                disabled={confirming}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(true);
                  onConfirm(reason, recommendation.trim());
                }}
                disabled={confirming || !reason}
                className="flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-70 disabled:cursor-wait disabled:hover:bg-red-500/90 transition-colors"
              >
                {confirming && (
                  <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {confirming ? "Canceling…" : "Yes, I'm sure — downgrade"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

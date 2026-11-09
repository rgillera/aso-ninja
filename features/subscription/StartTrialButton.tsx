"use client";

import { useState, useTransition } from "react";
import { createCheckoutSessionAction, startProTrialAction } from "./actions";

// Pro card's CTA for a Free owner who can still claim the opt-in 7-day trial
// (can_start_pro_trial). The trial is the main action; paying straight away
// stays one click away as a text link. Same white-on-indigo button as
// UpgradeButton's "featured" tone, since it only sits on the Pro card.
export function StartTrialButton({ workspaceId, billing }: { workspaceId: string; billing: "monthly" | "yearly" }) {
  const [pending, setPending] = useState<"trial" | "checkout" | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startTrial() {
    setError(null);
    setPending("trial");
    startTransition(async () => {
      const result = await startProTrialAction();
      if ("error" in result) {
        setError(result.error);
        setPending(null);
        return;
      }
      // Full reload: the dashboard shell holds plan and trial state in
      // client state seeded on load, so a soft refresh wouldn't unlock Pro.
      window.location.reload();
    });
  }

  function upgrade() {
    setError(null);
    setPending("checkout");
    startTransition(async () => {
      const result = await createCheckoutSessionAction("pro", workspaceId, billing);
      if ("error" in result) {
        setError(result.error);
        setPending(null);
        return;
      }
      if ("url" in result) window.location.href = result.url;
    });
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={!!pending || !workspaceId}
        onClick={startTrial}
        className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-60"
      >
        {pending === "trial" ? "Starting..." : "Start free trial"}
      </button>
      <p className="mt-2 text-center text-xs text-indigo-100">
        No credit card required.{" "}
        <button
          type="button"
          disabled={!!pending || !workspaceId}
          onClick={upgrade}
          className="font-semibold text-white underline underline-offset-2 hover:no-underline disabled:opacity-60"
        >
          {pending === "checkout" ? "Redirecting..." : "Or upgrade now"}
        </button>
      </p>
      {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { createCheckoutSessionAction, cancelSubscriptionAction } from "./actions";
import { DowngradeConfirmDialog } from "./DowngradeConfirmDialog";
import type { PlanSlug } from "@/libs/contracts";

type Props = {
  planSlug: PlanSlug;
  workspaceId: string;
  isCurrent: boolean;
  isDowngrade: boolean;
  billing: "monthly" | "yearly";
  initialScheduledFor?: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function UpgradeButton({
  planSlug,
  workspaceId,
  isCurrent,
  isDowngrade,
  billing,
  initialScheduledFor,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null | undefined>(initialScheduledFor);
  const [showConfirm, setShowConfirm] = useState(false);

  if (isCurrent) {
    return (
      <button
        type="button"
        disabled
        className="mt-6 rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-gray-500 cursor-default"
      >
        Current plan
      </button>
    );
  }

  const isCancelToFree = planSlug === "free";

  if (isCancelToFree && scheduledFor !== undefined) {
    return (
      <p className="mt-6 rounded-lg bg-white/[0.06] px-4 py-2.5 text-center text-xs text-gray-400">
        {scheduledFor
          ? `Switching to Free on ${formatDate(scheduledFor)}`
          : "Switching to Free at the end of your billing period"}
      </p>
    );
  }

  function submit(reason?: string, recommendation?: string) {
    setError(null);
    startTransition(async () => {
      const result = isCancelToFree
        ? await cancelSubscriptionAction(reason ?? "", recommendation)
        : await createCheckoutSessionAction(planSlug, workspaceId, billing);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      if ("url" in result) {
        window.location.href = result.url;
        return;
      }

      setScheduledFor(result.currentPeriodEnd);
    });
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={isPending || !workspaceId}
        onClick={() => (isCancelToFree ? setShowConfirm(true) : submit())}
        className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-60"
      >
        {isPending ? (isCancelToFree ? "Canceling…" : "Redirecting…") : isDowngrade ? "Downgrade" : "Upgrade"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {showConfirm && (
        <DowngradeConfirmDialog
          onCancel={() => setShowConfirm(false)}
          onConfirm={(reason, recommendation) => {
            setShowConfirm(false);
            submit(reason, recommendation);
          }}
        />
      )}
    </div>
  );
}

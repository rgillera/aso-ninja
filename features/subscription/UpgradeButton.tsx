"use client";

import { useState, useTransition } from "react";
import { createCheckoutSessionAction } from "./actions";
import type { PlanSlug } from "@/libs/contracts";

type Props = {
  planSlug: PlanSlug;
  workspaceId: string;
  isCurrent: boolean;
  isDowngrade: boolean;
  billing: "monthly" | "yearly";
};

export function UpgradeButton({ planSlug, workspaceId, isCurrent, isDowngrade, billing }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={isPending || !workspaceId}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createCheckoutSessionAction(planSlug, workspaceId, billing);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            window.location.href = result.url;
          });
        }}
        className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-60"
      >
        {isPending ? "Redirecting…" : isDowngrade ? "Downgrade" : "Upgrade"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

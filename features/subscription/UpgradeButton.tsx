"use client";

import { useState, useTransition } from "react";
import { createCheckoutSessionAction, cancelSubscriptionAction } from "./actions";
import { DowngradeConfirmDialog } from "./DowngradeConfirmDialog";
import type { PlanSlug } from "@/libs/contracts";

// Matches the card the button sits on in SubscriptionPage (same three
// variants as the marketing pricing cards in PortalPricing.tsx).
export type CardTone = "default" | "featured" | "premium";

const TONE: Record<CardTone, { cta: string; muted: string }> = {
  default: {
    cta: "bg-indigo-500 light:bg-indigo-600 text-white hover:bg-indigo-400 light:hover:bg-indigo-500",
    muted: "bg-white/[0.06] light:bg-black/[0.05] text-gray-500",
  },
  featured: {
    cta: "bg-white text-indigo-600 hover:bg-indigo-50",
    muted: "bg-white/20 text-indigo-100",
  },
  premium: {
    cta: "bg-white/[0.08] text-white hover:bg-white/[0.13]",
    muted: "bg-white/[0.06] text-gray-400",
  },
};

type Props = {
  planSlug: PlanSlug;
  tone?: CardTone;
  workspaceId: string;
  isCurrent: boolean;
  isDowngrade: boolean;
  billing: "monthly" | "yearly";
  initialScheduledFor?: string | null;
  trialDays?: number;
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
  trialDays,
  tone = "default",
}: Props) {
  const t = TONE[tone];
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null | undefined>(initialScheduledFor);
  const [showConfirm, setShowConfirm] = useState(false);

  if (isCurrent) {
    return (
      <button
        type="button"
        disabled
        className={`mt-6 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-default ${t.muted}`}
      >
        Current plan
      </button>
    );
  }

  // Enterprise ("enterprise" slug) is a done-for-you service staffed by an
  // actual ASO specialist — it can't be auto-provisioned by an instant Stripe
  // checkout the way a software tier can, so this books a call instead.
  if (planSlug === "enterprise") {
    const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;
    return (
      <a
        href={calendlyUrl ?? "mailto:hello@appaso.io"}
        target={calendlyUrl ? "_blank" : undefined}
        rel={calendlyUrl ? "noopener noreferrer" : undefined}
        className={`mt-6 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${t.cta}`}
      >
        Talk to us
      </a>
    );
  }

  const isCancelToFree = planSlug === "free";

  if (isCancelToFree && scheduledFor !== undefined) {
    return (
      <p className={`mt-6 rounded-lg px-4 py-2.5 text-center text-xs ${t.muted}`}>
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
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${t.cta}`}
      >
        {isPending
          ? isCancelToFree
            ? "Canceling…"
            : "Redirecting…"
          : isDowngrade
            ? "Downgrade"
            : trialDays
              ? `Try free for ${trialDays} days`
              : "Upgrade now"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400 light:text-red-600">{error}</p>}

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

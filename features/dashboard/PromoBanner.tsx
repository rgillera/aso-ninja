"use client";

import { useState, useSyncExternalStore } from "react";
import { usePlanSlug } from "./PlanContext";
import { UpgradeBanner } from "./UpgradeBanner";
import { AuditBanner } from "./AuditBanner";

const DAY_MS = 24 * 60 * 60 * 1000;

// The upgrade key predates this component; keep it so existing dismissals stick.
const upgradeDismissedKey = (ws: string) => `aso_upgrade_banner_dismissed_${ws}`;
const auditDismissedKey = (ws: string) => `aso_audit_banner_dismissed_${ws}`;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}

type Promo = "upgrade" | "audit" | "none";

function pickPromo(ws: string, isFree: boolean, isPaid: boolean): Promo {
  const upgradeOpen = read(upgradeDismissedKey(ws)) !== "1";
  const auditOpen = read(auditDismissedKey(ws)) !== "1";

  if (isFree) {
    // Alternate by day, not by page load, so the banner doesn't flip on
    // every navigation. Once one is dismissed, the other always shows.
    if (upgradeOpen && auditOpen) return Math.floor(Date.now() / DAY_MS) % 2 === 0 ? "upgrade" : "audit";
    return upgradeOpen ? "upgrade" : auditOpen ? "audit" : "none";
  }

  return isPaid && auditOpen ? "audit" : "none";
}

const noopSubscribe = () => () => {};

// The one promo slot above the dashboard search bar. Free workspaces rotate
// between the Pro upgrade and the free ASO audit; Pro / Pro+ workspaces get
// the audit. Read during render (the
// server snapshot is "none") so a dismissed banner never flashes on load.
export function PromoBanner({ workspaceId }: { workspaceId: string }) {
  const planSlug = usePlanSlug();
  const isFree = planSlug === "free";
  const isPaid = planSlug === "pro" || planSlug === "pro_plus";
  const promo = useSyncExternalStore<Promo>(noopSubscribe, () => pickPromo(workspaceId, isFree, isPaid), () => "none");
  const [dismissed, setDismissed] = useState<Promo | null>(null);

  if (promo === "none" || promo === dismissed) return null;

  if (promo === "upgrade") {
    return (
      <UpgradeBanner
        onDismiss={() => { write(upgradeDismissedKey(workspaceId), "1"); setDismissed("upgrade"); }}
      />
    );
  }
  return (
    <AuditBanner
      onDismiss={() => { write(auditDismissedKey(workspaceId), "1"); setDismissed("audit"); }}
    />
  );
}

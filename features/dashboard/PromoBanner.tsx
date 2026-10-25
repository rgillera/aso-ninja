"use client";

import { useState, useSyncExternalStore } from "react";
import { usePlanSlug } from "./PlanContext";
import { UpgradeBanner } from "./UpgradeBanner";
import { AuditBanner } from "./AuditBanner";

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

function pickPromo(ws: string, isFree: boolean): Promo {
  if (isFree) return read(upgradeDismissedKey(ws)) !== "1" ? "upgrade" : "none";
  return read(auditDismissedKey(ws)) !== "1" ? "audit" : "none";
}

const noopSubscribe = () => () => {};

// The one promo slot above the dashboard search bar. Free workspaces get the
// Pro upgrade; everything else, signup Pro trial included (its slug reads
// "pro"), gets the free ASO audit. Read during render (the
// server snapshot is "none") so a dismissed banner never flashes on load.
export function PromoBanner({ workspaceId }: { workspaceId: string }) {
  const planSlug = usePlanSlug();
  const isFree = planSlug === "free";
  const promo = useSyncExternalStore<Promo>(noopSubscribe, () => pickPromo(workspaceId, isFree), () => "none");
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

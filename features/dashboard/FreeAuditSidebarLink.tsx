"use client";

import { useState, useSyncExternalStore } from "react";
import { GiftIcon } from "@heroicons/react/24/outline";
import { freeAuditLink } from "@/features/subscription/freeAudit";

const CLICKED_KEY = "aso_free_audit_link_clicked";

function readClicked(): boolean {
  try { return localStorage.getItem(CLICKED_KEY) === "1"; } catch { return false; }
}

const noopSubscribe = () => () => {};

const call = freeAuditLink("sidebar");

// Sidebar footer link to the free audit. The gift wiggles until the link has
// been clicked once, then stays still. The server snapshot says "clicked" so
// the animation never flashes in for people who already used it.
export function FreeAuditSidebarLink({ rail, railHide, railLink }: { rail: boolean; railHide: string; railLink: string }) {
  const storedClicked = useSyncExternalStore(noopSubscribe, readClicked, () => true);
  const [justClicked, setJustClicked] = useState(false);
  const wiggle = !storedClicked && !justClicked;

  return (
    <a
      href={call.href}
      target={call.external ? "_blank" : undefined}
      rel={call.external ? "noopener noreferrer" : undefined}
      title={rail ? "Free ASO audit" : undefined}
      onClick={() => {
        try { localStorage.setItem(CLICKED_KEY, "1"); } catch {}
        setJustClicked(true);
      }}
      className={`flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${railLink} text-emerald-400 light:text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-300 light:hover:text-emerald-700 transition-colors`}
    >
      <GiftIcon className={`size-5 shrink-0 ${wiggle ? "motion-safe:animate-gift-wiggle" : ""}`} />
      <span className={railHide}>Free ASO audit</span>
    </a>
  );
}

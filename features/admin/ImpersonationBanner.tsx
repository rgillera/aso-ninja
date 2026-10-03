"use client";

import { useTransition } from "react";
import { EyeIcon } from "@heroicons/react/24/outline";
import { stopImpersonationAction } from "@/features/admin/actions";

// Floating pill rather than a top bar so it can't shift or overlap any
// layout's own fixed headers/sidebars (dashboard, mobile, admin).
export function ImpersonationBanner({ email, expiresAt }: { email: string; expiresAt: number }) {
  const [pending, startTransition] = useTransition();
  const until = new Date(expiresAt * 1000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  function handleExit() {
    startTransition(async () => {
      await stopImpersonationAction();
      // Full reload, not router.push: drops every client-side cache that was
      // filled with this user's data.
      window.location.assign("/admin");
    });
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-3 rounded-full bg-amber-500 px-4 py-2 text-xs font-medium text-black shadow-lg shadow-black/30 max-w-[calc(100vw-2rem)]">
      <EyeIcon className="size-4 shrink-0" />
      <span className="truncate">
        Viewing as <span className="font-semibold">{email}</span> · View only · Until {until}
      </span>
      <button
        type="button"
        onClick={handleExit}
        disabled={pending}
        className="shrink-0 rounded-full bg-black/85 px-3 py-1 text-[11px] font-semibold text-amber-300 hover:bg-black disabled:opacity-60 transition-colors"
      >
        {pending ? "Exiting…" : "Exit"}
      </button>
    </div>
  );
}

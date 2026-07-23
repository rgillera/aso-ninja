"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCodeIcon } from "@heroicons/react/24/outline";

// Shared by the My Apps header (variant="pill") and the sidebar footer
// (variant="row" — @/features/dashboard/DashboardSidebar.tsx) so the QR/URL
// logic can't drift between the two.
type Props = { variant?: "pill" | "row" };

export function MobileAppQrButton({ variant = "pill" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // /mobile follows whichever app you last viewed on the web (same
  // lastAppId/lastWorkspaceId cookies DashboardShell writes) — see
  // app/mobile/page.tsx — so this QR always opens the right rankings once
  // at least one app has been viewed.
  const mobileUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://appaso.io"}/mobile`;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const popover = (
    <div
      className={`absolute z-50 w-64 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-xl shadow-black/30 p-4 ${
        variant === "row" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-1.5"
      }`}
    >
      <div className="flex justify-center rounded-lg bg-white p-3">
        <QRCodeSVG value={mobileUrl} size={144} />
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">
        Scan with your phone to track rankings and get push notifications the moment they change.
      </p>
    </div>
  );

  if (variant === "row") {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
        >
          <QrCodeIcon className="size-4 shrink-0" />
          Get mobile app
        </button>
        {open && popover}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg bg-[#1a1d24] ring-1 px-3 py-2.5 text-xs transition-colors ${open ? "text-white ring-indigo-500/50" : "ring-white/[0.08] text-gray-400 hover:text-gray-200"}`}
      >
        <QrCodeIcon className="size-3.5" />
        Get mobile app
      </button>
      {open && popover}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import { isMobileUserAgent } from "@/libs/user-agent";

// Shared by the My Apps header and the Account Settings page (both
// variant="pill" — @/features/account/AccountPage.tsx) so the QR/URL logic
// can't drift between the two. variant="row" is kept for a denser list
// context (it used to live in DashboardSidebar's footer) but has no current
// caller.
type Props = { variant?: "pill" | "row" };

export function MobileAppQrButton({ variant = "pill" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
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

  // A phone scanning a QR code for the page it's already on is useless —
  // send it straight to /mobile instead of opening the popover.
  function handleClick() {
    if (isMobileUserAgent(navigator.userAgent)) {
      router.push("/mobile");
      return;
    }
    setOpen((v) => !v);
  }

  const popover = (
    <div
      className={`absolute z-50 w-64 rounded-xl bg-[#1a1d24] light:bg-white shadow-xl shadow-black/30 light:shadow-black/10 p-4 ${
        variant === "row" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-1.5"
      }`}
    >
      <div className="flex justify-center rounded-lg bg-white p-3">
        <QRCodeSVG value={mobileUrl} size={144} />
      </div>
      <p className="mt-3 text-center text-xs text-gray-400 light:text-gray-600">
        Scan with your phone to track rankings and get push notifications the moment they change.
      </p>
    </div>
  );

  if (variant === "row") {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-1.5 text-left text-sm text-gray-500 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900 transition-colors"
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
        onClick={handleClick}
        className={`flex items-center gap-1.5 rounded-lg bg-[#1a1d24] light:bg-white ring-1 px-3 py-2.5 text-xs transition-colors ${open ? "text-white light:text-gray-900 ring-indigo-500/50" : "ring-white/[0.08] light:ring-black/[0.08] text-gray-400 light:text-gray-600 hover:text-gray-200 light:hover:text-gray-800"}`}
      >
        <QrCodeIcon className="size-3.5" />
        Get mobile app
      </button>
      {open && popover}
    </div>
  );
}

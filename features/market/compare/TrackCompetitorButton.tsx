"use client";

import { useEffect, useRef, useState } from "react";
import { FlagIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { CompareApp } from "./types";

export type MyApp = { id: string; name: string; icon_url: string | null; store: "ios" | "android" };

type Props = {
  app: CompareApp;
  myApps: MyApp[];
  onTrack: (app: CompareApp, targetAppId: string) => Promise<{ ok: boolean; error?: string }>;
};

// app_competitors rows carry only a bare storeId (no store/country of their
// own) — /api/competitors assumes a competitor is on the same store as the
// primary app it's attached to, so this only offers primary apps on the same
// store as the one being tracked rather than letting an iOS app get filed
// under an Android primary (or vice versa) and silently mis-scored later.
export function TrackCompetitorButton({ app, myApps, onTrack }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ targetName: string; ok: boolean; error?: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const eligibleApps = myApps.filter((m) => m.store === app.store);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(t);
  }, [result]);

  async function track(target: MyApp) {
    setOpen(false);
    setPending(true);
    const res = await onTrack(app, target.id);
    setPending(false);
    setResult({ targetName: target.name, ok: res.ok, error: res.error });
  }

  const disabled = eligibleApps.length === 0;
  const disabledReason = myApps.length === 0
    ? "Add an app to your workspace first"
    : `No ${app.store === "ios" ? "App Store" : "Google Play"} apps in this workspace yet`;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled || pending}
        title={disabled ? disabledReason : "Track as competitor"}
        className="rounded p-1 text-gray-600 hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label={`Track ${app.name} as a competitor`}
      >
        <FlagIcon className="size-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 min-w-[200px] max-h-64 overflow-y-auto rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.1] shadow-2xl p-1.5">
            <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">Track as competitor of</p>
            {eligibleApps.map((m) => (
              <button
                key={m.id}
                onClick={() => track(m)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-gray-300 hover:bg-white/[0.05] transition-colors"
              >
                {m.icon_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.icon_url} alt="" className="size-5 rounded-md shrink-0" />
                )}
                <span className="truncate">{m.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {result && (
        <div
          className={`absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium shadow-lg ${
            result.ok ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
          }`}
        >
          {result.ok ? (
            <span className="inline-flex items-center gap-1"><CheckIcon className="size-3" />Added to {result.targetName}</span>
          ) : (
            result.error ?? "Couldn't add competitor"
          )}
        </div>
      )}
    </div>
  );
}

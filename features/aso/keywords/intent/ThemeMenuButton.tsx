"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { IntentTheme } from "./types";

// Shared "Move to ▾" trigger + dropdown — used both per-row (currentThemeId
// set, so the row's current group is checkmarked) and from bulk selection
// bars (currentThemeId omitted since a multi-group selection has no single
// "current" theme to highlight).
export function ThemeMenuButton({
  label,
  themes,
  currentThemeId,
  onPick,
  buttonClassName,
  includeOther = true,
}: {
  label: React.ReactNode;
  themes: IntentTheme[];
  currentThemeId?: string | null;
  onPick: (themeId: string | null) => void;
  buttonClassName: string;
  includeOther?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // `top` when there's room to drop the menu below the trigger; `bottom`
  // (anchored to the trigger's top edge) when the trigger sits near the
  // bottom of the viewport — e.g. a fixed bulk-selection bar — so the menu
  // opens upward instead of getting clipped off-screen.
  const [pos, setPos] = useState<{ left: number; top: number } | { left: number; bottom: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const MENU_MAX_HEIGHT = 288; // matches max-h-72

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const left = Math.max(8, r.right - 200);
      const spaceBelow = window.innerHeight - r.bottom;
      setPos(
        spaceBelow < MENU_MAX_HEIGHT
          ? { left, bottom: window.innerHeight - r.top + 4 }
          : { left, top: r.bottom + 4 }
      );
    }
    setOpen((v) => !v);
  }

  function pick(themeId: string | null) {
    onPick(themeId);
    setOpen(false);
  }

  return (
    <>
      <button ref={btnRef} onClick={toggle} className={buttonClassName}>
        {label}
        <ChevronDownIcon className="size-3" />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", left: pos.left, ...("top" in pos ? { top: pos.top } : { bottom: pos.bottom }), zIndex: 9999 }}
          className="w-52 bg-[#1a1d24] ring-1 ring-white/[0.12] rounded-xl overflow-hidden shadow-2xl py-1 max-h-72 overflow-y-auto"
        >
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] ${currentThemeId === t.id ? "text-indigo-400" : "text-gray-300"}`}
            >
              {currentThemeId === t.id ? <CheckIcon className="size-3 shrink-0" /> : <span className="w-3 shrink-0" />}
              <span className="truncate">{t.label}</span>
            </button>
          ))}
          {includeOther && (
            <button
              onClick={() => pick(null)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] border-t border-white/[0.06] mt-1 pt-2 ${currentThemeId === null ? "text-indigo-400" : "text-gray-500"}`}
            >
              {currentThemeId === null ? <CheckIcon className="size-3 shrink-0" /> : <span className="w-3 shrink-0" />}
              Other
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

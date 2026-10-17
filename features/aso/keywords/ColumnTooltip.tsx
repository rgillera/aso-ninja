"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Styled hover popup around arbitrary content. Used instead of a native
// `title` because that one shows late, looks plain, and gives no hint that
// there's anything to hover. Newlines in a string `text` are kept.
export function HoverTooltip({ text, children, className = "" }: { text: ReactNode; children: ReactNode; className?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <span
      className={`inline-flex items-center ${className}`}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && createPortal(
        <div
          style={{ position: "fixed", left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)", zIndex: 99999 }}
          className="w-52 rounded-lg bg-[#0d0f14] light:bg-gray-50 px-3 py-2.5 text-xs text-gray-300 light:text-gray-700 leading-relaxed whitespace-pre-line shadow-2xl pointer-events-none"
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  );
}

export function ColumnTooltip({ text }: { text: string }) {
  return (
    <HoverTooltip text={text}>
      <span className="flex items-center justify-center size-3.5 rounded-full border border-gray-600 text-[8px] font-bold text-gray-500 hover:border-gray-400 hover:text-gray-300 light:hover:text-gray-700 cursor-default transition-colors leading-none select-none">
        ?
      </span>
    </HoverTooltip>
  );
}

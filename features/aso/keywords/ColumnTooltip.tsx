"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export function ColumnTooltip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <span
      className="inline-flex items-center"
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      <span className="flex items-center justify-center size-3.5 rounded-full border border-gray-600 text-[8px] font-bold text-gray-500 hover:border-gray-400 hover:text-gray-300 cursor-default transition-colors leading-none select-none">
        ?
      </span>
      {pos && createPortal(
        <div
          style={{ position: "fixed", left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)", zIndex: 99999 }}
          className="w-52 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.12] px-3 py-2.5 text-xs text-gray-300 leading-relaxed shadow-2xl pointer-events-none"
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  );
}

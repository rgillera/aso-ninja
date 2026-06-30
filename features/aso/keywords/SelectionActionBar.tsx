"use client";

import { useState } from "react";
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  StarIcon,
  TableCellsIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type Props = {
  count: number;
  total: number;
  onClear: () => void;
  onCopy: () => void;
  onStar: () => void;
  onExport: () => void;
  onDelete: () => void;
};

export function SelectionActionBar({ count, total, onClear, onCopy, onStar, onExport, onDelete }: Props) {
  const [copied, setCopied] = useState(false);

  if (count === 0) return null;

  function handleCopy() {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-[#1a1d24] ring-1 ring-white/[0.12] shadow-2xl px-2 py-2">
      <button
        onClick={onClear}
        title="Clear selection"
        className="flex items-center justify-center size-8 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <XMarkIcon className="size-4" />
      </button>
      <span className="px-2 text-xs font-medium text-gray-300 whitespace-nowrap">{count}/{total} selected</span>
      <div className="w-px h-5 bg-white/[0.1] mx-1" />
      <button
        onClick={handleCopy}
        title="Copy to clipboard"
        className="flex items-center justify-center size-8 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        {copied ? <ClipboardDocumentCheckIcon className="size-4 text-emerald-400" /> : <ClipboardDocumentIcon className="size-4" />}
      </button>
      <button
        onClick={onStar}
        title="Star selection"
        className="flex items-center justify-center size-8 rounded-full text-gray-400 hover:text-amber-400 hover:bg-white/[0.06] transition-colors"
      >
        <StarIcon className="size-4" />
      </button>
      <button
        onClick={onExport}
        title="Export to Google Sheets (CSV)"
        className="flex items-center justify-center size-8 rounded-full text-gray-400 hover:text-emerald-400 hover:bg-white/[0.06] transition-colors"
      >
        <TableCellsIcon className="size-4" />
      </button>
      <button
        onClick={onDelete}
        title="Delete selection"
        className="flex items-center justify-center size-8 rounded-full text-gray-400 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
      >
        <TrashIcon className="size-4" />
      </button>
    </div>
  );
}

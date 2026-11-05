"use client";

import { useState } from "react";

// A read-only value with a Copy button, for admin pages that hand out text.
export function CopyField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; the text is still selectable.
    }
  }

  const fieldClass =
    "w-full rounded-lg bg-black/30 light:bg-gray-50 px-3 py-2 text-sm text-white light:text-gray-900 ring-1 ring-white/10 light:ring-black/10 outline-none";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-gray-400 light:text-gray-600">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-md px-2 py-1 text-xs font-medium text-indigo-400 light:text-indigo-600 hover:bg-white/5 light:hover:bg-black/[0.04]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {multiline ? (
        <textarea readOnly value={value} rows={20} className={`${fieldClass} resize-y font-sans`} onFocus={(e) => e.target.select()} />
      ) : (
        <input readOnly value={value} className={`${fieldClass} font-mono`} onFocus={(e) => e.target.select()} />
      )}
    </div>
  );
}

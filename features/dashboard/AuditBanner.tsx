"use client";

import { ClipboardDocumentCheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { freeAuditLink } from "@/features/subscription/freeAudit";

// Free ASO audit offer. When it shows is decided by PromoBanner.
export function AuditBanner({ onDismiss }: { onDismiss: () => void }) {
  const call = freeAuditLink("dashboard_banner");

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 ring-1 ring-emerald-500/20 px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
        <ClipboardDocumentCheckIcon className="size-5 text-emerald-400 light:text-emerald-600" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white light:text-gray-900">Get a free ASO audit of your app</p>
        <p className="text-xs text-gray-400 light:text-gray-600">
          An ASO specialist reviews your listing, keywords, and competitors, then walks you through the biggest wins on a call. No cost, no obligation.
        </p>
      </div>

      <a
        href={call.href}
        target={call.external ? "_blank" : undefined}
        rel={call.external ? "noopener noreferrer" : undefined}
        className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-400"
      >
        Book my free audit
      </a>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:text-gray-300 light:hover:text-gray-700 hover:bg-white/[0.06] light:hover:bg-black/[0.05] transition-colors"
        title="Dismiss"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

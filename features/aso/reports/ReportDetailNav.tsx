"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";

type NavItem = { id: string; label: string };

type ReportDetailNavProps = {
  isIos: boolean;
};

// Anchor ids here must match the CardShell `id` props set in
// ReportMetadataComparison.tsx (and the TAG_ANCHOR map in asoScore.ts, which
// links the same cards from the ASO Score summary's expanded rows).
export function ReportDetailNav({ isIos }: ReportDetailNavProps) {
  const items: NavItem[] = [
    { id: "name", label: "Name" },
    { id: "subtitle", label: isIos ? "Subtitle" : "Short Description" },
    { id: "description", label: "Description" },
    { id: "release-notes", label: "Release Notes" },
    { id: "screenshots", label: "Screenshots" },
    { id: "preview-video", label: "Preview Video" },
    { id: "reviews-and-ratings", label: "Reviews and Ratings" },
    { id: "recently-updated", label: "Recently Updated" },
    ...(isIos ? [{ id: "localization", label: "Localization" }] : []),
  ];

  function scrollToAnchor(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.07]">
        <h3 className="text-base font-semibold text-white">Detailed View</h3>
        <InformationCircleIcon className="size-4 text-gray-600" />
      </div>
      <div className="flex flex-wrap items-center gap-1 px-3 py-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollToAnchor(item.id)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

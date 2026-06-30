"use client";

import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { ManageCompetitorsModal } from "@/features/aso/keywords/research/ManageCompetitorsModal";

type Props = {
  activeApp: ActiveApp;
  competitors: CompetitorApp[];
  onCompetitorsChange: (competitors: CompetitorApp[]) => void;
};

export function CompetitorsBar({ activeApp, competitors, onCompetitorsChange }: Props) {
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);

  return (
    <div className="px-4 py-2.5 border-b border-white/[0.07]">
      <button
        onClick={() => setShowCompetitorModal(true)}
        className="flex items-center gap-2 w-full rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] hover:ring-white/[0.16] px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors"
      >
        <PlusIcon className="size-3.5" />
        {competitors.length === 0 ? "Add competitors to compare" : `Comparing against ${competitors.length} competitor${competitors.length === 1 ? "" : "s"}`}
        {competitors.length > 0 && (
          <span className="flex items-center -space-x-1.5 ml-1">
            {competitors.slice(0, 5).map((c) => (
              c.icon
                // eslint-disable-next-line @next/next/no-img-element
                ? <img key={c.storeId} src={c.icon} alt={c.name} className="size-5 rounded-md ring-2 ring-[#0d0f14]" />
                : null
            ))}
          </span>
        )}
      </button>

      {showCompetitorModal && (
        <ManageCompetitorsModal
          activeApp={activeApp}
          selected={competitors}
          onSave={onCompetitorsChange}
          onClose={() => setShowCompetitorModal(false)}
        />
      )}
    </div>
  );
}

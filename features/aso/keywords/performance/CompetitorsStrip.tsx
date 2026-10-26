"use client";

import { useState } from "react";
import { PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { ManageCompetitorsModal } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { SERIES_COLORS } from "./types";

type Props = {
  activeApp: ActiveApp;
  competitors: CompetitorApp[];
  onCompetitorsChange: (competitors: CompetitorApp[]) => void;
  /** Outer spacing; defaults to the page gutter used on Keyword Performance. */
  className?: string;
  /** Color dots matching the Visibility Score lines; off where there's no chart. */
  showColors?: boolean;
};

function AppChip({ name, icon, color }: { name: string; icon: string; color?: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] pl-1 pr-2.5 py-1 text-xs font-medium text-gray-300 light:text-gray-700">
      {icon
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={icon} alt="" className="size-5 rounded-md" />
        : <span className="size-5 rounded-md bg-white/[0.06] light:bg-gray-100" />}
      <span className="max-w-[160px] truncate">{name}</span>
      {color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
    </span>
  );
}

// The competitor list as chips plus an add/edit button. On Keyword
// Performance it sits above the chart and table, since the list drives both;
// on Keyword Research it lives in the Competitor Gap tab, the only thing there
// it affects.
export function CompetitorsStrip({
  activeApp, competitors, onCompetitorsChange, className = "mx-6 mt-4", showColors = true,
}: Props) {
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="mr-1 text-xs text-gray-500">Comparing</span>
      <AppChip name={activeApp.name} icon={activeApp.icon_url ?? ""} color={showColors ? SERIES_COLORS[0] : undefined} />
      {competitors.map((c, i) => (
        <AppChip key={c.storeId} name={c.name} icon={c.icon} color={showColors ? SERIES_COLORS[(i + 1) % SERIES_COLORS.length] : undefined} />
      ))}
      <button
        onClick={() => setShowCompetitorModal(true)}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/[0.14] light:border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 hover:border-white/[0.3] light:hover:border-gray-400 transition-colors"
      >
        {competitors.length === 0
          ? <><PlusIcon className="size-3.5" />Add competitors</>
          : <><PencilSquareIcon className="size-3.5" />Edit competitors</>}
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

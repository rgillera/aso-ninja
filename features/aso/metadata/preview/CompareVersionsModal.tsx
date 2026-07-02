"use client";

import { useState } from "react";
import { XMarkIcon, SunIcon, MoonIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import PhonePreview from "./PhonePreview";
import type { App, StoreData } from "@/libs/contracts";

type Props = {
  currentApp: App;
  currentStoreData: StoreData;
  yourApp: App;
  yourStoreData: StoreData;
  yourVideoUrl: string | null;
  onClose: () => void;
};

const SCALE = 0.85;

function ScaledPhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden" style={{ width: 520 * SCALE, height: 560 * SCALE }}>
      <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

export default function CompareVersionsModal({
  currentApp,
  currentStoreData,
  yourApp,
  yourStoreData,
  yourVideoUrl,
  onClose,
}: Props) {
  const [dark, setDark] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1a1d24] p-8 ring-1 ring-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-white">Compare versions</h2>
            <InformationCircleIcon className="size-4 text-gray-500" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-[#22252f] ring-1 ring-white/[0.08] p-1.5">
              <button onClick={() => setDark(false)} className={`rounded-md p-1.5 transition-colors ${!dark ? "bg-white/10 text-white" : "text-gray-500"}`}>
                <SunIcon className="size-4" />
              </button>
              <button onClick={() => setDark(true)} className={`rounded-md p-1.5 transition-colors ${dark ? "bg-white/10 text-white" : "text-gray-500"}`}>
                <MoonIcon className="size-4" />
              </button>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
              <XMarkIcon className="size-5" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="flex flex-col items-center">
            <p className="mb-3 text-sm font-medium text-gray-300">Current version</p>
            <ScaledPhone>
              <PhonePreview app={currentApp} dark={dark} storeData={currentStoreData} />
            </ScaledPhone>
          </div>
          <div className="flex flex-col items-center">
            <p className="mb-3 text-sm font-medium text-gray-300">Your version</p>
            <ScaledPhone>
              <PhonePreview app={yourApp} dark={dark} storeData={yourStoreData} videoUrl={yourVideoUrl} />
            </ScaledPhone>
          </div>
        </div>
      </div>
    </div>
  );
}

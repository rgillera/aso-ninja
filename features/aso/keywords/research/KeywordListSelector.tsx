"use client";

import {
  ChevronDownIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

type Props = {
  count: number;
};

export function KeywordListSelector({ count }: Props) {
  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.07] light:border-black/[0.08] bg-[#0d0f14] light:bg-gray-50 shrink-0">
      <button className="flex items-center gap-2 rounded-lg bg-[#1a1d24] light:bg-white px-3 py-2 text-sm text-gray-200 light:text-gray-800 hover:bg-[#22252f] light:hover:bg-gray-50 transition-colors min-w-[190px]">
        <span className="flex-1 text-left font-medium text-sm">Keyword list #1</span>
        <span className="rounded-full bg-indigo-500/20 text-indigo-400 light:text-indigo-600 text-[11px] font-bold px-1.5 py-0.5 leading-none">
          {count}
        </span>
        <ChevronDownIcon className="size-3.5 text-gray-500 shrink-0" />
      </button>
      <button title="New list" className="rounded-lg bg-[#1a1d24] light:bg-white p-2 text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 hover:bg-[#22252f] light:hover:bg-gray-50 transition-colors">
        <PlusIcon className="size-4" />
      </button>
      <button title="Copy list" className="rounded-lg bg-[#1a1d24] light:bg-white p-2 text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 hover:bg-[#22252f] light:hover:bg-gray-50 transition-colors">
        <DocumentDuplicateIcon className="size-4" />
      </button>
      <button title="Export" className="rounded-lg bg-[#1a1d24] light:bg-white p-2 text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 hover:bg-[#22252f] light:hover:bg-gray-50 transition-colors">
        <ArrowDownTrayIcon className="size-4" />
      </button>
    </div>
  );
}

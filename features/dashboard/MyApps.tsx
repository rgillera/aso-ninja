"use client";

import { useState } from "react";
import { PlusIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import AppCard from "@/features/app/AppCard";
import AddApp from "@/features/app/AddApp";
import type { App } from "@/libs/contracts";

type Props = {
  apps: App[];
  workspaceId: string;
};

export default function MyApps({ apps, workspaceId }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      {showAdd && (
        <AddApp workspaceId={workspaceId} onClose={() => setShowAdd(false)} />
      )}

      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">My Apps</h1>
            <p className="mt-1 text-sm text-gray-400">
              {apps.length} app{apps.length !== 1 ? "s" : ""} tracked in this workspace
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            <PlusIcon className="size-4" />
            Add app
          </button>
        </div>

        {apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-gray-800/20 py-24">
            <DevicePhoneMobileIcon className="size-10 text-gray-700 mb-4" />
            <p className="text-sm font-medium text-gray-400">No apps yet</p>
            <p className="mt-1 text-sm text-gray-600">
              Add your first app to start tracking its ASO performance.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
            >
              <PlusIcon className="size-4" />
              Add app
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

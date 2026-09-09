"use client";

import { useActionState, useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { createWorkspaceAction } from "./actions";

type Props = {
  onClose: () => void;
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateWorkspace({ onClose }: Props) {
  const [state, action, pending] = useActionState(createWorkspaceAction, null);
  const [name, setName] = useState("");

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview = slugify(name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-gray-900 light:bg-white shadow-2xl light:shadow-black/10 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white light:text-gray-900">Create workspace</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-white/10 light:hover:bg-black/[0.06] hover:text-white light:hover:text-gray-900 transition-colors"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <form action={action} className="space-y-4">
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 light:text-red-600 ring-1 ring-red-500/20">
              <PlanLimitMessage message={state.error} />
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 light:text-gray-700 mb-1.5">
              Workspace name
            </label>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Acme Inc"
              className="w-full rounded-lg bg-gray-800 light:bg-gray-50 border border-white/10 light:border-black/[0.1] px-4 py-2.5 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            {preview && (
              <p className="mt-1.5 text-xs text-gray-600 light:text-gray-400">
                Slug: <span className="text-gray-500">{preview}-…</span>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

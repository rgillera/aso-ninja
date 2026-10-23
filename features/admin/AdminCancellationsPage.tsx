"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import type { AdminCancellationRow } from "@/features/admin/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminCancellationsPage({ rows }: { rows: AdminCancellationRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        (r.reasonDetail ?? "").toLowerCase().includes(q) ||
        (r.recommendation ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <ChatBubbleLeftRightIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Super Admin · Cancellations</h1>
            <p className="text-xs text-gray-500">
              {rows.length.toLocaleString()} {rows.length === 1 ? "response" : "responses"} from users who downgraded to Free
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-[#141417] light:bg-white px-3 py-2.5 mb-5">
          <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email, reason, or recommendation…"
            className="bg-transparent text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none w-full"
          />
        </div>

        <div className="rounded-2xl bg-[#141417] light:bg-white overflow-hidden shadow-lg shadow-black/20">
          {rows.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">No cancellation feedback yet.</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">
              No feedback matches “{query.trim()}”.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.07] light:divide-black/[0.08]">
              {filtered.map((r) => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-white light:text-gray-900 break-all">{r.email}</p>
                    {r.planName && (
                      <span className="rounded-full bg-white/[0.06] light:bg-black/[0.05] px-1.5 py-px text-[10px] font-medium text-gray-400 light:text-gray-600">
                        {r.planName}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-500">{formatDateTime(r.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-300 light:text-gray-700 whitespace-pre-wrap">{r.reason}</p>
                  {r.reasonDetail && (
                    <p className="mt-1 border-l-2 border-white/10 light:border-black/10 pl-2.5 text-sm text-gray-400 light:text-gray-600 whitespace-pre-wrap">
                      {r.reasonDetail}
                    </p>
                  )}
                  {r.recommendation && (
                    <p className="mt-2 text-xs text-gray-400 light:text-gray-600 whitespace-pre-wrap">
                      <span className="font-medium text-gray-500">Recommendation: </span>
                      {r.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

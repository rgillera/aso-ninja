"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import type { AdminCertificationAttemptRow } from "@/features/admin/types";

// Matches EXAM_DURATION_SECONDS in CertificationExam.tsx. An unfinished
// attempt older than this can't still be running, so it was abandoned.
const EXAM_DURATION_MS = 45 * 60 * 1000;

type Status = "passed" | "failed" | "in_progress" | "abandoned";
type Filter = "all" | Status;

const STATUS_LABEL: Record<Status, string> = {
  passed: "Passed",
  failed: "Failed",
  in_progress: "In progress",
  abandoned: "Not finished",
};

const STATUS_BADGE_CLASSES: Record<Status, string> = {
  passed: "bg-emerald-500/10 text-emerald-400 light:text-emerald-700",
  failed: "bg-red-500/10 text-red-400 light:text-red-600",
  in_progress: "bg-sky-500/10 text-sky-400 light:text-sky-700",
  abandoned: "bg-white/[0.06] light:bg-black/[0.05] text-gray-400 light:text-gray-600",
};

function statusOf(r: AdminCertificationAttemptRow, now: number): Status {
  if (r.finishedAt) return r.passed ? "passed" : "failed";
  return now - new Date(r.startedAt).getTime() > EXAM_DURATION_MS ? "abandoned" : "in_progress";
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(startIso: string, endIso: string): string {
  const minutes = Math.max(1, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
  return `${minutes}m`;
}

export default function AdminCertificationsPage({ rows }: { rows: AdminCertificationAttemptRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [now] = useState(() => Date.now());

  const withStatus = useMemo(() => rows.map((r) => ({ ...r, status: statusOf(r, now) })), [rows, now]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { passed: 0, failed: 0, in_progress: 0, abandoned: 0 };
    for (const r of withStatus) c[r.status] += 1;
    return c;
  }, [withStatus]);

  const takers = useMemo(() => new Set(rows.map((r) => r.userId)).size, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus.filter((r) => (filter === "all" || r.status === filter) && (!q || r.email.toLowerCase().includes(q)));
  }, [withStatus, filter, query]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: rows.length },
    { key: "passed", label: STATUS_LABEL.passed, count: counts.passed },
    { key: "failed", label: STATUS_LABEL.failed, count: counts.failed },
    { key: "in_progress", label: STATUS_LABEL.in_progress, count: counts.in_progress },
    { key: "abandoned", label: STATUS_LABEL.abandoned, count: counts.abandoned },
  ];

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <AcademicCapIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Super Admin · Certifications</h1>
            <p className="text-xs text-gray-500">
              {rows.length.toLocaleString()} {rows.length === 1 ? "attempt" : "attempts"} by {takers.toLocaleString()}{" "}
              {takers === 1 ? "user" : "users"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex flex-1 min-w-56 items-center gap-2 rounded-lg bg-[#141417] light:bg-white px-3 py-2.5">
            <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email…"
              className="bg-transparent text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none w-full"
            />
          </div>
          <div className="flex flex-wrap rounded-lg bg-[#141417] light:bg-white p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "bg-white/[0.10] light:bg-black/[0.08] text-white light:text-gray-900"
                    : "text-gray-500 hover:text-gray-300 light:hover:text-gray-700"
                }`}
              >
                {f.label} <span className="text-gray-500">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#141417] light:bg-white overflow-hidden shadow-lg shadow-black/20">
          {rows.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">No exam attempts yet.</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">No attempts match these filters.</div>
          ) : (
            <div className="divide-y divide-white/[0.07] light:divide-black/[0.08]">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white light:text-gray-900 truncate">{r.email}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      Started {formatDateTime(r.startedAt)}
                      {r.finishedAt && ` · took ${formatDuration(r.startedAt, r.finishedAt)}`}
                      {r.timedOut && " · ran out of time"}
                    </p>
                  </div>
                  {r.score !== null && (
                    <p className="shrink-0 text-sm text-gray-300 light:text-gray-700 tabular-nums">
                      {r.score} / {r.total}{" "}
                      <span className="text-gray-500">({r.total > 0 ? Math.round((r.score / r.total) * 100) : 0}%)</span>
                    </p>
                  )}
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASSES[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

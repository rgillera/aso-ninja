"use client";

import { useMemo, useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";
import type { AdminUserRow } from "@/features/admin/types";

type Props = {
  users: AdminUserRow[];
};

type SortKey = "email" | "status" | "planName" | "appCount" | "keywordCount" | "createdAt" | "lastSignInAt";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";

const SORT_COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "email", label: "Email" },
  { key: "status", label: "Status" },
  { key: "planName", label: "Plan" },
  { key: "appCount", label: "Apps", align: "right" },
  { key: "keywordCount", label: "Keywords", align: "right" },
  { key: "createdAt", label: "Joined" },
  { key: "lastSignInAt", label: "Last login" },
];

const PAGE_SIZE = 25;

// "Active" = signed in within this window — there's no live presence
// tracking (no last-seen heartbeat), so this is a recency proxy, not
// "online right now".
const ACTIVE_WINDOW_DAYS = 7;
const ACTIVE_WINDOW_MS = ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function isRecentlyActive(lastSignInAt: string | null): boolean {
  if (!lastSignInAt) return false;
  return Date.now() - new Date(lastSignInAt).getTime() <= ACTIVE_WINDOW_MS;
}

const PLAN_BADGE_CLASSES: Record<string, string> = {
  free: "bg-white/[0.06] text-gray-400",
  basic: "bg-sky-500/10 text-sky-400",
  pro: "bg-indigo-500/10 text-indigo-400",
  pro_plus: "bg-violet-500/10 text-violet-400",
  enterprise: "bg-amber-500/10 text-amber-400",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function compareValues(a: AdminUserRow, b: AdminUserRow, key: SortKey): number {
  switch (key) {
    case "email":
      return a.email.localeCompare(b.email);
    case "status":
      return Number(isRecentlyActive(a.lastSignInAt)) - Number(isRecentlyActive(b.lastSignInAt));
    case "planName":
      return a.planName.localeCompare(b.planName);
    case "appCount":
      return a.appCount - b.appCount;
    case "keywordCount":
      return a.keywordCount - b.keywordCount;
    case "createdAt":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "lastSignInAt":
      return (a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0) - (b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0);
  }
}

export default function AdminUsersPage({ users }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("email");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(0);
  }

  const activeCount = useMemo(() => users.filter((u) => isRecentlyActive(u.lastSignInAt)).length, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.email.toLowerCase().includes(q)) return false;
      if (statusFilter === "active" && !isRecentlyActive(u.lastSignInAt)) return false;
      if (statusFilter === "inactive" && isRecentlyActive(u.lastSignInAt)) return false;
      return true;
    });
  }, [users, search, statusFilter]);

  const sorted = useMemo(() => {
    const factor = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compareValues(a, b, sortKey) * factor);
  }, [filtered, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [totalPages, page]);

  const pageUsers = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#0d0f14] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/[0.08]">
            <UsersIcon className="size-4.5 text-gray-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Super Admin · Users</h1>
            <p className="text-xs text-gray-500">
              {users.length.toLocaleString()} total users · {activeCount.toLocaleString()} active in last {ACTIVE_WINDOW_DAYS} days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08]">
            {(["all", "active", "inactive"] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(0); }}
                className={`capitalize rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  statusFilter === status ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-2.5">
            <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by email…"
              className="bg-transparent text-xs text-white placeholder-gray-600 outline-none w-64"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-left text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
                  {SORT_COLUMNS.map((col) => (
                    <th key={col.key} className="px-5 py-3 font-semibold">
                      <button
                        onClick={() => handleSort(col.key)}
                        className={`flex items-center gap-1 hover:text-gray-300 transition-colors ${col.align === "right" ? "ml-auto flex-row-reverse" : ""}`}
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDirection === "asc" ? (
                            <ChevronUpIcon className="size-3" />
                          ) : (
                            <ChevronDownIcon className="size-3" />
                          )
                        ) : (
                          <ChevronUpDownIcon className="size-3 text-gray-700" />
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {pageUsers.map((u) => {
                  const active = isRecentlyActive(u.lastSignInAt);
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3.5 text-white truncate max-w-xs">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? "text-emerald-400" : "text-gray-500"}`}>
                          <span className={`size-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-gray-600"}`} />
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                            PLAN_BADGE_CLASSES[u.planSlug] ?? "bg-white/[0.06] text-gray-400"
                          }`}
                        >
                          {u.planName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-300">{u.appCount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-gray-300">{u.keywordCount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-gray-400">{formatDate(u.createdAt)}</td>
                      <td className="px-5 py-3.5 text-gray-400">{formatDate(u.lastSignInAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sorted.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-600">No users match your search.</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.07] text-xs text-gray-500">
              <span>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(0)} disabled={page === 0} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
                  <ChevronDoubleLeftIcon className="size-3.5" />
                </button>
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 0} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
                  <ChevronLeftIcon className="size-3.5" />
                </button>
                <span className="px-2">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
                  <ChevronRightIcon className="size-3.5" />
                </button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-colors">
                  <ChevronDoubleRightIcon className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

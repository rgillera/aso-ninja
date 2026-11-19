"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
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
  ArrowDownTrayIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import type { AdminUserRow } from "@/features/admin/types";
import { downloadCsv } from "@/features/aso/keywords/csvExport";
import { startImpersonationAction } from "@/features/admin/actions";
import { formatDuration, planBadgeClass, proTrialTitle } from "@/features/admin/format";

type Props = {
  users: AdminUserRow[];
};

type SortKey =
  | "email"
  | "planName"
  | "keywordCount"
  | "activeSeconds"
  | "visitCount"
  | "activeDays"
  | "subscriptionPageViews"
  | "createdAt"
  | "lastActiveAt";
type SortDirection = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "email", label: "Email" },
  { key: "planName", label: "Plan" },
  { key: "keywordCount", label: "Keywords", align: "right" },
  { key: "activeSeconds", label: "Time used", align: "right" },
  { key: "visitCount", label: "Visits", align: "right" },
  { key: "activeDays", label: "Days active", align: "right" },
  { key: "subscriptionPageViews", label: "Pricing views", align: "right" },
  { key: "createdAt", label: "Joined" },
  { key: "lastActiveAt", label: "Last active" },
];

const PAGE_SIZE = 25;

// The header's "active in last N days" count = signed in or used the app
// (ActivityHeartbeat) within this window. Sign-in alone undercounts: sessions refresh silently for weeks, so
// a daily user can go a long time without a new "Last login".
const ACTIVE_WINDOW_DAYS = 7;
const ACTIVE_WINDOW_MS = ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function lastSeenMs(u: AdminUserRow): number {
  return Math.max(
    u.lastSignInAt ? new Date(u.lastSignInAt).getTime() : 0,
    u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0
  );
}

function isRecentlyActive(u: AdminUserRow): boolean {
  const seen = lastSeenMs(u);
  return seen > 0 && Date.now() - seen <= ACTIVE_WINDOW_MS;
}


function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}


function compareValues(a: AdminUserRow, b: AdminUserRow, key: SortKey): number {
  switch (key) {
    case "email":
      return a.email.localeCompare(b.email);
    case "planName":
      return a.planName.localeCompare(b.planName);
    case "keywordCount":
      return a.keywordCount - b.keywordCount;
    case "activeSeconds":
      return a.activeSeconds - b.activeSeconds;
    case "visitCount":
      return a.visitCount - b.visitCount;
    case "activeDays":
      return a.activeDays - b.activeDays;
    case "subscriptionPageViews":
      return a.subscriptionPageViews - b.subscriptionPageViews;
    case "createdAt":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "lastActiveAt":
      return (a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0) - (b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0);
  }
}

export default function AdminUsersPage({ users }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("lastActiveAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [viewingAsId, setViewingAsId] = useState<string | null>(null);
  const [viewAsError, setViewAsError] = useState<string | null>(null);
  const [, startViewAs] = useTransition();

  function handleViewAs(u: AdminUserRow) {
    setViewAsError(null);
    setViewingAsId(u.id);
    startViewAs(async () => {
      const result = await startImpersonationAction(u.id);
      if (result.ok) {
        // Full reload so the dashboard renders fresh as this user, with none
        // of the admin's own client-side state carried over.
        window.location.assign("/dashboard");
      } else {
        setViewAsError(`${u.email}: ${result.error}`);
        setViewingAsId(null);
      }
    });
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(0);
  }

  const activeCount = useMemo(() => users.filter((u) => isRecentlyActive(u)).length, [users]);

  function handleExportEmails() {
    downloadCsv(
      "all-users-emails.csv",
      ["Email"],
      users.map((u) => [u.email])
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search]);

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
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <UsersIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Super Admin · Users</h1>
            <p className="text-xs text-gray-500">
              {users.length.toLocaleString()} total users · {activeCount.toLocaleString()} active in last {ACTIVE_WINDOW_DAYS} days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg bg-[#141417] light:bg-white px-3 py-2.5">
            <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by email…"
              className="bg-transparent text-xs text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none w-64"
            />
          </div>

          <button
            onClick={handleExportEmails}
            className="flex items-center gap-1.5 rounded-lg bg-[#141417] light:bg-white px-3 py-2.5 text-xs text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 transition-colors"
          >
            <ArrowDownTrayIcon className="size-3.5" />
            Export all emails
          </button>
        </div>

        {viewAsError && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 light:text-red-600 ring-1 ring-red-500/20">
            Couldn&apos;t view as {viewAsError}
          </div>
        )}

        <div className="rounded-2xl bg-[#141417] light:bg-white overflow-hidden shadow-lg shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] light:border-black/[0.08] text-left text-[10px] font-semibold tracking-widest text-gray-600 light:text-gray-400 uppercase">
                  {SORT_COLUMNS.map((col) => (
                    <th key={col.key} className="px-5 py-3 font-semibold">
                      <button
                        onClick={() => handleSort(col.key)}
                        className={`flex items-center gap-1 hover:text-gray-300 light:hover:text-gray-700 transition-colors ${col.align === "right" ? "ml-auto flex-row-reverse" : ""}`}
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDirection === "asc" ? (
                            <ChevronUpIcon className="size-3" />
                          ) : (
                            <ChevronDownIcon className="size-3" />
                          )
                        ) : (
                          <ChevronUpDownIcon className="size-3 text-gray-700 light:text-gray-300" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07] light:divide-black/[0.08]">
                {pageUsers.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.03] light:hover:bg-black/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-white light:text-gray-900 truncate max-w-xs">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${planBadgeClass(u)}`}
                          title={proTrialTitle(u.proTrialEndsAt)}
                        >
                          {u.planName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-300 light:text-gray-700">{u.keywordCount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-gray-300 light:text-gray-700 whitespace-nowrap">{formatDuration(u.activeSeconds)}</td>
                      <td className="px-5 py-3.5 text-right text-gray-300 light:text-gray-700">{u.visitCount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-gray-300 light:text-gray-700">{u.activeDays.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-gray-300 light:text-gray-700">{u.subscriptionPageViews.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-gray-400 light:text-gray-600 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="px-5 py-3.5 text-gray-400 light:text-gray-600 whitespace-nowrap">{formatDateTime(u.lastActiveAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {!u.isSuperAdmin && (
                          <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewAs(u)}
                            disabled={viewingAsId !== null}
                            title="View as this user (view only)"
                            aria-label={`View as ${u.email}`}
                            className="p-1.5 rounded text-gray-500 hover:text-amber-400 light:hover:text-amber-600 hover:bg-amber-500/10 disabled:opacity-40 transition-colors"
                          >
                            <EyeIcon className={`size-4 ${viewingAsId === u.id ? "animate-pulse text-amber-400" : ""}`} />
                          </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sorted.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">No users match your search.</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.07] light:border-black/[0.08] text-xs text-gray-500">
              <span>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(0)} disabled={page === 0} className="p-1.5 rounded hover:bg-white/[0.06] light:hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-default transition-colors">
                  <ChevronDoubleLeftIcon className="size-3.5" />
                </button>
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 0} className="p-1.5 rounded hover:bg-white/[0.06] light:hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-default transition-colors">
                  <ChevronLeftIcon className="size-3.5" />
                </button>
                <span className="px-2">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-white/[0.06] light:hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-default transition-colors">
                  <ChevronRightIcon className="size-3.5" />
                </button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-white/[0.06] light:hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-default transition-colors">
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

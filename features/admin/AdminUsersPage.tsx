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
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { AdminUserRow } from "@/features/admin/types";
import { downloadCsv } from "@/features/aso/keywords/csvExport";
import { deleteUserAction } from "@/features/admin/actions";

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
  free: "bg-white/[0.06] light:bg-black/[0.05] text-gray-400 light:text-gray-600",
  basic: "bg-sky-500/10 text-sky-400 light:text-sky-700",
  pro: "bg-indigo-500/10 text-indigo-400 light:text-indigo-700",
  pro_plus: "bg-violet-500/10 text-violet-400 light:text-violet-700",
  enterprise: "bg-amber-500/10 text-amber-400 light:text-amber-700",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// What the admin has to type to confirm: the email, or the id for the rare
// account with none (page.tsx renders those as "(no email)").
function confirmationFor(u: AdminUserRow): string {
  return u.email === "(no email)" ? u.id : u.email;
}

function DeleteUserDialog({ user, onClose, onDeleted }: { user: AdminUserRow; onClose: () => void; onDeleted: (id: string) => void }) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const expected = confirmationFor(user);
  const matches = confirmation.trim().toLowerCase() === expected.toLowerCase();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteUserAction(user.id, confirmation);
      if (result.ok) onDeleted(user.id);
      else setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={pending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-user-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-[#1a1d24] light:bg-white p-6 shadow-xl ring-1 ring-red-500/20"
      >
        <h2 id="delete-user-title" className="flex items-center gap-2 text-base font-semibold text-red-400 light:text-red-600">
          <ExclamationTriangleIcon className="size-4" />
          Delete user
        </h2>
        <p className="mt-3 text-sm text-gray-300 light:text-gray-700 break-all">{user.email}</p>
        <ul className="mt-3 space-y-1 text-sm text-gray-400 light:text-gray-600 list-disc pl-5">
          <li>
            {user.workspaceCount.toLocaleString()} owned {user.workspaceCount === 1 ? "workspace" : "workspaces"} with{" "}
            {user.appCount.toLocaleString()} apps and {user.keywordCount.toLocaleString()} keywords will be deleted
          </li>
          {user.planSlug !== "free" && <li>Their {user.planName} subscription will be canceled immediately</li>}
          <li>They will be removed from any workspaces they were invited to</li>
        </ul>
        <p className="mt-3 text-sm text-gray-400 light:text-gray-600">This cannot be undone.</p>

        <label htmlFor="delete-user-confirmation" className="mt-5 block text-sm font-medium text-gray-300 light:text-gray-700 mb-1.5">
          Type <span className="font-mono font-semibold text-red-400 light:text-red-600 break-all">{expected}</span> to confirm
        </label>
        <input
          id="delete-user-confirmation"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          autoFocus
          className="w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 border border-white/[0.07] light:border-black/[0.08] px-4 py-2.5 text-sm text-white light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
        />

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 light:text-red-600 ring-1 ring-red-500/20">{error}</div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg bg-white/10 light:bg-gray-200 px-4 py-2 text-sm font-semibold text-white light:text-gray-900 hover:bg-white/15 light:hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending || !matches}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? "Deleting…" : "Delete user and data"}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null);
  // Hides a deleted row immediately; revalidatePath in deleteUserAction
  // brings the server-rendered list (and totals) in line on the next render.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

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
      if (deletedIds.has(u.id)) return false;
      if (q && !u.email.toLowerCase().includes(q)) return false;
      if (statusFilter === "active" && !isRecentlyActive(u.lastSignInAt)) return false;
      if (statusFilter === "inactive" && isRecentlyActive(u.lastSignInAt)) return false;
      return true;
    });
  }, [users, search, statusFilter, deletedIds]);

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
          <div className="flex items-center gap-1 rounded-lg bg-[#1a1d24] light:bg-white">
            {(["all", "active", "inactive"] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(0); }}
                className={`capitalize rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
                    : "text-gray-500 hover:text-gray-300 light:hover:text-gray-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#1a1d24] light:bg-white px-3 py-2.5">
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
            className="flex items-center gap-1.5 rounded-lg bg-[#1a1d24] light:bg-white px-3 py-2.5 text-xs text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 transition-colors"
          >
            <ArrowDownTrayIcon className="size-3.5" />
            Export all emails
          </button>
        </div>

        <div className="rounded-2xl bg-[#1a1d24] light:bg-white overflow-hidden shadow-lg shadow-black/20">
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
                  const active = isRecentlyActive(u.lastSignInAt);
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.03] light:hover:bg-black/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-white light:text-gray-900 truncate max-w-xs">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? "text-emerald-400 light:text-emerald-700" : "text-gray-500"}`}>
                          <span className={`size-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-gray-600"}`} />
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                            PLAN_BADGE_CLASSES[u.planSlug] ?? "bg-white/[0.06] light:bg-black/[0.05] text-gray-400 light:text-gray-600"
                          }`}
                        >
                          {u.planName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-300 light:text-gray-700">{u.appCount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-gray-300 light:text-gray-700">{u.keywordCount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-gray-400 light:text-gray-600">{formatDate(u.createdAt)}</td>
                      <td className="px-5 py-3.5 text-gray-400 light:text-gray-600">{formatDate(u.lastSignInAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {!u.isSuperAdmin && (
                          <button
                            onClick={() => setDeleting(u)}
                            title="Delete user"
                            aria-label={`Delete ${u.email}`}
                            className="p-1.5 rounded text-gray-500 hover:text-red-400 light:hover:text-red-600 hover:bg-red-500/10 transition-colors"
                          >
                            <TrashIcon className="size-4" />
                          </button>
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

      {deleting && (
        <DeleteUserDialog
          user={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            setDeletedIds((prev) => new Set(prev).add(id));
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

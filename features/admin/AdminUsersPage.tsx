"use client";

import { useMemo, useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import type { AdminUserRow } from "@/features/admin/types";

type Props = {
  users: AdminUserRow[];
};

const PAGE_SIZE = 25;

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

export default function AdminUsersPage({ users }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q));
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [totalPages, page]);

  const pageUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#0d0f14] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/[0.08]">
            <UsersIcon className="size-4.5 text-gray-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Super Admin · Users</h1>
            <p className="text-xs text-gray-500">{users.length.toLocaleString()} total users</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5">
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
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold text-right">Apps</th>
                  <th className="px-5 py-3 font-semibold text-right">Keywords</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {pageUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 text-white truncate max-w-xs">{u.email}</td>
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
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-600">No users match your search.</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.07] text-xs text-gray-500">
              <span>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
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

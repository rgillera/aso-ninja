"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  PhoneIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  XMarkIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import {
  CRM_STATUSES,
  CRM_STATUS_LABELS,
  CRM_STATUS_BADGE_CLASSES,
  CRM_STATUS_ACCENT_TEXT,
  DAILY_ACTIVITY_STATUSES,
  type CrmContact,
  type CrmStatus,
  type AgentDailyMetrics,
} from "@/features/agents/types";
import { countryFlag } from "@/libs/countries";
import { phoneCountryCode } from "@/libs/phone-country";
import {
  updateContactAction,
  createContactAction,
  deleteContactAction,
  deleteContactsAction,
  importContactsAction,
  logCallAction,
  type ContactPatch,
} from "@/features/agents/actions";

type Props = { contacts: CrmContact[]; canManage: boolean; dailyMetrics: AgentDailyMetrics };

type SortKey = "appName" | "status" | "nextFollowUpAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "appName", label: "App / Company" },
  { key: "status", label: "Status" },
];

const NEXT_FOLLOW_UP_COLUMN: { key: SortKey; label: string } = { key: "nextFollowUpAt", label: "Next Follow-up" };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// tel: URIs are read most reliably as digits + a leading country code — strip
// spaces/dashes/parens but keep a leading "+". CloudTalk's desktop app and
// Chrome extension intercept tel: links and place the call from there, so no
// API integration is needed for this to work end to end.
function telHref(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return `tel:${plus}${trimmed.replace(/\D/g, "")}`;
}

function compareValues(a: CrmContact, b: CrmContact, key: SortKey): number {
  switch (key) {
    case "appName":
      return a.appName.localeCompare(b.appName);
    case "status":
      return CRM_STATUSES.indexOf(a.status) - CRM_STATUSES.indexOf(b.status);
    case "nextFollowUpAt":
      return (a.nextFollowUpAt ?? "9999-99-99").localeCompare(b.nextFollowUpAt ?? "9999-99-99");
  }
}

function EditableText({
  value,
  placeholder,
  onSave,
  className,
  autoWidth,
}: {
  value: string;
  placeholder?: string;
  onSave: (next: string) => void;
  className?: string;
  autoWidth?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  const shown = focused ? draft : value;

  return (
    <input
      value={shown}
      placeholder={placeholder}
      onFocus={() => {
        setDraft(value);
        setFocused(true);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (draft !== value) onSave(draft);
      }}
      style={autoWidth ? { width: `${Math.max(shown.length, 10) + 2}ch` } : undefined}
      className={`bg-transparent outline-none placeholder-gray-600 light:placeholder-gray-400 focus:bg-white/[0.05] light:focus:bg-black/[0.03] rounded px-1.5 py-1 -mx-1.5 transition-colors ${autoWidth ? "" : "w-full"} ${className ?? ""}`}
    />
  );
}

export default function AgentsCrmPage({ contacts, canManage, dailyMetrics }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CrmStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("nextFollowUpAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [overrides, setOverrides] = useState<Record<string, Partial<CrmContact>>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<CrmContact | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [, startAdd] = useTransition();

  const [importState, setImportState] = useState<{ pending: boolean; message: string | null; isError: boolean }>({
    pending: false,
    message: null,
    isError: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function displayContact(c: CrmContact): CrmContact {
    return { ...c, ...overrides[c.id] };
  }

  function copyAppName(id: string, appName: string) {
    navigator.clipboard.writeText(appName);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
  }

  async function saveField<K extends keyof ContactPatch>(contact: CrmContact, field: K, value: ContactPatch[K]) {
    setOverrides((prev) => ({ ...prev, [contact.id]: { ...prev[contact.id], [field]: value } }));
    setPendingIds((prev) => new Set(prev).add(contact.id));
    setError(null);

    const result = await updateContactAction(contact.id, { [field]: value } as ContactPatch);

    setOverrides((prev) => {
      const next = { ...prev };
      const rowOverride = next[contact.id];
      if (rowOverride) {
        const rest = { ...rowOverride };
        delete rest[field];
        if (Object.keys(rest).length) next[contact.id] = rest;
        else delete next[contact.id];
      }
      return next;
    });
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(contact.id);
      return next;
    });

    if (!result.ok) {
      setError(result.error);
    } else if (field === "status" && result.emailSent) {
      setNotice(`${contact.appName} was emailed about this update.`);
    }
  }

  async function handleDelete(contact: CrmContact) {
    setDeleteTarget(null);
    setDeletingIds((prev) => new Set(prev).add(contact.id));
    setError(null);
    const result = await deleteContactAction(contact.id);
    if (!result.ok) {
      setError(result.error);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
    }
    // On success, the row disappears once the server action's refresh() lands
    // fresh props — deletingIds stays set in the meantime so it reads as
    // "removing…" rather than snapping back before that happens.
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    setShowBulkDeleteConfirm(false);
    setBulkDeleting(true);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setError(null);

    const result = await deleteContactsAction(ids);
    setBulkDeleting(false);

    if (!result.ok) {
      setError(result.error);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    // Rows disappear once refresh() lands fresh props, same as a single
    // delete — clear the selection now so the bulk-actions bar goes away.
    setSelectedIds(new Set());
  }

  function handleAddSubmit() {
    if (!addName.trim()) return;
    startAdd(async () => {
      const result = await createContactAction({ appName: addName, phone: addPhone || null, email: addEmail || null });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAddName("");
      setAddPhone("");
      setAddEmail("");
      setShowAddForm(false);
    });
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportState({ pending: true, message: null, isError: false });
    const formData = new FormData();
    formData.append("file", file);
    const result = await importContactsAction(formData);

    if (result.ok) {
      setImportState({
        pending: false,
        isError: false,
        message: `Imported ${result.created.toLocaleString()} new contact${result.created === 1 ? "" : "s"}${result.skipped ? ` · ${result.skipped.toLocaleString()} already in the CRM, skipped` : ""}.`,
      });
    } else {
      setImportState({ pending: false, isError: true, message: result.error });
    }
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

  // Next Follow-up renders via this too (see NEXT_FOLLOW_UP_COLUMN) but sits
  // further along the row, next to Last Contact — not grouped with the rest
  // of SORT_COLUMNS — so it's a standalone helper rather than folded into
  // that array's .map().
  function renderSortableHeader(col: { key: SortKey; label: string }) {
    return (
      <th key={col.key} className="px-4 py-3 font-semibold whitespace-nowrap">
        <button
          onClick={() => handleSort(col.key)}
          className="flex items-center gap-1 hover:text-gray-300 light:hover:text-gray-700 transition-colors"
        >
          {col.label}
          {sortKey === col.key ? (
            sortDirection === "asc" ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />
          ) : (
            <ChevronUpDownIcon className="size-3 text-gray-700 light:text-gray-300" />
          )}
        </button>
      </th>
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q) {
        const haystack = `${c.appName} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [contacts, search, statusFilter]);

  const sorted = useMemo(() => {
    const factor = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compareValues(a, b, sortKey) * factor);
  }, [filtered, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageContacts = sorted.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE);

  const pageIds = useMemo(() => pageContacts.map((c) => c.id), [pageContacts]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.has(id));

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const today = todayIso();
  const followUpTodayOrOverdue = useMemo(
    () => contacts.filter((c) => c.nextFollowUpAt && c.nextFollowUpAt <= today).length,
    [contacts, today]
  );

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <UserGroupIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Contacts</h1>
            <p className="text-xs text-gray-500">
              {contacts.length.toLocaleString()} contact{contacts.length === 1 ? "" : "s"}
              {followUpTodayOrOverdue > 0 && (
                <> · <span className="text-amber-400 light:text-amber-700">{followUpTodayOrOverdue} due for follow-up</span></>
              )}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {canManage && (
              <>
                <input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={handleImportFile} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importState.pending}
                  className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-3 py-2 text-xs font-medium text-gray-300 light:text-gray-700 hover:bg-white/[0.10] light:hover:bg-black/[0.08] hover:text-white light:hover:text-gray-900 disabled:opacity-50 transition-colors"
                >
                  <ArrowUpTrayIcon className="size-3.5" />
                  {importState.pending ? "Importing…" : "Import from Excel/CSV"}
                </button>
                <button
                  onClick={() => setShowAddForm((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-400 transition-colors"
                >
                  <PlusIcon className="size-3.5" />
                  Add contact
                </button>
              </>
            )}
          </div>
        </div>

        {importState.message && (
          <div
            className={`mb-4 flex items-center justify-between rounded-lg px-4 py-2.5 text-xs ${
              importState.isError
                ? "bg-red-500/10 text-red-400 light:text-red-700"
                : "bg-emerald-500/10 text-emerald-400 light:text-emerald-700"
            }`}
          >
            {importState.message}
            <button onClick={() => setImportState({ pending: false, message: null, isError: false })} className="ml-3 opacity-70 hover:opacity-100">
              <XMarkIcon className="size-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-400 light:text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-3 opacity-70 hover:opacity-100">
              <XMarkIcon className="size-3.5" />
            </button>
          </div>
        )}

        {notice && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400 light:text-emerald-700">
            {notice}
            <button onClick={() => setNotice(null)} className="ml-3 opacity-70 hover:opacity-100">
              <XMarkIcon className="size-3.5" />
            </button>
          </div>
        )}

        {canManage && showAddForm && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#1a1d24] light:bg-white px-4 py-3">
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="App / Company *"
              className="flex-1 min-w-[10rem] bg-white/[0.06] light:bg-black/[0.04] rounded-lg px-3 py-2 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none"
              autoFocus
            />
            <input
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              placeholder="Phone"
              className="w-40 bg-white/[0.06] light:bg-black/[0.04] rounded-lg px-3 py-2 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none"
            />
            <input
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="Email"
              className="w-56 bg-white/[0.06] light:bg-black/[0.04] rounded-lg px-3 py-2 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none"
            />
            <button
              onClick={handleAddSubmit}
              disabled={!addName.trim()}
              className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-lg px-3 py-2 text-xs font-medium text-gray-400 hover:text-white light:hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <p className="mb-2 text-[10px] font-semibold tracking-widest text-gray-600 light:text-gray-400 uppercase">Your activity today</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <div className="rounded-xl bg-indigo-500/10 light:bg-indigo-50 px-4 py-3">
            <p className="text-xl font-bold leading-none text-indigo-400 light:text-indigo-600">{dailyMetrics.callsToday.toLocaleString()}</p>
            <p className="mt-1.5 text-[11px] font-medium text-indigo-300/80 light:text-indigo-700">Calls Today</p>
          </div>
          {DAILY_ACTIVITY_STATUSES.map((s) => (
            <div key={s} className="rounded-xl bg-[#1a1d24] light:bg-white px-4 py-3">
              <p className={`text-xl font-bold leading-none ${CRM_STATUS_ACCENT_TEXT[s]}`}>{(dailyMetrics.statusCounts[s] ?? 0).toLocaleString()}</p>
              <p className="mt-1.5 text-[11px] font-medium text-gray-500">{CRM_STATUS_LABELS[s]}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg bg-[#1a1d24] light:bg-white px-3 py-2.5">
            <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search app, email, phone…"
              className="bg-transparent text-xs text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as CrmStatus | "all"); setPage(0); }}
            className="rounded-lg bg-[#1a1d24] light:bg-white px-3 py-2.5 text-xs text-gray-300 light:text-gray-700 outline-none"
          >
            <option value="all">All statuses</option>
            {CRM_STATUSES.map((s) => (
              <option key={s} value={s}>{CRM_STATUS_LABELS[s]}</option>
            ))}
          </select>

          {canManage && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto rounded-lg bg-red-500/10 px-3 py-2">
              <span className="text-xs font-medium text-red-400 light:text-red-700">
                {selectedIds.size.toLocaleString()} selected
              </span>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-400 disabled:opacity-50 transition-colors"
              >
                <TrashIcon className="size-3.5" />
                {bulkDeleting ? "Deleting…" : "Delete selected"}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs font-medium text-gray-400 hover:text-white light:hover:text-gray-900 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#1a1d24] light:bg-white overflow-hidden shadow-lg shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] light:border-black/[0.08] text-left text-[10px] font-semibold tracking-widest text-gray-600 light:text-gray-400 uppercase">
                  {canManage && (
                    <th className="px-4 py-3 font-semibold w-8">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        ref={(el) => { if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected; }}
                        onChange={toggleSelectAllOnPage}
                        aria-label="Select all contacts on this page"
                        className="size-3.5 rounded cursor-pointer accent-indigo-500"
                      />
                    </th>
                  )}
                  {SORT_COLUMNS.map((col) => renderSortableHeader(col))}
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Phone</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Last Contact</th>
                  {renderSortableHeader(NEXT_FOLLOW_UP_COLUMN)}
                  <th className="px-4 py-3 font-semibold min-w-[14rem]">Notes</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07] light:divide-black/[0.08]">
                {pageContacts.map((raw) => {
                  const c = displayContact(raw);
                  const isPending = pendingIds.has(c.id);
                  const isDeleting = deletingIds.has(c.id);
                  const overdue = c.nextFollowUpAt !== null && c.nextFollowUpAt < today;
                  const dueToday = c.nextFollowUpAt === today;
                  const phoneCc = c.phone ? phoneCountryCode(c.phone) : null;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-white/[0.03] light:hover:bg-black/[0.02] transition-colors ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}
                    >
                      {canManage && (
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelectRow(c.id)}
                            aria-label={`Select ${c.appName}`}
                            className="size-3.5 rounded cursor-pointer accent-indigo-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-2.5 min-w-[11rem]">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyAppName(c.id, c.appName)}
                            className="inline-flex items-center justify-center rounded-full p-1.5 shrink-0 text-gray-500 hover:bg-white/[0.08] light:hover:bg-black/[0.06] hover:text-gray-300 light:hover:text-gray-700 transition-colors"
                            title="Copy app name"
                            aria-label={`Copy ${c.appName}`}
                          >
                            {copiedId === c.id ? (
                              <ClipboardDocumentCheckIcon className="size-3.5 text-emerald-400 light:text-emerald-700" />
                            ) : (
                              <ClipboardIcon className="size-3.5" />
                            )}
                          </button>
                          <EditableText value={c.appName} onSave={(v) => v.trim() && saveField(raw, "appName", v.trim())} className="text-white light:text-gray-900 font-medium" />
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        <select
                          value={c.status}
                          disabled={isPending}
                          onChange={(e) => saveField(raw, "status", e.target.value as CrmStatus)}
                          className={`rounded-full px-2 py-1 text-[11px] font-medium outline-none cursor-pointer disabled:opacity-50 ${CRM_STATUS_BADGE_CLASSES[c.status]}`}
                        >
                          {CRM_STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-[#1a1d24] text-white">{CRM_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {phoneCc && (
                            <span className="text-xs shrink-0" title={phoneCc}>
                              {countryFlag(phoneCc)}
                            </span>
                          )}
                          <EditableText value={c.phone ?? ""} placeholder="—" onSave={(v) => saveField(raw, "phone", v.trim() || null)} className="text-gray-300 light:text-gray-700" autoWidth />
                          {c.phone && (
                            <a
                              href={telHref(c.phone)}
                              onClick={() => {
                                // Fire-and-forget: logs the call for the "Calls
                                // Today" metric and bumps Last Contact to today,
                                // without delaying the tel: hand-off.
                                logCallAction(raw.id);
                                saveField(raw, "lastContactAt", todayIso());
                              }}
                              className="inline-flex p-1.5 rounded text-emerald-400 light:text-emerald-700 hover:bg-emerald-500/10 transition-colors shrink-0"
                              aria-label={`Call ${c.appName}`}
                              title={`Call ${c.phone}`}
                            >
                              <PhoneIcon className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <EditableText
                          value={c.email ?? ""}
                          placeholder="—"
                          onSave={(v) => saveField(raw, "email", v.trim().toLowerCase() || null)}
                          className="text-gray-300 light:text-gray-700"
                          autoWidth
                        />
                      </td>

                      <td className="px-4 py-2.5">
                        <input
                          type="date"
                          value={c.lastContactAt ?? ""}
                          disabled={isPending}
                          onChange={(e) => saveField(raw, "lastContactAt", e.target.value || null)}
                          className="bg-transparent outline-none rounded px-1 py-1 text-gray-300 light:text-gray-700 disabled:opacity-50"
                        />
                      </td>

                      <td className="px-4 py-2.5">
                        <input
                          type="date"
                          value={c.nextFollowUpAt ?? ""}
                          disabled={isPending}
                          onChange={(e) => saveField(raw, "nextFollowUpAt", e.target.value || null)}
                          className={`bg-transparent outline-none rounded px-1 py-1 disabled:opacity-50 ${
                            overdue ? "text-red-400 light:text-red-600 font-medium" : dueToday ? "text-amber-400 light:text-amber-700 font-medium" : "text-gray-300 light:text-gray-700"
                          }`}
                        />
                      </td>

                      <td className="px-4 py-2.5 min-w-[14rem]">
                        <EditableText value={c.notes ?? ""} placeholder="Add a note…" onSave={(v) => saveField(raw, "notes", v.trim() || null)} className="text-gray-300 light:text-gray-700" />
                      </td>

                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {canManage && (
                          <button
                            onClick={() => setDeleteTarget(raw)}
                            className="p-1.5 rounded text-gray-600 hover:text-red-400 light:hover:text-red-600 hover:bg-red-500/10 transition-colors"
                            aria-label={`Remove ${c.appName}`}
                          >
                            <TrashIcon className="size-3.5" />
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
            <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">
              {contacts.length === 0 ? "No contacts yet — import a spreadsheet or add one manually." : "No contacts match your filters."}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.07] light:border-black/[0.08] text-xs text-gray-500">
              <span>
                {clampedPage * PAGE_SIZE + 1}–{Math.min((clampedPage + 1) * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={clampedPage === 0} className="p-1.5 rounded hover:bg-white/[0.06] light:hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-default transition-colors">
                  <ChevronLeftIcon className="size-3.5" />
                </button>
                <span className="px-2">{clampedPage + 1} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={clampedPage === totalPages - 1} className="p-1.5 rounded hover:bg-white/[0.06] light:hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-default transition-colors">
                  <ChevronRightIcon className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#1a1d24] light:bg-white p-5 shadow-xl"
          >
            <h2 className="text-sm font-semibold text-white light:text-gray-900">Remove contact?</h2>
            <p className="mt-2 text-sm text-gray-400 light:text-gray-600">
              Remove <span className="text-white light:text-gray-900 font-medium">{deleteTarget.appName}</span> from the CRM? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-gray-400 hover:text-white light:hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowBulkDeleteConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#1a1d24] light:bg-white p-5 shadow-xl"
          >
            <h2 className="text-sm font-semibold text-white light:text-gray-900">Remove {selectedIds.size.toLocaleString()} contacts?</h2>
            <p className="mt-2 text-sm text-gray-400 light:text-gray-600">
              This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-gray-400 hover:text-white light:hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

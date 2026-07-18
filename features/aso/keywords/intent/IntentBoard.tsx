"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  SparklesIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  CheckIcon,
  TagIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { IntentKeyword, IntentTheme } from "./types";

const THEME_COLORS = [
  { ring: "ring-indigo-500/30", text: "text-indigo-300", dot: "bg-indigo-400" },
  { ring: "ring-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-400" },
  { ring: "ring-violet-500/30", text: "text-violet-300", dot: "bg-violet-400" },
  { ring: "ring-amber-500/30", text: "text-amber-300", dot: "bg-amber-400" },
  { ring: "ring-sky-500/30", text: "text-sky-300", dot: "bg-sky-400" },
  { ring: "ring-rose-500/30", text: "text-rose-300", dot: "bg-rose-400" },
  { ring: "ring-teal-500/30", text: "text-teal-300", dot: "bg-teal-400" },
  { ring: "ring-fuchsia-500/30", text: "text-fuchsia-300", dot: "bg-fuchsia-400" },
];

const OTHER_ID = "__other__";

// Shared "Move to ▾" trigger + dropdown — used both per-row (currentThemeId
// set, so the row's current group is checkmarked) and from the bulk
// selection bar (currentThemeId omitted since a multi-group selection has no
// single "current" theme to highlight).
function ThemeMenuButton({
  label,
  themes,
  currentThemeId,
  onPick,
  buttonClassName,
}: {
  label: React.ReactNode;
  themes: IntentTheme[];
  currentThemeId?: string | null;
  onPick: (themeId: string | null) => void;
  buttonClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // `top` when there's room to drop the menu below the trigger; `bottom`
  // (anchored to the trigger's top edge) when the trigger sits near the
  // bottom of the viewport — e.g. the fixed bulk-selection bar — so the menu
  // opens upward instead of getting clipped off-screen.
  const [pos, setPos] = useState<{ left: number; top: number } | { left: number; bottom: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const MENU_MAX_HEIGHT = 288; // matches max-h-72

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const left = Math.max(8, r.right - 200);
      const spaceBelow = window.innerHeight - r.bottom;
      setPos(
        spaceBelow < MENU_MAX_HEIGHT
          ? { left, bottom: window.innerHeight - r.top + 4 }
          : { left, top: r.bottom + 4 }
      );
    }
    setOpen((v) => !v);
  }

  function pick(themeId: string | null) {
    onPick(themeId);
    setOpen(false);
  }

  return (
    <>
      <button ref={btnRef} onClick={toggle} className={buttonClassName}>
        {label}
        <ChevronDownIcon className="size-3" />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", left: pos.left, ...("top" in pos ? { top: pos.top } : { bottom: pos.bottom }), zIndex: 9999 }}
          className="w-52 bg-[#1a1d24] ring-1 ring-white/[0.12] rounded-xl overflow-hidden shadow-2xl py-1 max-h-72 overflow-y-auto"
        >
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] ${currentThemeId === t.id ? "text-indigo-400" : "text-gray-300"}`}
            >
              {currentThemeId === t.id ? <CheckIcon className="size-3 shrink-0" /> : <span className="w-3 shrink-0" />}
              <span className="truncate">{t.label}</span>
            </button>
          ))}
          <button
            onClick={() => pick(null)}
            className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] border-t border-white/[0.06] mt-1 pt-2 ${currentThemeId === null ? "text-indigo-400" : "text-gray-500"}`}
          >
            {currentThemeId === null ? <CheckIcon className="size-3 shrink-0" /> : <span className="w-3 shrink-0" />}
            Other
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

function RegenerateConfirmDialog({ keywordCount, onCancel, onConfirm }: { keywordCount: number; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-gray-900 ring-1 ring-white/10 shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="shrink-0 flex size-9 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
            <ExclamationTriangleIcon className="size-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Regenerate intent themes?</h2>
            <p className="mt-1 text-sm text-gray-400">
              {`This reclassifies all ${keywordCount} tracked keyword${keywordCount === 1 ? "" : "s"} against a fresh theme list. Any keyword sitting in a generated theme that doesn't recur moves back to "Other." Your own custom-added themes and their keywords are left alone.`}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

function AddIntentRow({ onAddIntent }: { onAddIntent: (label: string) => Promise<string | null> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setValue("");
    setError(null);
  }

  async function submit() {
    const label = value.trim();
    if (!label || saving) return;
    setSaving(true);
    setError(null);
    const err = await onAddIntent(label);
    setSaving(false);
    if (err) { setError(err); return; }
    close();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] hover:ring-white/[0.16] px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-colors"
      >
        <PlusIcon className="size-3.5" />
        Add your own intent
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") close();
          }}
          placeholder="e.g. shared pet care"
          className="flex-1 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus-within:ring-indigo-500/40 px-3 py-2 text-xs text-gray-300 placeholder-gray-600 outline-none"
        />
        <button
          onClick={submit}
          disabled={saving || !value.trim()}
          className="rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 px-3 py-2 text-xs font-semibold text-white transition-colors shrink-0"
        >
          {saving ? "Adding…" : "Add"}
        </button>
        <button onClick={close} className="text-xs text-gray-500 hover:text-gray-300 transition-colors shrink-0 px-1">
          Cancel
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

function GroupSection({
  id,
  label,
  color,
  isManual,
  keywords,
  themes,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onMove,
}: {
  id: string;
  label: string;
  color: typeof THEME_COLORS[number];
  isManual?: boolean;
  keywords: IntentKeyword[];
  themes: IntentTheme[];
  selected: Set<string>;
  onToggleSelect: (term: string) => void;
  onToggleSelectAll: (terms: string[]) => void;
  onMove: (terms: string[], themeId: string | null) => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyGroup() {
    navigator.clipboard.writeText(keywords.map((k) => k.term).join(", ")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  const allSelected = keywords.length > 0 && keywords.every((k) => selected.has(k.term));

  return (
    <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07]">
        {keywords.length > 0 && (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onToggleSelectAll(keywords.map((k) => k.term))}
            className="rounded border-gray-700 bg-[#0d0f14] text-indigo-500 accent-indigo-500 shrink-0"
            title="Select all in this group"
          />
        )}
        <span className={`size-2 rounded-full shrink-0 ${color.dot}`} />
        <span className="text-sm font-semibold text-white truncate">{label}</span>
        {isManual && (
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-white/[0.06] text-gray-400 leading-none">
            CUSTOM
          </span>
        )}
        <span className="text-[10px] font-medium text-gray-500 tabular-nums">{keywords.length}</span>
        <button
          onClick={copyGroup}
          disabled={!keywords.length}
          className={`ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors disabled:opacity-40 disabled:cursor-default ${copied ? "bg-emerald-500/10 ring-emerald-500/30 text-emerald-400" : "bg-[#0d0f14] ring-white/[0.08] text-gray-400 hover:text-white"}`}
          title="Copy every keyword in this group, comma-separated — ready to paste into ASA"
        >
          <ClipboardDocumentIcon className="size-3.5" />
          {copied ? "Copied" : "Copy list"}
        </button>
      </div>
      {keywords.length ? (
        <div className="divide-y divide-white/[0.04]">
          {keywords.map((k) => (
            <div key={k.term} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-white/[0.02] transition-colors">
              <input
                type="checkbox"
                checked={selected.has(k.term)}
                onChange={() => onToggleSelect(k.term)}
                className="rounded border-gray-700 bg-[#0d0f14] text-indigo-500 accent-indigo-500 shrink-0"
              />
              <span className="text-sm text-gray-200 flex-1 truncate">{k.term}</span>
              {k.relevancy !== null && (
                <span className="text-[11px] text-gray-600 tabular-nums shrink-0">rel {k.relevancy}</span>
              )}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <ThemeMenuButton
                  label="Move to"
                  themes={themes}
                  currentThemeId={id === OTHER_ID ? null : id}
                  onPick={(themeId) => onMove([k.term], themeId)}
                  buttonClassName="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-gray-600">No keywords yet — move some in with &ldquo;Move to&rdquo;.</div>
      )}
    </div>
  );
}

function BulkMoveBar({
  count,
  themes,
  onMove,
  onClear,
}: {
  count: number;
  themes: IntentTheme[];
  onMove: (themeId: string | null) => void;
  onClear: () => void;
}) {
  if (!count) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-[#1a1d24] ring-1 ring-white/[0.12] shadow-2xl px-2 py-2">
      <button
        onClick={onClear}
        title="Clear selection"
        className="flex items-center justify-center size-8 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <XMarkIcon className="size-4" />
      </button>
      <span className="px-2 text-xs font-medium text-gray-300 whitespace-nowrap">{count} selected</span>
      <div className="w-px h-5 bg-white/[0.1] mx-1" />
      <ThemeMenuButton
        label="Move to"
        themes={themes}
        onPick={onMove}
        buttonClassName="flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-full text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-white/[0.06] transition-colors"
      />
    </div>
  );
}

export function IntentBoard({
  themes,
  keywords,
  loaded,
  generating,
  classifyProgress,
  onGenerate,
  onMove,
  onAddIntent,
}: {
  themes: IntentTheme[];
  keywords: IntentKeyword[];
  loaded: boolean;
  generating: boolean;
  classifyProgress: { done: number; total: number } | null;
  onGenerate: () => void;
  onMove: (terms: string[], themeId: string | null) => void;
  onAddIntent: (label: string) => Promise<string | null>;
}) {
  const themeIds = new Set(themes.map((t) => t.id));
  const grouped = themes.map((t) => ({
    id: t.id,
    label: t.label,
    isManual: t.isManual,
    color: THEME_COLORS[themes.indexOf(t) % THEME_COLORS.length],
    keywords: keywords.filter((k) => k.intentThemeId === t.id),
  }));
  const other = keywords.filter((k) => k.intentThemeId === null || !themeIds.has(k.intentThemeId));

  const busy = generating || !!classifyProgress;

  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(term: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(term) ? next.delete(term) : next.add(term);
      return next;
    });
  }

  function toggleSelectAll(terms: string[]) {
    setSelected((prev) => {
      const allSelected = terms.every((t) => prev.has(t));
      const next = new Set(prev);
      terms.forEach((t) => (allSelected ? next.delete(t) : next.add(t)));
      return next;
    });
  }

  function bulkMove(themeId: string | null) {
    onMove([...selected], themeId);
    setSelected(new Set());
  }

  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  function handleGenerateClick() {
    // First-time generation has nothing to lose — only a regenerate (themes
    // already exist) can reset an existing manual classification, so that's
    // the only case worth interrupting with a confirmation.
    if (themes.length) setConfirmRegenerate(true);
    else onGenerate();
  }

  return (
    <div className="mx-6 my-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] px-4 py-3.5">
        <TagIcon className="size-5 text-indigo-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Search-intent themes</p>
          <p className="text-xs text-gray-500">
            {themes.length
              ? "Generated from this app's description — regenerating reclassifies every tracked keyword."
              : "Generate a theme list tailored to this app, then every tracked keyword gets classified automatically."}
          </p>
        </div>
        <button
          onClick={handleGenerateClick}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 disabled:cursor-wait px-3.5 py-2 text-xs font-semibold text-white transition-colors shrink-0"
        >
          {busy
            ? <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <SparklesIcon className="size-3.5" />}
          {classifyProgress
            ? `Classifying ${classifyProgress.done}/${classifyProgress.total}…`
            : generating
            ? "Generating…"
            : themes.length ? "Regenerate intents" : "Generate intents"}
        </button>
      </div>

      {!loaded ? (
        <div className="py-16 text-center text-sm text-gray-600">Loading…</div>
      ) : !keywords.length ? (
        <div className="py-16 text-center">
          <TagIcon className="size-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No tracked keywords yet — add some in Keyword Research first.</p>
        </div>
      ) : (
        <>
          <AddIntentRow onAddIntent={onAddIntent} />

          {!themes.length ? (
            <div className="py-16 text-center">
              <SparklesIcon className="size-8 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Click &ldquo;Generate intents&rdquo; or add your own above to start clustering your keywords.</p>
            </div>
          ) : (
            <>
              {grouped.map((g) => (
                <GroupSection
                  key={g.id}
                  id={g.id}
                  label={g.label}
                  isManual={g.isManual}
                  color={g.color}
                  keywords={g.keywords}
                  themes={themes}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onMove={onMove}
                />
              ))}
              <GroupSection
                id={OTHER_ID}
                label="Other"
                color={{ ring: "ring-gray-500/30", text: "text-gray-400", dot: "bg-gray-500" }}
                keywords={other}
                themes={themes}
                selected={selected}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onMove={onMove}
              />
            </>
          )}
        </>
      )}

      <BulkMoveBar count={selected.size} themes={themes} onMove={bulkMove} onClear={() => setSelected(new Set())} />

      {confirmRegenerate && (
        <RegenerateConfirmDialog
          keywordCount={keywords.length}
          onCancel={() => setConfirmRegenerate(false)}
          onConfirm={() => { setConfirmRegenerate(false); onGenerate(); }}
        />
      )}
    </div>
  );
}

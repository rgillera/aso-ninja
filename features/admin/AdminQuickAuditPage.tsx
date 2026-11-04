"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon, CheckIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { runQuickAuditAction } from "@/features/admin/actions";
import type { AuditFinding, QuickAuditResult } from "@/libs/admin/quick-audit";
import { COUNTRIES, countryFlag } from "@/libs/countries";

// Calendly link + signature are the same on every email, so they're
// remembered per browser. In-memory fallback when storage is blocked.
const SETTINGS_KEY = "admin-quick-audit-settings";
type Settings = { calendly: string; signature: string };
const EMPTY_SETTINGS: Settings = { calendly: "", signature: "" };
const settingsListeners = new Set<() => void>();
let settingsMemory: Settings = EMPTY_SETTINGS;
let settingsRaw: string | null = null;

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw === null) return settingsMemory;
    // Same object for the same stored string, as useSyncExternalStore requires.
    if (raw !== settingsRaw) {
      settingsRaw = raw;
      const parsed = JSON.parse(raw);
      settingsMemory = { calendly: String(parsed.calendly ?? ""), signature: String(parsed.signature ?? "") };
    }
    return settingsMemory;
  } catch {
    return settingsMemory;
  }
}

function writeSettings(next: Settings) {
  settingsMemory = next;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* memory covers this page view */ }
  settingsListeners.forEach((l) => l());
}

function subscribeSettings(listener: () => void) {
  settingsListeners.add(listener);
  return () => { settingsListeners.delete(listener); };
}

const CATEGORY_LABEL: Record<AuditFinding["category"], string> = {
  keywords: "Keywords",
  creatives: "Creatives",
  localization: "Localization",
  ratings: "Ratings",
  metadata: "Metadata",
};

function buildEmail(r: QuickAuditResult, picked: AuditFinding[], firstName: string, calendly: string, signature: string) {
  // Only the first keyword finding carries the free-tool line, so the email
  // doesn't repeat the same nudge twice.
  let toolUsed = false;
  const items = picked.map((f, i) => {
    const withTool = f.toolLine && !toolUsed;
    if (withTool) toolUsed = true;
    return `${i + 1}. ${f.text}${withTool ? `\n   ${f.toolLine}` : ""}`;
  });
  return [
    `Hi ${firstName.trim() || "{{FIRST_NAME}}"},`,
    "",
    `Thanks for getting back to me. Here's the quick audit for ${r.shortName}:`,
    "",
    items.join("\n\n"),
    "",
    "Fixing these in the right order usually moves both rankings and conversion within a few weeks.",
    "",
    `Happy to walk you through how we'd approach it. Would a 15-minute call this week work? You can grab a time here: ${calendly.trim() || "{{CALENDLY_LINK}}"}`,
    "",
    "P.S. Want a senior growth specialist in your corner to help you scale? Our Growth Starter includes a full funnel review, a live strategy session, 2 months of support, and a year of AppASO Pro: https://www.appaso.io/growth-starter",
    "",
    signature.trim() || "{{SENDER_SIGNATURE}}",
  ].join("\n");
}

export default function AdminQuickAuditPage() {
  const [url, setUrl] = useState("");
  const [country, setCountry] = useState("");
  const [firstName, setFirstName] = useState("");
  const settings = useSyncExternalStore(subscribeSettings, readSettings, () => EMPTY_SETTINGS);
  const { calendly, signature } = settings;
  const setCalendly = (v: string) => writeSettings({ ...settings, calendly: v });
  const setSignature = (v: string) => writeSettings({ ...settings, signature: v });
  const [result, setResult] = useState<QuickAuditResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    if (!url.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await runQuickAuditAction(url, country || undefined);
      if (!res.ok) { setError(res.error); setResult(null); return; }
      setResult(res.result);
      setSelected(res.result.defaultSelection);
    });
  }

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]);
  }

  const picked = useMemo(
    () => result ? selected.map((id) => result.findings.find((f) => f.id === id)).filter((f): f is AuditFinding => !!f) : [],
    [result, selected],
  );
  const email = result ? buildEmail(result, picked, firstName, calendly, signature) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  }

  const inputCls = "w-full rounded-lg bg-[#141417] light:bg-white px-3 py-2.5 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none border border-white/[0.07] light:border-black/[0.08] focus:border-indigo-500/50";

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <ClipboardDocumentCheckIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Super Admin · Quick Audit</h1>
            <p className="text-xs text-gray-500">Paste an app URL to get 3 ASO findings for the outreach reply</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex flex-col sm:flex-row gap-2 mb-3">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://apps.apple.com/us/app/... or https://play.google.com/store/apps/details?id=..." className={inputCls} autoFocus />
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={`${inputCls} sm:w-44`} aria-label="Country">
            <option value="">Country from URL</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code.toLowerCase()}>{countryFlag(c.code)} {c.label}</option>)}
          </select>
          <button type="submit" disabled={pending || !url.trim()} className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {pending && <ArrowPathIcon className="size-4 animate-spin" />}
            {pending ? "Auditing..." : "Run audit"}
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputCls} />
          <input value={calendly} onChange={(e) => setCalendly(e.target.value)} placeholder="Calendly link" className={inputCls} />
          <textarea value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Signature" rows={1} className={`${inputCls} resize-y`} />
        </div>

        {pending && <p className="text-sm text-gray-500 mb-6">Reading the listing, searching competitors, scoring keywords and reviewing screenshots. This usually takes 30 to 90 seconds.</p>}
        {error && <div className="rounded-lg bg-red-500/10 text-red-400 light:text-red-600 text-sm px-4 py-3 mb-6">{error}</div>}

        {result && !pending && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#141417] light:bg-white p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-base font-semibold text-white light:text-gray-900">{result.appName}</h2>
                <span className="text-xs text-gray-500">
                  {result.store === "ios" ? "App Store" : "Google Play"} · {countryFlag(result.country)} {result.country.toUpperCase()} · {result.category}
                </span>
              </div>
              {result.competitors.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">Competitors found: {result.competitors.join(", ")}</p>
              )}
              {result.notes.map((n) => <p key={n} className="mt-1 text-xs text-amber-500">{n}</p>)}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white light:text-gray-900">Findings</h3>
                <span className="text-xs text-gray-500">{selected.length}/3 selected, in email order</span>
              </div>
              {result.findings.length === 0 ? (
                <div className="rounded-2xl bg-[#141417] light:bg-white px-5 py-8 text-center text-sm text-gray-500">No findings came out of this listing. It may be in good shape, or the store requests failed.</div>
              ) : (
                <div className="rounded-2xl bg-[#141417] light:bg-white divide-y divide-white/[0.07] light:divide-black/[0.08] overflow-hidden">
                  {result.findings.map((f) => {
                    const pos = selected.indexOf(f.id);
                    const disabled = pos < 0 && selected.length >= 3;
                    return (
                      <label key={f.id} className={`flex gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/[0.03] light:hover:bg-black/[0.02] ${disabled ? "opacity-50" : ""}`}>
                        <input type="checkbox" checked={pos >= 0} disabled={disabled} onChange={() => toggle(f.id)} className="mt-1 accent-indigo-500" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {pos >= 0 && <span className="flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">{pos + 1}</span>}
                            <span className="rounded-md bg-white/[0.06] light:bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-medium text-gray-300 light:text-gray-700">{CATEGORY_LABEL[f.category]}</span>
                            <span className="text-[11px] text-gray-500">Impact {f.severity}</span>
                          </div>
                          <p className="text-sm text-gray-200 light:text-gray-800">{f.text}</p>
                          <p className="mt-1 text-xs text-gray-500">{f.evidence}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white light:text-gray-900">Email</h3>
                <button onClick={copy} disabled={!picked.length} className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-3 py-1.5 text-xs font-medium text-gray-200 light:text-gray-800 hover:bg-white/[0.10] light:hover:bg-black/[0.08] disabled:opacity-50">
                  {copied ? <CheckIcon className="size-3.5" /> : <ClipboardDocumentIcon className="size-3.5" />}
                  {copied ? "Copied" : "Copy email"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words rounded-2xl bg-[#141417] light:bg-white p-5 text-sm leading-relaxed text-gray-200 light:text-gray-800 font-sans">{email}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon, CheckIcon, ArrowPathIcon, ClockIcon } from "@heroicons/react/24/outline";
import {
  runQuickAuditAction, getQuickAuditAction, saveQuickAuditEmailAction,
  type QuickAuditSummary,
} from "@/features/admin/actions";
import type { AuditFinding, QuickAuditResult } from "@/libs/admin/quick-audit";
import { COUNTRIES, countryFlag } from "@/libs/countries";

// The email carries two findings, three when the title's tagline barely
// gets searched (see pickDefault in libs/admin/quick-audit.ts).
const MAX_PICKS = 3;

const DEFAULT_CALENDLY = "https://calendly.com/erik-baring-appaso/15min";

const CATEGORY_LABEL: Record<AuditFinding["category"], string> = {
  keywords: "Keywords",
  creatives: "Creatives",
  localization: "Localization",
  ratings: "Ratings",
  metadata: "Metadata",
};

function buildEmail(r: QuickAuditResult, picked: AuditFinding[], firstName: string, calendly: string, uninterested: boolean) {
  // Only the first keyword finding carries the free-tool line, so the email
  // doesn't repeat the same nudge twice.
  let toolUsed = false;
  const items = picked.map((f, i) => {
    const withTool = f.toolLine && !toolUsed;
    if (withTool) toolUsed = true;
    return `${i + 1}. ${f.text}${withTool ? `\n   ${f.toolLine}` : ""}`;
  });
  const greeting = firstName.trim() ? `Hi ${firstName.trim()},` : "Hi there!";
  const link = calendly.trim() || DEFAULT_CALENDLY;
  // They said no: still hand over the audit as a free gift, no ask this
  // week, and leave the door open for later.
  if (uninterested) {
    return [
      greeting,
      "",
      `Thanks for letting me know, totally understand. I'd already put together a quick audit for ${r.shortName}, so here it is, free, in case it's useful:`,
      "",
      items.join("\n\n"),
      "",
      "No strings attached. Feel free to use these however you like.",
      "",
      "If you ever decide to put more into ASO down the road, I'd be happy to help. You can book a free 15-minute call anytime here:",
      link,
      "",
      `Wishing you all the best with ${r.shortName}!`,
    ].join("\n");
  }
  return [
    greeting,
    "",
    `Thanks for getting back to me. Here's the quick audit for ${r.shortName}:`,
    "",
    items.join("\n\n"),
    "",
    "If your app isn't ranking in the top 10 for relevant keywords, those search impressions and downloads are going to your competitors instead.",
    "",
    `I'd be happy to walk you through how we'd get ${r.shortName} into the top 10 for your target keywords.`,
    "",
    "Open to a free 15-minute call this week? No commitment.",
    "",
    "Book a time here:",
    link,
  ].join("\n");
}

// URLs end before whitespace, and drop trailing sentence punctuation / a
// closing paren ("...appaso.io/ (just search" keeps the slash).
const URL_RE = /https?:\/\/[^\s]+?(?=[.,;:!?)]*(?:\s|$))/g;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Rich-text copy of the email, so links stay clickable when pasted into
// Gmail / Outlook. Indented lines keep their indent.
function emailToHtml(text: string) {
  const body = text.split("\n").map((line) => {
    let out = "", last = 0;
    for (const m of line.matchAll(URL_RE)) {
      out += escapeHtml(line.slice(last, m.index)) + `<a href="${escapeHtml(m[0])}">${escapeHtml(m[0])}</a>`;
      last = m.index! + m[0].length;
    }
    out += escapeHtml(line.slice(last));
    return out.replace(/^ +/, (sp) => "&nbsp;".repeat(sp.length));
  }).join("<br>");
  return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">${body}</div>`;
}

function LinkifiedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    parts.push(text.slice(last, m.index));
    parts.push(<a key={m.index} href={m[0]} target="_blank" rel="noreferrer" className="text-indigo-400 light:text-indigo-600 underline underline-offset-2">{m[0]}</a>);
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminQuickAuditPage({ initialHistory }: { initialHistory: QuickAuditSummary[] }) {
  const [url, setUrl] = useState("");
  const [country, setCountry] = useState("");
  const [fullAudit, setFullAudit] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [calendly, setCalendly] = useState(DEFAULT_CALENDLY);
  const [uninterested, setUninterested] = useState(false);
  const [result, setResult] = useState<QuickAuditResult | null>(null);
  const [auditId, setAuditId] = useState("");
  const [auditUrl, setAuditUrl] = useState("");
  const [auditedAt, setAuditedAt] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function run(targetUrl = url, targetCountry = country) {
    if (!targetUrl.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await runQuickAuditAction(targetUrl, targetCountry || undefined, fullAudit);
      if (!res.ok) { setError(res.error); setResult(null); setAuditId(""); return; }
      const { record } = res;
      setResult(record.result);
      setSelected(record.selected);
      setAuditId(record.id);
      setAuditUrl(record.url);
      setAuditedAt(record.createdAt);
      if (record.id) {
        setHistory((prev) => [{
          id: record.id, appName: record.result.appName, store: record.result.store,
          country: record.result.country, createdAt: record.createdAt,
        }, ...prev]);
      }
    });
  }

  function openHistory(id: string) {
    if (pending || id === auditId) return;
    setLoadingId(id);
    setError(null);
    startTransition(async () => {
      const record = await getQuickAuditAction(id);
      setLoadingId(null);
      if (!record) { setError("That audit couldn't be loaded."); return; }
      setResult(record.result);
      setSelected(record.selected);
      setAuditId(record.id);
      setAuditUrl(record.url);
      setAuditedAt(record.createdAt);
      setUrl(record.url);
      setCountry("");
      setFirstName(record.firstName);
      setCalendly(record.calendly || DEFAULT_CALENDLY);
      setUninterested(false);
    });
  }

  function reset() {
    setUrl("");
    setCountry("");
    setFirstName("");
    setCalendly(DEFAULT_CALENDLY);
    setUninterested(false);
    setResult(null);
    setAuditId("");
    setAuditUrl("");
    setAuditedAt("");
    setSelected([]);
    setError(null);
  }

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : selected.length >= MAX_PICKS ? selected : [...selected, id];
    setSelected(next);
    if (auditId) saveQuickAuditEmailAction(auditId, next, firstName, calendly).catch(() => {});
  }

  const picked = useMemo(
    () => result ? selected.map((id) => result.findings.find((f) => f.id === id)).filter((f): f is AuditFinding => !!f) : [],
    [result, selected],
  );
  const email = result ? buildEmail(result, picked, firstName, calendly, uninterested) : "";

  async function copy() {
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([emailToHtml(email)], { type: "text/html" }),
          "text/plain": new Blob([email], { type: "text/plain" }),
        })]);
      } else {
        await navigator.clipboard.writeText(email);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
    // What was copied is what was (probably) sent: keep it in history.
    if (auditId) saveQuickAuditEmailAction(auditId, selected, firstName, calendly).catch(() => {});
  }

  const inputCls = "w-full rounded-lg bg-[#141417] light:bg-white px-3 py-2.5 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none border border-white/[0.07] light:border-black/[0.08] focus:border-indigo-500/50";
  const ghostBtn = "flex items-center gap-1.5 rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-3 py-1.5 text-xs font-medium text-gray-200 light:text-gray-800 hover:bg-white/[0.10] light:hover:bg-black/[0.08] disabled:opacity-50";

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <ClipboardDocumentCheckIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Super Admin · Quick Audit</h1>
            <p className="text-xs text-gray-500">Paste an app URL to get 2 or 3 keyword findings for the outreach reply</p>
          </div>
          <button type="button" onClick={reset} disabled={pending} className={ghostBtn}>
            <ArrowPathIcon className="size-3.5" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_16rem] gap-6">
          <div className="min-w-0">
            <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex flex-col sm:flex-row gap-2 mb-3">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://apps.apple.com/us/app/... or https://play.google.com/store/apps/details?id=..." className={inputCls} autoFocus />
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={`${inputCls} sm:w-44`} aria-label="Country">
                <option value="">Country from URL</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code.toLowerCase()}>{countryFlag(c.code)} {c.label}</option>)}
              </select>
              <button type="submit" disabled={pending || !url.trim()} className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
                {pending && !loadingId && <ArrowPathIcon className="size-4 animate-spin" />}
                {pending && !loadingId ? "Auditing..." : "Run audit"}
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputCls} />
              <input value={calendly} onChange={(e) => setCalendly(e.target.value)} placeholder="Calendly link" className={inputCls} />
            </div>

            <label className="flex items-start gap-2 mb-6 text-xs text-gray-400 light:text-gray-600 cursor-pointer">
              <input type="checkbox" checked={fullAudit} onChange={(e) => setFullAudit(e.target.checked)} className="mt-0.5 accent-indigo-500" />
              <span>
                Full audit
                <span className="text-gray-500"> · also reviews screenshots (Gemini), localization and category benchmarks as extra findings. Slower, and uses more store requests.</span>
              </span>
            </label>

            {pending && !loadingId && <p className="text-sm text-gray-500 mb-6">{fullAudit
              ? "Reading the listing, checking keywords, reviewing screenshots and comparing against the category. This usually takes 30 to 90 seconds."
              : "Reading the listing, finding competitors and checking keywords. This usually takes 10 to 60 seconds."}</p>}
            {error && <div className="rounded-lg bg-red-500/10 text-red-400 light:text-red-600 text-sm px-4 py-3 mb-6">{error}</div>}

            {result && !(pending && !loadingId) && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-[#141417] light:bg-white p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-base font-semibold text-white light:text-gray-900">{result.appName}</h2>
                    <span className="text-xs text-gray-500">
                      {result.store === "ios" ? "App Store" : "Google Play"} · {countryFlag(result.country)} {result.country.toUpperCase()} · {result.category}
                      {auditedAt && <> · audited {formatWhen(auditedAt)}</>}
                    </span>
                    {/* Same app and store country as this audit, whatever the form now holds. */}
                    <button type="button" onClick={() => run(auditUrl, result.country.toLowerCase())} disabled={pending || !auditUrl} className={`${ghostBtn} ml-auto self-center`}>
                      <ArrowPathIcon className="size-3.5" />
                      Re-run
                    </button>
                  </div>
                  {result.competitors.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">Competitors found: {result.competitors.join(", ")}</p>
                  )}
                  {result.notes.map((n) => <p key={n} className="mt-1 text-xs text-amber-500">{n}</p>)}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white light:text-gray-900">Email</h3>
                    <label className="ml-auto mr-3 flex items-center gap-2 text-xs text-gray-400 light:text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={uninterested} onChange={(e) => setUninterested(e.target.checked)} className="accent-indigo-500" />
                      Not interested
                    </label>
                    <button onClick={copy} disabled={!picked.length} className={ghostBtn}>
                      {copied ? <CheckIcon className="size-3.5" /> : <ClipboardDocumentIcon className="size-3.5" />}
                      {copied ? "Copied" : "Copy email"}
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap break-words rounded-2xl bg-[#141417] light:bg-white p-5 text-sm leading-relaxed text-gray-200 light:text-gray-800">
                    <LinkifiedText text={email} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white light:text-gray-900">Findings</h3>
                    <span className="text-xs text-gray-500">{selected.length}/{MAX_PICKS} selected, in email order</span>
                  </div>
                  {result.findings.length === 0 ? (
                    <div className="rounded-2xl bg-[#141417] light:bg-white px-5 py-8 text-center text-sm text-gray-500">No findings came out of this listing. It may be in good shape, or the store requests failed.</div>
                  ) : (
                    <div className="rounded-2xl bg-[#141417] light:bg-white divide-y divide-white/[0.07] light:divide-black/[0.08] overflow-hidden">
                      {result.findings.map((f) => {
                        const pos = selected.indexOf(f.id);
                        const disabled = pos < 0 && selected.length >= MAX_PICKS;
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
              </div>
            )}
          </div>

          <aside className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="size-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-white light:text-gray-900">History</h3>
            </div>
            {history.length === 0 ? (
              <div className="rounded-2xl bg-[#141417] light:bg-white px-4 py-6 text-center text-xs text-gray-500">Audits you run show up here.</div>
            ) : (
              <div className="rounded-2xl bg-[#141417] light:bg-white divide-y divide-white/[0.07] light:divide-black/[0.08] overflow-hidden lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => openHistory(h.id)}
                    disabled={pending && loadingId !== h.id}
                    className={`block w-full text-left px-4 py-3 transition-colors ${h.id === auditId ? "bg-white/[0.06] light:bg-indigo-50" : "hover:bg-white/[0.03] light:hover:bg-black/[0.02]"}`}
                  >
                    <div className="flex items-center gap-2">
                      <img src={h.store === "ios" ? "/app-store.svg" : "/google-play.svg"} alt="" className="size-3.5 shrink-0" />
                      <span className="truncate text-sm text-gray-200 light:text-gray-800">{h.appName}</span>
                      {loadingId === h.id && <ArrowPathIcon className="ml-auto size-3.5 shrink-0 animate-spin text-gray-500" />}
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500" suppressHydrationWarning>
                      {countryFlag(h.country)} {h.country.toUpperCase()} · {formatWhen(h.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

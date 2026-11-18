"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon, CheckIcon, ArrowPathIcon, ClockIcon, MagnifyingGlassIcon, CodeBracketIcon } from "@heroicons/react/24/outline";
import {
  runQuickAuditAction, getQuickAuditAction, saveQuickAuditEmailAction, saveQuickAuditFollowupAction, runQuickAuditFollowupAction, listQuickAuditsAction,
  type QuickAuditSummary,
} from "@/features/admin/actions";
import type { AuditFinding, QuickAuditResult } from "@/libs/admin/quick-audit";
import { COUNTRIES, countryFlag } from "@/libs/countries";

// The email carries two findings by default, title first then long tail
// (see pickDefault in libs/admin/quick-audit.ts); a third can be ticked.
const MAX_PICKS = 3;

const DEFAULT_CALENDLY = "https://calendly.com/erik-baring-appaso/15min";

const CATEGORY_LABEL: Record<AuditFinding["category"], string> = {
  keywords: "Keywords",
  creatives: "Creatives",
  localization: "Localization",
  ratings: "Ratings",
  metadata: "Metadata",
};

type EmailMode = "audit" | "uninterested" | "followup";

function buildEmail(r: QuickAuditResult, picked: AuditFinding[], firstName: string, calendly: string, mode: EmailMode, sentCount = 0) {
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
  // No reply to the audit: one last note that leads with new value (findings
  // the first email didn't carry), a soft ask, and a clean exit.
  if (mode === "followup") {
    const fresh = picked.map((f, i) => `${i + 1}. ${f.text}`);
    const total = sentCount + picked.length;
    // Name a real competitor when the audit found one: "where X beats you"
    // lands harder than "your competitors".
    const rival = r.competitors[0];
    return [
      greeting,
      "",
      `Quick follow-up on the audit I sent for ${r.shortName}. I took a second look and found ${picked.length === 1 ? "one more thing" : "a couple more things"} worth fixing:`,
      "",
      fresh.join("\n\n"),
      "",
      total > picked.length
        ? `That's ${total} quick wins so far, and it's only what I can see from the outside.`
        : "And that's only what I can see from the outside.",
      "",
      `On a free 15-minute call, I'll go through ${r.shortName} with you live and show you:`,
      "",
      rival
        ? `- The keywords ${rival} and your other competitors rank for that you're missing`
        : "- The keywords your competitors rank for that you're missing",
      "- The changes I'd make first to grow your downloads",
      `- A growth strategy built for ${r.shortName}`,
      "",
      "You'll leave with a clear plan you can act on yourself, whether we work together or not.",
      "",
      "Book a time here:",
      link,
      "",
      "If now isn't the right time, no worries. This is my last note, and both audits are yours to keep either way.",
    ].join("\n");
  }
  // They said no: still hand over the audit as a free gift, no ask this
  // week, and leave the door open for later.
  if (mode === "uninterested") {
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

// The email as an HTML snippet, links as <a>. Indented lines keep their indent.
function emailToHtmlSnippet(text: string) {
  const body = text.split("\n").map((line) => {
    let out = "", last = 0;
    for (const m of line.matchAll(URL_RE)) {
      out += escapeHtml(line.slice(last, m.index)) + `<a href="${escapeHtml(m[0])}" target="_blank" style="color: #1155cc; text-decoration: underline;">${escapeHtml(m[0])}</a>`;
      last = m.index! + m[0].length;
    }
    out += escapeHtml(line.slice(last));
    return out.replace(/^ +/, (sp) => "&nbsp;".repeat(sp.length));
  }).join("<br>");
  return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">${body}</div>`;
}

// Rich-text copy of the email, so links stay clickable when pasted into
// Gmail / Outlook.
function emailToHtml(text: string) {
  // A full document with fragment markers: some mail clients (Outlook, Apple
  // Mail) drop the links from a bare HTML snippet on paste and keep only text.
  return `<html><body><!--StartFragment-->${emailToHtmlSnippet(text)}<!--EndFragment--></body></html>`;
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

// Seconds since mount, ticking, so a long run visibly isn't stuck.
function Elapsed() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>;
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
  const [mode, setMode] = useState<EmailMode>("audit");
  const [followupResult, setFollowupResult] = useState<QuickAuditResult | null>(null);
  const [followupSelected, setFollowupSelected] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<QuickAuditResult | null>(null);
  const [auditId, setAuditId] = useState("");
  const [auditUrl, setAuditUrl] = useState("");
  const [auditedAt, setAuditedAt] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"" | "email" | "html">("");
  const [history, setHistory] = useState(initialHistory);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);
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
      setFollowupResult(record.followupResult);
      setFollowupSelected(record.followupSelected);
      setMode("audit");
      setAuditId(record.id);
      setAuditUrl(record.url);
      setAuditedAt(record.createdAt);
      if (record.id) {
        setHistory((prev) => [{
          id: record.id, appName: record.result.appName, store: record.result.store,
          country: record.result.country, createdAt: record.createdAt, hasFollowup: false,
        }, ...prev]);
      }
    });
  }

  // `followup` (the card's hover "2nd audit" button) opens the audit straight
  // on its follow-up, generating it first if it hasn't been run yet.
  function openHistory(id: string, followup = false) {
    if (pending) return;
    if (id === auditId) { if (followup) switchMode("followup"); return; }
    setLoadingId(id);
    setError(null);
    startTransition(async () => {
      const record = await getQuickAuditAction(id);
      setLoadingId(null);
      if (!record) { setError("That audit couldn't be loaded."); return; }
      setResult(record.result);
      setSelected(record.selected);
      setFollowupResult(record.followupResult);
      setFollowupSelected(record.followupSelected);
      setAuditId(record.id);
      setAuditUrl(record.url);
      setAuditedAt(record.createdAt);
      setUrl(record.url);
      setCountry("");
      setFirstName(record.firstName);
      setCalendly(record.calendly || DEFAULT_CALENDLY);
      // Reopening an audit that already has a follow-up drafted lands on it.
      setMode(followup || record.followupResult ? "followup" : "audit");
      if (followup && !record.followupResult) await runFollowup(record.id);
    });
  }

  function reset() {
    setUrl("");
    setCountry("");
    setFirstName("");
    setCalendly(DEFAULT_CALENDLY);
    setMode("audit");
    setResult(null);
    setAuditId("");
    setAuditUrl("");
    setAuditedAt("");
    setSelected([]);
    setFollowupResult(null);
    setFollowupSelected([]);
    setError(null);
  }

  // Follow-up: a fresh full audit that skips every keyword and finding the
  // first email carried (runQuickAuditFollowupAction), run once on the first
  // tick and kept with the audit.
  async function runFollowup(id: string) {
    setError(null);
    setGenerating(true);
    const res = await runQuickAuditFollowupAction(id);
    setGenerating(false);
    if (!res.ok) { setError(res.error); return; }
    setFollowupResult(res.record.followupResult);
    setFollowupSelected(res.record.followupSelected);
    const has = res.record.followupSelected.length > 0;
    setHistory((prev) => prev.map((h) => h.id === id ? { ...h, hasFollowup: has } : h));
  }

  function generateFollowup() {
    if (!auditId || pending) return;
    startTransition(async () => {
      // The first email's picks as they stand now are what it excludes.
      await saveQuickAuditEmailAction(auditId, selected, firstName, calendly).catch(() => {});
      await runFollowup(auditId);
    });
  }

  // Server-side, so audits past the newest 100 are findable too. Debounced;
  // a slower earlier response never overwrites a newer one.
  function onSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const seq = ++searchSeq.current;
      setSearching(true);
      const rows = await listQuickAuditsAction(value).catch(() => null);
      if (seq !== searchSeq.current) return;
      setSearching(false);
      if (rows) setHistory(rows);
    }, 250);
  }

  function switchMode(next: EmailMode) {
    setMode(next);
    if (next === "followup" && !followupResult) generateFollowup();
  }

  function toggle(id: string) {
    if (mode === "followup") {
      const next = followupSelected.includes(id) ? followupSelected.filter((x) => x !== id) : followupSelected.length >= MAX_PICKS ? followupSelected : [...followupSelected, id];
      setFollowupSelected(next);
      if (auditId) saveQuickAuditFollowupAction(auditId, next).catch(() => {});
      return;
    }
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : selected.length >= MAX_PICKS ? selected : [...selected, id];
    setSelected(next);
    if (auditId) saveQuickAuditEmailAction(auditId, next, firstName, calendly).catch(() => {});
  }

  // A main audit run (not a history load or a follow-up generating), which
  // swaps the result panel for the progress message.
  const auditing = pending && !loadingId && !generating;
  const followup = mode === "followup";
  const activePicks = followup ? followupSelected : selected;
  // The follow-up lists and emails findings from its own run.
  const listed = followup ? followupResult : result;
  const picked = useMemo(
    () => listed ? activePicks.map((id) => listed.findings.find((f) => f.id === id)).filter((f): f is AuditFinding => !!f) : [],
    [listed, activePicks],
  );
  const email = !result ? ""
    : followup && !followupResult ? (generating ? "" : "Tick Follow-up again to generate new findings.")
    : buildEmail(followup && followupResult ? followupResult : result, picked, firstName, calendly, mode, selected.length);

  function markCopied(kind: "email" | "html") {
    setCopied(kind);
    setTimeout(() => setCopied(""), 1500);
    // What was copied is what was (probably) sent: keep it in history.
    if (auditId) {
      saveQuickAuditEmailAction(auditId, selected, firstName, calendly).catch(() => {});
      if (followup) saveQuickAuditFollowupAction(auditId, followupSelected).catch(() => {});
    }
  }

  // The raw HTML source as plain text, for editors that strip formatting on
  // paste (ManyReach's reply box) but take HTML in their source view.
  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(emailToHtmlSnippet(email));
      markCopied("html");
    } catch { /* clipboard blocked */ }
  }

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
      markCopied("email");
    } catch { /* clipboard blocked */ }
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
            <p className="text-xs text-gray-500">Paste an app URL to get a title finding and a long-tail finding for the outreach reply</p>
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
                {auditing && <ArrowPathIcon className="size-4 animate-spin" />}
                {auditing ? "Auditing..." : "Run audit"}
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

            {auditing && <p className="text-sm text-gray-500 mb-6">{fullAudit
              ? "Reading the listing, checking keywords, reviewing screenshots and comparing against the category. This usually takes 30 to 90 seconds."
              : "Reading the listing, finding competitors and checking keywords. This usually takes 10 to 60 seconds."}</p>}
            {error && <div className="rounded-lg bg-red-500/10 text-red-400 light:text-red-600 text-sm px-4 py-3 mb-6">{error}</div>}

            {result && !(auditing) && (
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
                    <label className="ml-auto mr-3 flex items-center gap-2 text-xs text-gray-400 light:text-gray-600 cursor-pointer" title="Final follow-up when they didn't reply or book: new findings only">
                      <input type="checkbox" checked={followup} onChange={(e) => switchMode(e.target.checked ? "followup" : "audit")} className="accent-indigo-500" />
                      Follow-up
                      {generating && <ArrowPathIcon className="size-3.5 animate-spin text-indigo-500" />}
                    </label>
                    <label className="mr-3 flex items-center gap-2 text-xs text-gray-400 light:text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={mode === "uninterested"} onChange={(e) => switchMode(e.target.checked ? "uninterested" : "audit")} className="accent-indigo-500" />
                      Not interested
                    </label>
                    <button onClick={copyHtml} disabled={!picked.length} className={`${ghostBtn} mr-2`} title="Raw HTML, for an editor's source or HTML view (keeps the links clickable)">
                      {copied === "html" ? <CheckIcon className="size-3.5" /> : <CodeBracketIcon className="size-3.5" />}
                      {copied === "html" ? "Copied" : "Copy HTML"}
                    </button>
                    <button onClick={copy} disabled={!picked.length} className={ghostBtn}>
                      {copied === "email" ? <CheckIcon className="size-3.5" /> : <ClipboardDocumentIcon className="size-3.5" />}
                      {copied === "email" ? "Copied" : "Copy email"}
                    </button>
                  </div>
                  {followup && generating && (
                    <div className="rounded-2xl bg-[#141417] light:bg-white p-5 ring-1 ring-indigo-500/30">
                      <div className="flex items-center gap-3">
                        <ArrowPathIcon className="size-5 shrink-0 animate-spin text-indigo-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white light:text-gray-900">Generating the 2nd audit...</p>
                          <p className="mt-0.5 text-xs text-gray-500">Running a full audit for new findings, skipping everything the first email covered. This usually takes 30 to 90 seconds.</p>
                        </div>
                        <span className="shrink-0 text-xs text-gray-500"><Elapsed /></span>
                      </div>
                      <div className="mt-4 h-1 overflow-hidden rounded-full bg-indigo-500/15">
                        <div className="h-full w-full animate-pulse rounded-full bg-indigo-500/60" />
                      </div>
                    </div>
                  )}
                  {followup && followupResult && followupResult.findings.length === 0 && (
                    <p className="mb-2 text-xs text-amber-500">No new findings beyond what the first email covered. Try Regenerate, or another store country.</p>
                  )}
                  {followup && followupResult?.notes.map((n) => <p key={n} className="mb-2 text-xs text-amber-500">{n}</p>)}
                  {!(followup && generating) && <div className="whitespace-pre-wrap break-words rounded-2xl bg-[#141417] light:bg-white p-5 text-sm leading-relaxed text-gray-200 light:text-gray-800">
                    <LinkifiedText text={email} />
                  </div>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white light:text-gray-900">Findings</h3>
                    <span className="ml-auto text-xs text-gray-500">{activePicks.length}/{MAX_PICKS} selected{followup ? " for the follow-up" : ""}, in email order</span>
                    {followup && followupResult && (
                      <button type="button" onClick={generateFollowup} disabled={pending} className={`${ghostBtn} ml-3`}>
                        <ArrowPathIcon className={`size-3.5 ${generating ? "animate-spin" : ""}`} />
                        Regenerate
                      </button>
                    )}
                  </div>
                  {followup && generating ? (
                    <div className="rounded-2xl bg-[#141417] light:bg-white divide-y divide-white/[0.07] light:divide-black/[0.08] overflow-hidden" aria-busy="true">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex gap-3 px-5 py-4 animate-pulse">
                          <div className="mt-1 size-3.5 shrink-0 rounded bg-white/[0.08] light:bg-black/[0.08]" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3 w-24 rounded bg-white/[0.08] light:bg-black/[0.08]" />
                            <div className="h-3 w-full rounded bg-white/[0.06] light:bg-black/[0.06]" />
                            <div className="h-3 w-2/3 rounded bg-white/[0.06] light:bg-black/[0.06]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : followup && !followupResult ? null : !listed || listed.findings.length === 0 ? (
                    <div className="rounded-2xl bg-[#141417] light:bg-white px-5 py-8 text-center text-sm text-gray-500">No findings came out of this listing. It may be in good shape, or the store requests failed.</div>
                  ) : (
                    <div className="rounded-2xl bg-[#141417] light:bg-white divide-y divide-white/[0.07] light:divide-black/[0.08] overflow-hidden">
                      {listed.findings.map((f) => {
                        const pos = activePicks.indexOf(f.id);
                        const disabled = pos < 0 && activePicks.length >= MAX_PICKS;
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
            <div className="relative mb-2">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search apps" aria-label="Search audit history" className={`${inputCls} pl-9 pr-9`} />
              {searching && <ArrowPathIcon className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-gray-500" />}
            </div>
            {history.length === 0 ? (
              <div className="rounded-2xl bg-[#141417] light:bg-white px-4 py-6 text-center text-xs text-gray-500">{search.trim() ? "No audits match that name." : "Audits you run show up here."}</div>
            ) : (
              <div className="rounded-2xl bg-[#141417] light:bg-white divide-y divide-white/[0.07] light:divide-black/[0.08] overflow-hidden lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
                {history.map((h) => (
                  // Sibling buttons (a button can't hold another): the card
                  // opens the audit, the hover one opens its follow-up.
                  <div key={h.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => openHistory(h.id)}
                      disabled={pending && loadingId !== h.id}
                      className={`block w-full text-left px-4 py-3 transition-colors ${h.id === auditId ? "bg-white/[0.06] light:bg-indigo-50" : "hover:bg-white/[0.03] light:hover:bg-black/[0.02]"}`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={h.store === "ios" ? "/app-store.svg" : "/google-play.svg"} alt="" className="size-3.5 shrink-0" />
                        <span className="truncate text-sm text-gray-200 light:text-gray-800">{h.appName}</span>
                        {(loadingId === h.id || (generating && h.id === auditId)) && <ArrowPathIcon className="ml-auto size-3.5 shrink-0 animate-spin text-indigo-500" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-500" suppressHydrationWarning>
                        {countryFlag(h.country)} {h.country.toUpperCase()} · {formatWhen(h.createdAt)}
                        {h.hasFollowup && <span className="ml-1.5 rounded bg-indigo-500/15 px-1 py-px text-[10px] font-medium text-indigo-300 light:text-indigo-600">2nd audit</span>}
                      </p>
                    </button>
                    {loadingId !== h.id && !(generating && h.id === auditId) && (
                      <button
                        type="button"
                        onClick={() => openHistory(h.id, true)}
                        disabled={pending}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity hover:bg-indigo-500 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-0"
                      >
                        {h.hasFollowup ? "Open 2nd audit" : "2nd audit"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

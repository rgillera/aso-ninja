"use client";

import { useState } from "react";
import {
  InformationCircleIcon,
  PencilSquareIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import DashboardSidebar from "@/features/dashboard/DashboardSidebar";
import AppSwitcher from "@/features/aso/AppSwitcher";
import type { App, Workspace } from "@/libs/contracts";

type StoreData = {
  screenshotUrls: string[];
  subtitle: string;
  description: string;
  releaseNotes: string;
  rating?: number;
  ratingCount?: number;
  primaryGenreName: string;
  contentAdvisoryRating: string;
  version?: string;
} | null;

type Props = {
  app: App;
  allApps: App[];
  workspaces: Workspace[];
  storeData: StoreData;
};

type Status = "green" | "orange" | "red";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusDot(s: Status, cls = "size-2") {
  const c = s === "green" ? "bg-green-400" : s === "orange" ? "bg-orange-400" : "bg-red-400";
  return <span className={`${cls} rounded-full shrink-0 inline-block ${c}`} />;
}

function charBadge(msg: string, status: Status) {
  const ring = status === "green"
    ? "bg-green-500/10 text-green-400 ring-green-500/20"
    : status === "orange"
    ? "bg-orange-500/10 text-orange-400 ring-orange-500/20"
    : "bg-red-500/10 text-red-400 ring-red-500/20";
  const dot = status === "green" ? "bg-green-400" : status === "orange" ? "bg-orange-400" : "bg-red-400";
  const label = msg.split(" — ")[0];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${ring}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function assess(value: string, limit: number, label: string): { status: Status; msg: string } {
  if (!value) return { status: "red", msg: `${label} is missing.` };
  const len = value.length;
  if (limit > 0 && len > limit) return { status: "red", msg: `${len} characters — exceeds ${limit} character limit!` };
  if (limit > 0 && len / limit < 0.45) return { status: "orange", msg: `${len} characters — try using more characters.` };
  const praise =
    label === "Name" ? "The length of the App Name looks great!" :
    label === "Subtitle" ? "Your subtitle looks great!" :
    label === "Description" ? "Your description looks great!" :
    "Looks great!";
  return { status: "green", msg: `${len} characters — ${praise}` };
}

function screenshotStatus(count: number): { status: Status; msg: string } {
  if (count === 0) return { status: "red", msg: "No screenshots — add them." };
  if (count < 3) return { status: "orange", msg: `${count} screenshot${count > 1 ? "s" : ""} — add more for best results.` };
  return { status: "green", msg: `${count} screenshots — great!` };
}

function ratingStatus(rating?: number, count?: number): { status: Status; msg: string } {
  if (!rating) return { status: "red", msg: "No rating data." };
  const rStr = rating.toFixed(1);
  const cStr = count ? count.toLocaleString() : "?";
  if (rating < 3.5) return { status: "red", msg: `${rStr} stars (${cStr} ratings) — needs improvement.` };
  if (rating < 4.0) return { status: "orange", msg: `${rStr} stars (${cStr} ratings) — room to improve.` };
  return { status: "green", msg: `${rStr} stars (${cStr} ratings) — great rating!` };
}

// ─── Report computation ───────────────────────────────────────────────────────

type CategoryResult = { label: string; score: number; items: { label: string; status: Status }[] };

function computeReport(app: App, sd: StoreData) {
  const nameA     = assess(app.name, 30, "Name");
  const subtitleA = assess(sd?.subtitle ?? "", 30, "Subtitle");
  const promoA    = { status: "green" as Status, msg: "Promotional Text looks good." };
  const descA     = assess(sd?.description ?? "", 4000, "Description");
  const shotsA    = screenshotStatus(sd?.screenshotUrls?.length ?? 0);
  const ratingA   = ratingStatus(sd?.rating, sd?.ratingCount);
  const videoSt:  Status = "red";
  const versionSt: Status = sd?.version ? "green" : "orange";
  const watchSt:  Status = app.store === "ios" ? "red" : "green";

  const textsItems   = [{ label: "Name", status: nameA.status }, { label: "Subtitle", status: subtitleA.status }, { label: "Promotional Text", status: promoA.status }, { label: "Description", status: descA.status }];
  const visualsItems = [{ label: "Screenshots", status: shotsA.status }, { label: "Preview Video", status: videoSt }];
  const detailsItems = [{ label: "Size", status: "green" as Status }, { label: app.store === "ios" ? "Apple Watch" : "Tablet UI", status: watchSt }, { label: "Reviews & Ratings", status: ratingA.status }, { label: "Versions", status: versionSt }];

  function avg(items: { status: Status }[]) {
    const pts = items.map((i): number => i.status === "green" ? 100 : i.status === "orange" ? 60 : 0);
    return Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
  }

  const categories: CategoryResult[] = [
    { label: "APP TEXTS",   score: avg(textsItems),   items: textsItems },
    { label: "APP VISUALS", score: avg(visualsItems), items: visualsItems },
    { label: "APP DETAILS", score: avg(detailsItems), items: detailsItems },
  ];

  const overall = Math.round(categories.reduce((a, c) => a + c.score, 0) / categories.length);

  const sections = [
    { id: "name",        label: "Name",                limit: 30,   value: app.name,              assess: nameA },
    { id: "subtitle",    label: "Subtitle",             limit: 30,   value: sd?.subtitle ?? "",    assess: subtitleA },
    { id: "keyword",     label: "Keyword Field",        limit: 100,  value: "",                    assess: { status: "red" as Status, msg: "Keyword field — not available from store data." } },
    { id: "promo",       label: "Promotional Text",     limit: 170,  value: "",                    assess: promoA },
    { id: "description", label: "Description",          limit: 4000, value: sd?.description ?? "", assess: descA },
    { id: "icon",        label: "Icon",                 limit: 0,    value: app.icon_url ?? "",    assess: { status: (app.icon_url ? "green" : "red") as Status, msg: app.icon_url ? "Icon is present." : "No icon found." } },
    { id: "header",      label: "Header",               limit: 0,    value: "",                    assess: { status: "green" as Status, msg: "Header looks good." } },
    { id: "screenshots", label: "Screenshots",          limit: 0,    value: String(sd?.screenshotUrls?.length ?? 0), assess: shotsA },
    { id: "preview",     label: "Preview Video",        limit: 0,    value: "",                    assess: { status: videoSt, msg: "No preview video found." } },
    ...(app.store === "ios" ? [
      { id: "custom_pages",     label: "Custom Product Pages", limit: 0, value: "", assess: { status: "orange" as Status, msg: "Not tracked." } },
      { id: "in_app_events",    label: "In-App Events",        limit: 0, value: "", assess: { status: "orange" as Status, msg: "Not tracked." } },
    ] : []),
    { id: "app_details", label: "App Details",          limit: 0,    value: sd?.primaryGenreName ?? "", assess: { status: (sd?.primaryGenreName ? "green" : "orange") as Status, msg: sd?.primaryGenreName ? `Category: ${sd.primaryGenreName}` : "No category data." } },
    ...(app.store === "ios" ? [
      { id: "in_app_purchases", label: "In-App Purchases", limit: 0, value: "", assess: { status: "orange" as Status, msg: "Not tracked." } },
    ] : []),
    { id: "category",  label: "Category Ranking",      limit: 0, value: "", assess: { status: "orange" as Status, msg: "Not tracked." } },
    { id: "ratings",   label: "Reviews and Ratings",   limit: 0, value: sd?.rating ? `${sd.rating.toFixed(1)} stars` : "", assess: ratingA },
    ...(app.store === "ios" ? [
      { id: "compatibility", label: "iOS Compatibility", limit: 0, value: "", assess: { status: "green" as Status, msg: "Compatible." } },
    ] : []),
    { id: "versions",  label: "Versions",              limit: 0, value: sd?.version ?? "", assess: { status: versionSt, msg: sd?.version ? `Version ${sd.version}` : "Version info not available." } },
  ];

  return { overall, categories, sections };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color   = score >= 80 ? "#22c55e" : score >= 60 ? "#f97316" : "#ef4444";
  const glow    = score >= 80 ? "0 0 24px 4px rgba(34,197,94,0.25)"  : score >= 60 ? "0 0 24px 4px rgba(249,115,22,0.25)" : "0 0 24px 4px rgba(239,68,68,0.25)";

  return (
    <div className="flex flex-col items-center gap-3 shrink-0">
      <div className="relative" style={{ width: 156, height: 156 }}>
        <svg width="156" height="156" viewBox="0 0 156 156" style={{ filter: `drop-shadow(${glow})` }}>
          <circle cx="78" cy="78" r={r} fill="none" stroke="#0d0f14" strokeWidth="12" />
          <circle
            cx="78" cy="78" r={r} fill="none"
            stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90 78 78)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-white leading-none">{score}</span>
          <span className="text-xs text-gray-500 mt-1">/ 100</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-400">
        <span>ASO Score</span>
        <InformationCircleIcon className="size-3.5 text-gray-600" />
      </div>
    </div>
  );
}

function CategoryRow({ cat }: { cat: CategoryResult }) {
  const barColor = cat.score === 100 ? "from-green-500 to-green-400"
    : cat.score >= 60 ? "from-orange-500 to-orange-400"
    : "from-red-600 to-red-400";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <span className="w-[92px] shrink-0 text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase">{cat.label}</span>
        <div className="flex-1 h-2 rounded-full bg-[#0d0f14] overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${cat.score}%` }} />
        </div>
        <span className="w-9 text-right text-xs font-semibold tabular-nums text-gray-300">{cat.score}%</span>
      </div>
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pl-[108px]">
        {cat.items.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-gray-400">
            {statusDot(item.status, "size-1.5")}
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

type SectionEntry = ReturnType<typeof computeReport>["sections"][number];

function ReportSection({ section, app, draft, onDraft }: {
  section: SectionEntry; app: App; draft: string; onDraft: (v: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [highlightKw, setHighlightKw] = useState(false);
  const hasLimit  = section.limit > 0;
  const draftA    = draft ? assess(draft, section.limit, section.label) : null;
  const assessMsg = section.assess.msg;
  const [charPart, descPart] = assessMsg.includes(" — ") ? assessMsg.split(" — ") : [assessMsg, ""];

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors border-b border-white/[0.07] cursor-pointer select-none"
      >
        {statusDot(section.assess.status, "size-2.5")}
        <span className="text-sm font-semibold text-white">{section.label}</span>
        <InformationCircleIcon className="size-3.5 text-gray-600 shrink-0" />
        <div className="ml-auto flex items-center gap-3">
          {hasLimit && (
            <span
              role="presentation"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 text-xs text-gray-500"
            >
              Highlight repeated keywords
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setHighlightKw((v) => !v); }}
                className={`relative inline-flex h-[18px] w-8 shrink-0 rounded-full transition-colors ${highlightKw ? "bg-indigo-500" : "bg-gray-700"}`}
              >
                <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform my-px ${highlightKw ? "translate-x-[14px]" : "translate-x-px"}`} />
              </button>
            </span>
          )}
          {open
            ? <ChevronUpIcon className="size-4 text-gray-500" />
            : <ChevronDownIcon className="size-4 text-gray-500" />}
        </div>
      </div>

      {open && (
        <div className="px-5 py-4 space-y-2.5 border-b border-white/[0.07] bg-[#111318]/40">
          {/* Draft row */}
          <div className="flex items-start gap-3 rounded-xl bg-[#0d0f14] ring-1 ring-white/[0.07] px-4 py-3">
            <PencilSquareIcon className="size-4 text-gray-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {hasLimit ? (
                <textarea
                  rows={section.limit > 200 ? 3 : 1}
                  value={draft}
                  onChange={(e) => onDraft(e.target.value)}
                  placeholder={`Test a new ${section.label}!`}
                  className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none leading-relaxed"
                />
              ) : (
                <span className="text-sm text-gray-600 italic">Test a new {section.label}!</span>
              )}
            </div>
            {draftA ? charBadge(draftA.msg, draftA.status) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1d24] px-2.5 py-1 text-xs font-medium text-gray-500 ring-1 ring-white/[0.08]">
                <span className="size-1.5 rounded-full bg-gray-600" />
                0 characters
              </span>
            )}
          </div>

          {/* Live value row */}
          <div className="flex items-start gap-3 rounded-xl bg-[#1a1d24]/60 ring-1 ring-white/[0.07] px-4 py-3">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="size-6 rounded-lg shrink-0 mt-px object-cover" />
            ) : (
              <div className="size-6 rounded-lg bg-gray-700 shrink-0 mt-px flex items-center justify-center">
                <DevicePhoneMobileIcon className="size-3.5 text-gray-500" />
              </div>
            )}
            <p className={`flex-1 min-w-0 text-sm leading-relaxed ${section.value ? "text-white" : "text-gray-600 italic"}`}>
              {section.value || `No ${section.label.toLowerCase()} data`}
            </p>
            <div className="shrink-0 flex flex-col items-end gap-1.5 ml-3">
              {section.value && charBadge(charPart, section.assess.status)}
              {descPart && <span className="text-[11px] text-gray-500 text-right max-w-[200px] leading-snug">{descPart}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AsoReportPage({ app, allApps, workspaces, storeData }: Props) {
  const { overall, categories, sections } = computeReport(app, storeData);
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const activeSectionObj = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    <div className="flex h-screen bg-[#111318] overflow-hidden">
      <DashboardSidebar
        currentPath="/dashboard/report"
        workspaces={workspaces}
        activeWorkspaceId={app.workspace_id}
        activeAppId={app.id}
      />

      <main className="flex-1 overflow-y-auto bg-[#111318]">
        {/* Page header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <AppSwitcher current={app} apps={allApps} />
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-semibold text-white">ASO Report</h1>
            <InformationCircleIcon className="size-4 text-gray-500" />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary card */}
          <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.07]">
              <h3 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">Summary</h3>
              <InformationCircleIcon className="size-3.5 text-gray-600" />
            </div>
            <div className="flex items-stretch">
              {/* Gauge */}
              <div className="flex items-center justify-center px-10 py-8 border-r border-white/[0.07]">
                <ScoreGauge score={overall} />
              </div>
              {/* Categories */}
              <div className="flex-1 px-8 py-8 space-y-6">
                {categories.map((cat) => (
                  <CategoryRow key={cat.label} cat={cat} />
                ))}
              </div>
            </div>
          </div>

          {/* Detailed View card */}
          <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.07]">
              <h3 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">Detailed View</h3>
              <InformationCircleIcon className="size-3.5 text-gray-600" />
            </div>

            {/* Tab bar */}
            <div className="flex items-start flex-wrap gap-px px-3 pt-2 pb-0 border-b border-white/[0.07] bg-[#111318]/60">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md whitespace-nowrap transition-colors ${
                    activeSection === s.id
                      ? "bg-[#1a1d24] text-white border-b-2 border-indigo-500 -mb-px"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
                  }`}
                >
                  {statusDot(s.assess.status)}
                  {s.label}
                </button>
              ))}
            </div>

            {/* Active section */}
            <ReportSection
              key={activeSectionObj.id}
              section={activeSectionObj}
              app={app}
              draft={drafts[activeSectionObj.id] ?? ""}
              onDraft={(v) => setDrafts((p) => ({ ...p, [activeSectionObj.id]: v }))}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

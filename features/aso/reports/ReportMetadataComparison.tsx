"use client";

import { Fragment, useMemo, useState } from "react";
import {
  PencilSquareIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TableCellsIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { Toggle } from "@/features/aso/keywords/research/ui";
import { computeKeywordDensity, computeTermFrequencies, tokenizeWords, DensityTable } from "@/features/aso/metadata/preview/KeywordDensity";
import { toneFor, scoreVsBenchmark, boolScore, ASO_REFERENCE } from "./asoScore";

type Tone = "neutral" | "emerald" | "amber" | "rose";
type TextField = "App Name" | "Subtitle" | "Short Description" | "Description" | "Release Notes";

export type AppMetadata = {
  name: string;
  iconUrl: string | null;
  title: string;
  subtitle: string;
  description: string;
  releaseNotes: string;
  screenshotUrls: string[];
  screenshotCount: number;
  hasPreviewVideo: boolean;
  rating?: number;
  ratingCount?: number;
  daysSinceUpdate?: number;
  languageCount?: number;
};

type Props = {
  primaryApp: AppMetadata;
  competitors: (AppMetadata & { key: string })[];
  isIos: boolean;
  nameLimit: number;
  subtitleLimit: number;
  onRemoveCompetitor: (key: string) => void;
};

const BADGE_CLASS: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-gray-400 ring-1 ring-white/[0.08]",
  emerald: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",
  rose: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20",
};

const DOT_CLASS: Record<Tone, string> = {
  neutral: "bg-gray-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

function lengthTone(count: number, limit: number): Tone {
  if (count === 0) return "neutral";
  if (count > limit) return "rose";
  return count / limit >= 0.7 ? "emerald" : "amber";
}

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_CLASS[tone]}`}>
      {tone === "emerald" ? <CheckCircleIcon className="size-3.5" /> : <span className={`size-1.5 rounded-full ${DOT_CLASS[tone]}`} />}
      {children}
    </span>
  );
}

function lengthHint(field: TextField, count: number, limit: number): string | null {
  if (count === 0) return null;
  if (count > limit) return `That's ${count - limit} characters over the ${limit}-character limit.`;
  if (count / limit >= 0.7) return field === "App Name" ? "The length of the App Name looks great!" : `Good! Your ${field.toLowerCase()} looks great!`;
  return `You have room for ${limit - count} more characters to fit another keyword.`;
}

// 3+ letter words only, so connectors like "a"/"to"/"of" never count as "repeated".
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
}

// A word only counts once per app even if it repeats within that app's own
// text, so "repeated" means shared *across* apps, not reused within one.
function computeRepeatedWords(texts: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const word of new Set(tokenize(text))) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return new Set([...counts.entries()].filter(([, c]) => c >= 2).map(([w]) => w));
}

function HighlightedText({ text, repeated, active }: { text: string; repeated: Set<string>; active: boolean }) {
  if (!active) return <>{text}</>;
  return (
    <>
      {text.split(/(\s+)/).map((part, i) => {
        const clean = part.toLowerCase().replace(/[^a-z0-9]/g, "");
        return clean.length >= 3 && repeated.has(clean) ? (
          <mark key={i} className="rounded bg-indigo-500/25 text-indigo-200">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

function AppIconCell({ name, iconUrl, onRemove }: { name: string; iconUrl: string | null; onRemove?: () => void }) {
  return (
    <div className="group relative shrink-0">
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt={name} title={name} className="size-9 rounded-xl ring-1 ring-white/[0.08]" />
      ) : (
        <div
          title={name}
          className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] text-[11px] font-semibold text-gray-400 ring-1 ring-white/[0.08]"
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title={`Remove ${name}`}
          className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 shadow ring-1 ring-[#1a1d24] transition-opacity group-hover:opacity-100"
        >
          <XMarkIcon className="size-2.5" />
        </button>
      )}
    </div>
  );
}

function CardShell({
  id, label, tone, children, toggle,
}: {
  id?: string;
  label: string;
  tone?: Tone;
  children: React.ReactNode;
  toggle?: { checked: boolean; onChange: () => void };
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div id={id} className="scroll-mt-4 rounded-3xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          {tone && <span className={`size-2.5 rounded-full ${DOT_CLASS[tone]}`} />}
          <h3 className="text-base font-semibold text-white">{label}</h3>
          <InformationCircleIcon className="size-4 text-gray-600" />
        </div>
        <div className="flex items-center gap-4">
          {toggle && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Toggle checked={toggle.checked} onChange={toggle.onChange} />
              <span className="text-xs text-gray-500 whitespace-nowrap">Highlight repeated keywords</span>
            </label>
          )}
          <button onClick={() => setExpanded((v) => !v)} className="text-gray-500 hover:text-white transition-colors" aria-label={expanded ? "Collapse" : "Expand"}>
            <ChevronUpIcon className={`size-4 transition-transform ${expanded ? "" : "rotate-180"}`} />
          </button>
        </div>
      </div>
      {expanded && <div className="border-t border-white/[0.07]">{children}</div>}
    </div>
  );
}

function Row({
  name, iconUrl, onRemove, children,
}: {
  name: string;
  iconUrl: string | null;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] last:border-b-0">
      <AppIconCell name={name} iconUrl={iconUrl} onRemove={onRemove} />
      {children}
    </div>
  );
}

function TextFieldCard({
  id, label, field, limit, multiline = false, primary, rows, onRemoveCompetitor,
}: {
  id?: string;
  label: string;
  field: TextField;
  limit: number;
  multiline?: boolean;
  primary: { name: string; iconUrl: string | null; text: string };
  rows: { key: string; name: string; iconUrl: string | null; text: string }[];
  onRemoveCompetitor: (key: string) => void;
}) {
  const [highlight, setHighlight] = useState(false);
  const [testValue, setTestValue] = useState("");

  const repeatedWords = useMemo(
    () => computeRepeatedWords([primary.text, ...rows.map((r) => r.text)]),
    [primary.text, rows]
  );
  const primaryHint = lengthHint(field, primary.text.length, limit);

  return (
    <CardShell id={id} label={label} tone={lengthTone(primary.text.length, limit)} toggle={{ checked: highlight, onChange: () => setHighlight((v) => !v) }}>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
        <PencilSquareIcon className="size-4 text-gray-500 shrink-0" />
        <div className="flex-1 flex items-center gap-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] px-3 py-2">
          <Badge tone={lengthTone(testValue.length, limit)}>{testValue.length} characters</Badge>
          {multiline ? (
            <textarea
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder={`Test a new ${field}!`}
              rows={2}
              className="flex-1 min-w-0 resize-none bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            />
          ) : (
            <input
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder={`Test a new ${field}!`}
              className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            />
          )}
        </div>
      </div>

      <Row name={primary.name} iconUrl={primary.iconUrl}>
        <p className={`flex-1 min-w-0 text-sm text-white ${multiline ? "line-clamp-2" : "truncate"}`}>
          <HighlightedText text={primary.text} repeated={repeatedWords} active={highlight} />
        </p>
        <Badge tone={lengthTone(primary.text.length, limit)}>{primary.text.length} characters</Badge>
        {primaryHint && <span className="hidden lg:inline shrink-0 text-xs text-gray-500 max-w-xs">{primaryHint}</span>}
      </Row>

      {rows.map((r) => (
        <Row key={r.key} name={r.name} iconUrl={r.iconUrl} onRemove={() => onRemoveCompetitor(r.key)}>
          <p className={`flex-1 min-w-0 text-sm text-white ${multiline ? "line-clamp-2" : "truncate"}`}>
            <HighlightedText text={r.text} repeated={repeatedWords} active={highlight} />
          </p>
          <Badge tone={lengthTone(r.text.length, limit)}>{r.text.length} characters</Badge>
        </Row>
      ))}
    </CardShell>
  );
}

type CrossDensityRow = { term: string; perApp: { count: number; density: number }[] };

// One row per term, one Count/Density column pair per app — so you can see
// at a glance which keywords a competitor leans on that you don't (or vice
// versa), instead of only ever comparing your own text to itself.
function computeCrossDensity(texts: string[], minCount = 2, maxRows = 20): CrossDensityRow[] {
  const freqs = texts.map((t) => computeTermFrequencies(t));
  const totals = texts.map((t) => tokenizeWords(t).length);

  const order: string[] = [];
  const seen = new Set<string>();
  for (const freq of freqs) {
    for (const term of freq.keys()) {
      if (!seen.has(term)) { seen.add(term); order.push(term); }
    }
  }

  return order
    .filter((term) => freqs.some((f) => (f.get(term) ?? 0) >= minCount))
    .map((term) => ({
      term,
      perApp: freqs.map((f, i) => {
        const count = f.get(term) ?? 0;
        return { count, density: totals[i] ? (count / totals[i]) * 100 : 0 };
      }),
    }))
    .sort((a, b) => b.perApp[0].count - a.perApp[0].count)
    .slice(0, maxRows);
}

function CrossDensityTable({
  apps, rows,
}: {
  apps: { key: string; name: string; iconUrl: string | null }[];
  rows: CrossDensityRow[];
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-gray-600">Not enough description text yet to compare.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-t border-white/[0.08] px-4 py-3 text-left font-medium text-gray-400">Keyword(s)</th>
            {apps.map((a) => (
              <th key={a.key} colSpan={2} className="border-t border-white/[0.08] px-4 py-3">
                <div className="flex justify-center">
                  <AppIconCell name={a.name} iconUrl={a.iconUrl} />
                </div>
              </th>
            ))}
          </tr>
          <tr>
            <th className="border-t border-white/[0.06] px-4 py-2" />
            {apps.map((a) => (
              <Fragment key={a.key}>
                <th className="border-t border-white/[0.06] px-4 py-2 text-right font-medium text-gray-500">Count</th>
                <th className="border-t border-white/[0.06] px-4 py-2 text-right font-medium text-gray-500">Density</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.term}>
              <td className="border-t border-white/[0.08] px-4 py-3 text-gray-200">{row.term}</td>
              {row.perApp.map((cell, i) => (
                <Fragment key={apps[i].key}>
                  <td className="border-t border-white/[0.08] px-4 py-3 text-right text-white">
                    {cell.count > 0 ? cell.count : "-"}
                  </td>
                  <td className="border-t border-white/[0.08] px-4 py-3 text-right text-white">
                    {cell.count > 0 ? `${Number(cell.density.toFixed(1))}%` : "-"}
                  </td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// One app's full description at a time (picked via the icon tabs), paired
// with a keyword-density breakdown of that same text — reusing the density
// table already built for the metadata editor's description field instead
// of re-deriving term frequencies here.
function DescriptionCard({
  primary, rows, limit, onRemoveCompetitor,
}: {
  primary: { name: string; iconUrl: string | null; text: string };
  rows: { key: string; name: string; iconUrl: string | null; text: string }[];
  limit: number;
  onRemoveCompetitor: (key: string) => void;
}) {
  const apps = useMemo(
    () => [{ key: "primary", name: primary.name, iconUrl: primary.iconUrl, text: primary.text }, ...rows],
    [primary, rows]
  );
  const [activeKey, setActiveKey] = useState("primary");
  const [view, setView] = useState<"apps" | "table">("apps");
  const [testing, setTesting] = useState(false);
  const [testDraft, setTestDraft] = useState("");
  const [appliedTest, setAppliedTest] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState(20);

  const active = apps.find((a) => a.key === activeKey) ?? apps[0];
  const displayText = appliedTest ?? active.text;
  const hint = lengthHint("Description", displayText.length, limit);
  const densityRows = useMemo(() => computeKeywordDensity(displayText), [displayText]);
  const crossDensityRows = useMemo(
    () => computeCrossDensity(apps.map((a) => a.text), 2, rowLimit),
    [apps, rowLimit]
  );

  return (
    <CardShell id="description" label="Description" tone={lengthTone(primary.text.length, limit)}>
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
        {apps.map((a) => (
          // AppIconCell renders its own remove <button>, so this tab can't be a
          // <button> itself — nested buttons are invalid HTML and break hydration.
          <div
            key={a.key}
            role="button"
            tabIndex={0}
            onClick={() => { setActiveKey(a.key); setView("apps"); setTesting(false); setAppliedTest(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveKey(a.key); setView("apps"); setTesting(false); setAppliedTest(null); } }}
            className={`cursor-pointer border-b-2 pb-2 transition-colors ${view === "apps" && activeKey === a.key ? "border-emerald-500" : "border-transparent"}`}
          >
            <AppIconCell name={a.name} iconUrl={a.iconUrl} onRemove={a.key === "primary" ? undefined : () => onRemoveCompetitor(a.key)} />
          </div>
        ))}
        <div className="group relative ml-1">
          <button
            onClick={() => setView("table")}
            className={`flex size-9 items-center justify-center rounded-xl ring-1 transition-colors ${view === "table" ? "bg-white/[0.08] ring-white/20 text-white" : "ring-white/[0.08] text-gray-500 hover:text-white"}`}
          >
            <TableCellsIcon className="size-4" />
          </button>
          <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#2a2d36] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Cross-Competitors Density
          </div>
        </div>
      </div>

      {view === "table" ? (
        <div>
          <div className="px-5 py-3">
            <select
              value={rowLimit}
              onChange={(e) => setRowLimit(Number(e.target.value))}
              className="rounded-lg bg-white/[0.03] ring-1 ring-white/[0.08] px-3 py-2 text-sm text-white outline-none"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-[#1a1d24]">Display {n} rows</option>
              ))}
            </select>
          </div>
          <CrossDensityTable apps={apps} rows={crossDensityRows} />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-2">
              <Badge tone={lengthTone(displayText.length, limit)}>{displayText.length} characters</Badge>
              {hint && <span className="text-xs text-gray-500">{hint}</span>}
            </div>
            {activeKey === "primary" && (
              <button
                onClick={() => {
                  const next = !testing;
                  setTesting(next);
                  if (next) setTestDraft(active.text);
                  else setAppliedTest(null);
                }}
                className="flex items-center gap-1.5 rounded-lg ring-1 ring-white/[0.1] px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:ring-white/20 transition-colors"
              >
                <PencilSquareIcon className="size-3.5" />
                Test a new description
                <ChevronDownIcon className={`size-3.5 transition-transform ${testing ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {activeKey === "primary" && testing && (
            <div className="mx-5 mb-4 rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/[0.08]">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <PencilSquareIcon className="size-4 text-gray-400" />
                <span className="text-sm font-medium text-white">Test a new Description for your app!</span>
                <InformationCircleIcon className="size-3.5 text-gray-600" />
                <Badge tone={lengthTone(testDraft.length, limit)}>{testDraft.length} characters</Badge>
              </div>
              <textarea
                value={testDraft}
                onChange={(e) => setTestDraft(e.target.value)}
                rows={8}
                className="w-full resize-none rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none"
              />
              <button
                onClick={() => setAppliedTest(testDraft)}
                className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100"
              >
                Analyze
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-5 pb-5">
            <div className="max-h-96 overflow-y-auto rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06] p-4 text-sm text-gray-300 whitespace-pre-line">
              {displayText || <span className="italic text-gray-600">No description yet.</span>}
            </div>
            <div className="max-h-96 overflow-y-auto rounded-xl ring-1 ring-white/[0.06]">
              <DensityTable rows={densityRows} />
            </div>
          </div>
        </div>
      )}
    </CardShell>
  );
}

function ScreenshotStrip({ urls, height }: { urls: string[]; height: number }) {
  if (urls.length === 0) return <span className="text-xs italic text-gray-600">No screenshots available</span>;
  return (
    <div className="flex gap-2 overflow-x-auto">
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={url} alt="" style={{ height }} className="w-auto shrink-0 rounded-lg ring-1 ring-white/[0.08]" />
      ))}
    </div>
  );
}

// Defaults to the all-apps table view (screenshots are inherently visual, so
// scanning every app's strip side by side is more useful here than the
// one-app-at-a-time view the text fields default to), with per-app tabs
// still available for a single app's full-size gallery.
function ScreenshotsCard({
  primary, rows, onRemoveCompetitor,
}: {
  primary: AppMetadata;
  rows: (AppMetadata & { key: string })[];
  onRemoveCompetitor: (key: string) => void;
}) {
  const apps = useMemo(
    () => [
      { key: "primary", name: primary.name, iconUrl: primary.iconUrl, screenshotUrls: primary.screenshotUrls, screenshotCount: primary.screenshotCount },
      ...rows,
    ],
    [primary, rows]
  );
  const [activeKey, setActiveKey] = useState("primary");
  const [view, setView] = useState<"apps" | "table">("table");

  const active = apps.find((a) => a.key === activeKey) ?? apps[0];
  const target = ASO_REFERENCE.screenshotCount;
  const toneForCount = (count: number) => toneFor(scoreVsBenchmark(count, undefined, target));
  const hint = (count: number) => (count >= target ? "Good screenshot coverage!" : `Add ${target - count} more to reach the recommended minimum of ${target}.`);

  return (
    <CardShell id="screenshots" label="Screenshots" tone={toneForCount(primary.screenshotCount)}>
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
        {apps.map((a) => (
          <div
            key={a.key}
            role="button"
            tabIndex={0}
            onClick={() => { setActiveKey(a.key); setView("apps"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveKey(a.key); setView("apps"); } }}
            className={`cursor-pointer border-b-2 pb-2 transition-colors ${view === "apps" && activeKey === a.key ? "border-emerald-500" : "border-transparent"}`}
          >
            <AppIconCell name={a.name} iconUrl={a.iconUrl} onRemove={a.key === "primary" ? undefined : () => onRemoveCompetitor(a.key)} />
          </div>
        ))}
        <div className="group relative ml-1">
          <button
            onClick={() => setView("table")}
            className={`flex size-9 items-center justify-center rounded-xl ring-1 transition-colors ${view === "table" ? "bg-white/[0.08] ring-white/20 text-white" : "ring-white/[0.08] text-gray-500 hover:text-white"}`}
          >
            <TableCellsIcon className="size-4" />
          </button>
          <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#2a2d36] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Cross-Competitors Screenshots
          </div>
        </div>
      </div>

      {view === "table" ? (
        <div>
          {apps.map((a) => (
            <div key={a.key} className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] last:border-b-0">
              <AppIconCell name={a.name} iconUrl={a.iconUrl} onRemove={a.key === "primary" ? undefined : () => onRemoveCompetitor(a.key)} />
              <div className="flex-1 min-w-0">
                <ScreenshotStrip urls={a.screenshotUrls} height={160} />
              </div>
              <Badge tone={toneForCount(a.screenshotCount)}>{a.screenshotCount} screenshots</Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone={toneForCount(active.screenshotCount)}>{active.screenshotCount} screenshots</Badge>
            <span className="text-xs text-gray-500">{hint(active.screenshotCount)}</span>
          </div>
          <ScreenshotStrip urls={active.screenshotUrls} height={280} />
        </div>
      )}
    </CardShell>
  );
}

function PreviewVideoCard({
  primary, rows, onRemoveCompetitor,
}: {
  primary: AppMetadata;
  rows: (AppMetadata & { key: string })[];
  onRemoveCompetitor: (key: string) => void;
}) {
  const toneForVideo = (has: boolean) => toneFor(boolScore(has));
  return (
    <CardShell id="preview-video" label="Preview Video" tone={toneForVideo(primary.hasPreviewVideo)}>
      <Row name={primary.name} iconUrl={primary.iconUrl}>
        <p className="flex-1 min-w-0 text-sm text-white">{primary.hasPreviewVideo ? "Has a preview video" : "No preview video"}</p>
        <Badge tone={toneForVideo(primary.hasPreviewVideo)}>{primary.hasPreviewVideo ? "Yes" : "No"}</Badge>
        {!primary.hasPreviewVideo && (
          <span className="hidden lg:inline shrink-0 text-xs text-gray-500 max-w-xs">A preview video can meaningfully lift conversion rate.</span>
        )}
      </Row>
      {rows.map((r) => (
        <Row key={r.key} name={r.name} iconUrl={r.iconUrl} onRemove={() => onRemoveCompetitor(r.key)}>
          <p className="flex-1 min-w-0 text-sm text-white">{r.hasPreviewVideo ? "Has a preview video" : "No preview video"}</p>
          <Badge tone={toneForVideo(r.hasPreviewVideo)}>{r.hasPreviewVideo ? "Yes" : "No"}</Badge>
        </Row>
      ))}
    </CardShell>
  );
}

function ReviewsCard({
  primary, rows, onRemoveCompetitor,
}: {
  primary: AppMetadata;
  rows: (AppMetadata & { key: string })[];
  onRemoveCompetitor: (key: string) => void;
}) {
  const toneForReviews = (rating?: number, ratingCount?: number) => {
    const ratingScore = scoreVsBenchmark(rating ?? 0, undefined, ASO_REFERENCE.rating);
    const countScore = scoreVsBenchmark(ratingCount ?? 0, undefined, ASO_REFERENCE.reviewCount);
    return toneFor(Math.round((ratingScore + countScore) / 2));
  };
  const summary = (rating?: number, ratingCount?: number) => (
    <span className="flex items-center gap-1.5">
      {rating ? (
        <>
          <StarIconSolid className="size-3.5 text-amber-400 shrink-0" />
          {rating.toFixed(1)}
        </>
      ) : (
        <>
          <StarIcon className="size-3.5 text-gray-600 shrink-0" />
          No rating
        </>
      )}
      <span className="text-gray-500">&middot; {(ratingCount ?? 0).toLocaleString()} ratings</span>
    </span>
  );

  return (
    <CardShell id="reviews-and-ratings" label="Reviews and Ratings" tone={toneForReviews(primary.rating, primary.ratingCount)}>
      <Row name={primary.name} iconUrl={primary.iconUrl}>
        <p className="flex-1 min-w-0 text-sm text-white">{summary(primary.rating, primary.ratingCount)}</p>
        <Badge tone={toneForReviews(primary.rating, primary.ratingCount)}>{(primary.ratingCount ?? 0).toLocaleString()} ratings</Badge>
      </Row>
      {rows.map((r) => (
        <Row key={r.key} name={r.name} iconUrl={r.iconUrl} onRemove={() => onRemoveCompetitor(r.key)}>
          <p className="flex-1 min-w-0 text-sm text-white">{summary(r.rating, r.ratingCount)}</p>
          <Badge tone={toneForReviews(r.rating, r.ratingCount)}>{(r.ratingCount ?? 0).toLocaleString()} ratings</Badge>
        </Row>
      ))}
    </CardShell>
  );
}

function FreshnessCard({
  primary, rows, onRemoveCompetitor,
}: {
  primary: AppMetadata;
  rows: (AppMetadata & { key: string })[];
  onRemoveCompetitor: (key: string) => void;
}) {
  const toneForDays = (days?: number) => toneFor(scoreVsBenchmark(days ?? 365, undefined, ASO_REFERENCE.daysSinceUpdate, true));
  const label = (days?: number) => (days === undefined ? "Unknown" : days === 0 ? "Updated today" : `${days} days ago`);

  return (
    <CardShell id="recently-updated" label="Recently Updated" tone={toneForDays(primary.daysSinceUpdate)}>
      <Row name={primary.name} iconUrl={primary.iconUrl}>
        <p className="flex-1 min-w-0 text-sm text-white">Last updated {label(primary.daysSinceUpdate).toLowerCase()}</p>
        <Badge tone={toneForDays(primary.daysSinceUpdate)}>{label(primary.daysSinceUpdate)}</Badge>
      </Row>
      {rows.map((r) => (
        <Row key={r.key} name={r.name} iconUrl={r.iconUrl} onRemove={() => onRemoveCompetitor(r.key)}>
          <p className="flex-1 min-w-0 text-sm text-white">Last updated {label(r.daysSinceUpdate).toLowerCase()}</p>
          <Badge tone={toneForDays(r.daysSinceUpdate)}>{label(r.daysSinceUpdate)}</Badge>
        </Row>
      ))}
    </CardShell>
  );
}

function LocalizationCard({
  primary, rows, onRemoveCompetitor,
}: {
  primary: AppMetadata;
  rows: (AppMetadata & { key: string })[];
  onRemoveCompetitor: (key: string) => void;
}) {
  const toneForLangs = (count?: number) => toneFor(scoreVsBenchmark(count ?? 1, undefined, ASO_REFERENCE.languageCount));
  const label = (count?: number) => `${count ?? 1} language${(count ?? 1) === 1 ? "" : "s"}`;

  return (
    <CardShell id="localization" label="Localization" tone={toneForLangs(primary.languageCount)}>
      <Row name={primary.name} iconUrl={primary.iconUrl}>
        <p className="flex-1 min-w-0 text-sm text-white">Available in {label(primary.languageCount)}</p>
        <Badge tone={toneForLangs(primary.languageCount)}>{label(primary.languageCount)}</Badge>
      </Row>
      {rows.map((r) => (
        <Row key={r.key} name={r.name} iconUrl={r.iconUrl} onRemove={() => onRemoveCompetitor(r.key)}>
          <p className="flex-1 min-w-0 text-sm text-white">Available in {label(r.languageCount)}</p>
          <Badge tone={toneForLangs(r.languageCount)}>{label(r.languageCount)}</Badge>
        </Row>
      ))}
    </CardShell>
  );
}

export function ReportMetadataComparison({ primaryApp, competitors, isIos, nameLimit, subtitleLimit, onRemoveCompetitor }: Props) {
  const releaseNotesLimit = isIos ? 4000 : 500;
  // Android calls this field "Short Description" in Play Console; iOS calls
  // it "Subtitle" — match whichever store the app is actually on.
  const subtitleField: TextField = isIos ? "Subtitle" : "Short Description";

  return (
    <div className="space-y-5">
      <TextFieldCard
        id="name"
        label="Name"
        field="App Name"
        limit={nameLimit}
        primary={{ name: primaryApp.name, iconUrl: primaryApp.iconUrl, text: primaryApp.title }}
        rows={competitors.map((c) => ({ key: c.key, name: c.name, iconUrl: c.iconUrl, text: c.title }))}
        onRemoveCompetitor={onRemoveCompetitor}
      />
      <TextFieldCard
        id="subtitle"
        label={subtitleField}
        field={subtitleField}
        limit={subtitleLimit}
        primary={{ name: primaryApp.name, iconUrl: primaryApp.iconUrl, text: primaryApp.subtitle }}
        rows={competitors.map((c) => ({ key: c.key, name: c.name, iconUrl: c.iconUrl, text: c.subtitle }))}
        onRemoveCompetitor={onRemoveCompetitor}
      />
      <DescriptionCard
        limit={4000}
        primary={{ name: primaryApp.name, iconUrl: primaryApp.iconUrl, text: primaryApp.description }}
        rows={competitors.map((c) => ({ key: c.key, name: c.name, iconUrl: c.iconUrl, text: c.description }))}
        onRemoveCompetitor={onRemoveCompetitor}
      />
      <TextFieldCard
        id="release-notes"
        label="Release Notes"
        field="Release Notes"
        limit={releaseNotesLimit}
        multiline
        primary={{ name: primaryApp.name, iconUrl: primaryApp.iconUrl, text: primaryApp.releaseNotes }}
        rows={competitors.map((c) => ({ key: c.key, name: c.name, iconUrl: c.iconUrl, text: c.releaseNotes }))}
        onRemoveCompetitor={onRemoveCompetitor}
      />
      <ScreenshotsCard primary={primaryApp} rows={competitors} onRemoveCompetitor={onRemoveCompetitor} />
      <PreviewVideoCard primary={primaryApp} rows={competitors} onRemoveCompetitor={onRemoveCompetitor} />
      <ReviewsCard primary={primaryApp} rows={competitors} onRemoveCompetitor={onRemoveCompetitor} />
      <FreshnessCard primary={primaryApp} rows={competitors} onRemoveCompetitor={onRemoveCompetitor} />
      {isIos && <LocalizationCard primary={primaryApp} rows={competitors} onRemoveCompetitor={onRemoveCompetitor} />}
    </div>
  );
}

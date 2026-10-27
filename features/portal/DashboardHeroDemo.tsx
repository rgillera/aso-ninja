"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MagnifyingGlassIcon,
  MagnifyingGlassCircleIcon,
  DocumentMagnifyingGlassIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  CheckIcon,
  PlusIcon,
  StarIcon,
  SparklesIcon,
  CameraIcon,
  Squares2X2Icon,
  DocumentChartBarIcon,
  EyeIcon,
  PuzzlePieceIcon,
  ArrowTrendingUpIcon,
  ListBulletIcon,
  TagIcon,
  TableCellsIcon,
  BanknotesIcon,
  ChartBarIcon,
  ScaleIcon,
  BeakerIcon,
  TrophyIcon,
  EnvelopeIcon,
  UserCircleIcon,
  CreditCardIcon,
  LightBulbIcon,
  XMarkIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { VolumeBar, TranslateToggle } from "@/features/aso/keywords/research/ui";
import { countryFlag } from "@/libs/countries";
import { formatDownloads, formatRevenue } from "@/libs/store/estimateFormat";

// A fully fake replica of the Keyword Research screen — same approach as the
// onboarding/how-it-works demo components (real markup, sample data, no live
// calls) so the marketing hero renders instead of shipping a screenshot (or
// a GIF) that goes stale the moment the UI changes. It plays a short loop
// with a fake cursor: type a keyword, add it to the tracked keywords table,
// open it in the Keyword Inspector, then find long tail variants of it. See
// TIMELINE and SCENES below.
//
// Unlike the other demo components, this one renders in the dashboard's
// *light* theme (data-theme="light" below, matched by the `light:` custom
// variant from app/globals.css) rather than its dark default — the portal
// is a fixed-light page, so a dark screenshot here would be the one
// remaining dark patch on it. Every class below mirrors the real dark/light
// pair from DashboardShell/DashboardSidebar/KeywordTable rather than
// inventing new tones, so this still reads as the actual product, just in
// its light mode.

// Tracked keywords in the order they were added (unsorted): the loop sorts
// them by Opportunity on screen.
const ROWS = [
  { keyword: "instagram reels", volume: 55, diff: 100, chance: 95, relevancy: 75, opportunity: 41, estDownloads: 64_000, rank: 1 },
  { keyword: "social media", volume: 57, diff: 100, chance: 95, relevancy: 68, opportunity: 34, estDownloads: 51_000, rank: 1 },
  { keyword: "instagram", volume: 82, diff: 100, chance: 95, relevancy: 100, opportunity: 88, estDownloads: 482_000, rank: 1 },
  { keyword: "instagram feed", volume: 5, diff: 70, chance: 94, relevancy: 64, opportunity: 9, estDownloads: 3_100, rank: 6 },
  { keyword: "instagram connect", volume: 5, diff: 72, chance: 52, relevancy: 69, opportunity: 8, estDownloads: 2_800, rank: 48 },
];

// The keyword the loop adds. Like the real table, a new keyword lands at the
// top; sorting by Opportunity (63) then settles it into the second row.
const NEW_ROW = { keyword: "photo sharing", volume: 61, diff: 88, chance: 71, relevancy: 82, opportunity: 63, estDownloads: 38_000, rank: 4 };

const ALL_ROWS = [{ ...NEW_ROW, isNew: true as const }, ...ROWS];
const SORTED_ROWS = [...ALL_ROWS].sort((a, b) => b.opportunity - a.opportunity);

// The Inspector's top results for NEW_ROW.keyword. Competitors are made up;
// estimates use the real page's formatters (libs/store/estimateFormat).
const TOP_APPS = [
  { name: "Snapgram", subtitle: "Photo sharing & short videos", developer: "Snapgram Inc.", rating: 4.7, ratings: "2.1M", downloads: 1_400_000, revenue: 3_200_000, tone: "from-sky-400 to-indigo-500" },
  { name: "PixelShare", subtitle: "Share photo albums with friends", developer: "Pixel Labs", rating: 4.6, ratings: "640K", downloads: 520_000, revenue: 410_000, tone: "from-emerald-400 to-teal-500" },
  { name: "Lumo Photo", subtitle: "Edit, filter & share", developer: "Lumo Studio", rating: 4.5, ratings: "310K", downloads: 260_000, revenue: 890_000, tone: "from-orange-400 to-rose-500" },
  { name: "Instagram", subtitle: "Photos, reels & friends", developer: "Instagram, Inc.", rating: 4.7, ratings: "28M", downloads: 2_900_000, revenue: 6_400_000, tone: "from-amber-400 via-pink-500 to-purple-600", mine: true },
  { name: "Framely", subtitle: "Photo frames for sharing", developer: "Framely Apps", rating: 3.9, ratings: "1.2K", downloads: 12_000, revenue: 3_000, tone: "from-violet-400 to-fuchsia-500" },
];

// Weak spots the Inspector would flag in the top 10 (low ratings count or
// stars), same idea as WEAK_SPOT_RANGE on the real page.
const BEATABLE = [
  { position: 5, name: "Framely", reason: "1.2K ratings" },
  { position: 8, name: "Snapsy", reason: "3.8 stars" },
];

// Bolds the searched words inside an app's subtitle, like KeywordHighlight
// on the real Inspector.
function highlightTerm(text: string) {
  const words = NEW_ROW.keyword.split(" ");
  const re = new RegExp(`\\b(${words.join("|")})\\b`, "gi");
  return text.split(re).map((part, i) =>
    words.some((w) => w.toLowerCase() === part.toLowerCase())
      ? <span key={i} className="font-semibold text-indigo-700">{part}</span>
      : part
  );
}

// Long tail variants of NEW_ROW.keyword for the Long Tail Keywords scene,
// shaped like the real page's expanded seed group (features/aso/keywords/
// combination). LONG_TAIL_PICK is the one the cursor adds: lowest difficulty.
const LONG_TAIL = [
  { term: "photo sharing app", volume: 46, difficulty: 72, chance: 48 },
  { term: "private photo sharing", volume: 31, difficulty: 28, chance: 74 },
  { term: "photo sharing with friends", volume: 27, difficulty: 39, chance: 66 },
  { term: "family photo sharing", volume: 24, difficulty: 33, chance: 70 },
  { term: "photo sharing album", volume: 19, difficulty: 45, chance: 58 },
];
const LONG_TAIL_PICK = 1;
const LONG_TAIL_AVG = {
  volume: Math.round(LONG_TAIL.reduce((n, k) => n + k.volume, 0) / LONG_TAIL.length),
  difficulty: Math.round(LONG_TAIL.reduce((n, k) => n + k.difficulty, 0) / LONG_TAIL.length),
  chance: Math.round(LONG_TAIL.reduce((n, k) => n + k.chance, 0) / LONG_TAIL.length),
};

// Keyword Performance scene: tracked keywords with this week's rank change
// for your app and one competitor, like features/aso/keywords/performance's
// table. The two keywords this loop added are flagged `isNew`.
const PERFORMANCE = [
  { keyword: "instagram", volume: 82, downloads: 482_000, rank: 1, change: 0, theirRank: 3, theirChange: 0 },
  { keyword: "photo sharing", volume: 61, downloads: 38_000, rank: 4, change: 3, theirRank: 1, theirChange: 0, isNew: true },
  { keyword: "private photo sharing", volume: 31, downloads: 9_200, rank: 7, change: 12, theirRank: 14, theirChange: -2, isNew: true },
  { keyword: "instagram reels", volume: 55, downloads: 64_000, rank: 1, change: 0, theirRank: 9, theirChange: 1 },
  { keyword: "social media", volume: 57, downloads: 51_000, rank: 1, change: -1, theirRank: 5, theirChange: 2 },
];

// The exported report's current month sheet, shaped like
// features/aso/keywords/performance/exportReport.ts: same columns, indigo
// header, zebra rows, and green/red Change cells. One sheet per month.
const REPORT_MONTHS = ["Oct 2026", "Sep 2026", "Aug 2026", "Jul 2026"];
const REPORT_ROWS = PERFORMANCE.map((row) => ({
  keyword: row.keyword,
  volume: row.volume,
  ranking: row.rank,
  change: row.change,
  downloads: row.downloads,
}));

// Search Visibility (estimated search impressions per day) over the last 30
// days, you vs the competitor. VISIBILITY_MAX is the chart's top edge.
const VISIBILITY = {
  you: [4100, 4300, 4200, 4600, 4800, 5100, 5000, 5500, 5800, 6000, 6300, 6700],
  them: [5700, 5800, 5600, 5800, 5900, 5800, 6000, 5900, 6000, 6100, 6000, 6200],
};
const VISIBILITY_MAX = 10_000;

function chartPath(values: number[], width: number, height: number) {
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * width).toFixed(1)},${(height - (v / VISIBILITY_MAX) * height).toFixed(1)}`)
    .join(" ");
}

function ChangeCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-sm text-gray-400">—</span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-medium tabular-nums ${up ? "text-emerald-700" : "text-red-600"}`}>
      {up ? "↑" : "↓"}{Math.abs(value)}
    </span>
  );
}

type Step =
  | "rest" | "toInput" | "typing" | "toAdd" | "pressAdd" | "loadingRow" | "added"
  | "toSort" | "pressSort" | "sorting" | "sorted" | "reveal"
  | "toInspect" | "pressInspect" | "inspector"
  | "back" | "pressLongTail" | "longTailLoading" | "longTail" | "toAddChild" | "pressAddChild" | "childAdded"
  | "toPerfNav" | "pressPerfNav" | "performance" | "toExport" | "pressExport" | "exporting" | "exported" | "sheet"
  | "chart"
  | "reset";

const TYPE_MS = 85;

// One pass of the loop, in order, with how long each beat holds (ms).
const TIMELINE: [Step, number][] = [
  ["rest", 700],
  ["toInput", 700],
  ["typing", NEW_ROW.keyword.length * TYPE_MS + 400],
  ["toAdd", 600],
  ["pressAdd", 220],
  ["loadingRow", 700],
  ["added", 700],
  // Sort by Opportunity: rows slide into order, and the new keyword ends up
  // at #2 under the top scorer, which is why it's the one worth inspecting.
  ["toSort", 650],
  ["pressSort", 220],
  ["sorting", 750],
  ["sorted", 450],
  // The table slides sideways to show the row's action buttons, the same as
  // scrolling the real table, instead of floating them over the metrics.
  ["reveal", 750],
  ["toInspect", 650],
  ["pressInspect", 220],
  ["inspector", 3800],
  ["back", 800],
  ["pressLongTail", 220],
  ["longTailLoading", 800],
  ["longTail", 900],
  ["toAddChild", 700],
  ["pressAddChild", 220],
  ["childAdded", 1300],
  ["toPerfNav", 800],
  ["pressPerfNav", 220],
  ["performance", 1600],
  ["toExport", 600],
  ["pressExport", 220],
  ["exporting", 700],
  ["exported", 900],
  // The downloaded report opens, so the viewer sees what they'd send a client.
  ["sheet", 3200],
  // Back on the page, the cursor moves up to the Search Visibility chart,
  // which shares the page with the table (no tab to switch to).
  ["chart", 2400],
  ["reset", 800],
];

const STEP_INDEX = Object.fromEntries(TIMELINE.map(([step], i) => [step, i])) as Record<Step, number>;

function stepAtLeast(step: Step, than: Step) {
  return STEP_INDEX[step] >= STEP_INDEX[than];
}

// Where each step starts on the loop's clock, and the whole loop's length.
const STEP_START = TIMELINE.map((_, i) => TIMELINE.slice(0, i).reduce((n, [, ms]) => n + ms, 0));
const TOTAL_MS = STEP_START[TIMELINE.length - 1] + TIMELINE[TIMELINE.length - 1][1];

// The labelled chapters under the demo. Each runs from its first step up to
// the next chapter's first step; clicking one jumps the loop there.
const SCENES: { label: string; start: Step }[] = [
  { label: "Add a keyword", start: "rest" },
  { label: "Inspect it", start: "toInspect" },
  { label: "Find long tail", start: "back" },
  { label: "Track performance", start: "toPerfNav" },
];

function sceneOf(stepIndex: number) {
  let scene = 0;
  SCENES.forEach((sc, i) => {
    if (stepIndex >= STEP_INDEX[sc.start]) scene = i;
  });
  return scene;
}

// [start, end] of each chapter on the loop's clock (ms).
const SCENE_RANGES = SCENES.map((sc, i) => [
  STEP_START[STEP_INDEX[sc.start]],
  i + 1 < SCENES.length ? STEP_START[STEP_INDEX[SCENES[i + 1].start]] : TOTAL_MS,
]);

const DOWNLOADS_FORMATTER = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

// Fired by the homepage hero's "Watch the tour" button (PortalHero) to
// restart the loop from step 1 as it scrolls the demo into view.
export const DEMO_RESTART_EVENT = "appaso:hero-demo-restart";

// The mockup below is laid out at a fixed desktop width. Below that width we
// scale the whole thing down to fit instead of letting it overflow into a
// tall, sideways-scrolling slice on mobile.
const DEMO_WIDTH = 1000;

function NavRow({
  icon: Icon,
  label,
  active,
  chevronOpen,
}: {
  icon: typeof Squares2X2Icon;
  label: string;
  active?: boolean;
  /** Present (true/false) to draw the collapsible-section chevron; omitted for plain links. */
  chevronOpen?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
        active ? "bg-indigo-50 text-indigo-700" : "text-gray-600"
      }`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {chevronOpen !== undefined && (
        <ChevronDownIcon className={`size-3 shrink-0 text-gray-500 transition-transform ${chevronOpen ? "rotate-180" : ""}`} />
      )}
    </div>
  );
}

function FooterRow({ icon: Icon, label, badge }: { icon: typeof Squares2X2Icon; label: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500">
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="shrink-0 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-700">{badge}</span>
      )}
    </div>
  );
}

function Chip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
        active
          ? "bg-indigo-500/20 text-indigo-600 ring-1 ring-indigo-500/40"
          : "bg-black/[0.04] text-gray-600"
      }`}
    >
      {active ? <CheckIcon className="size-2.5" /> : <PlusIcon className="size-2.5" />}
      {label}
    </span>
  );
}

function KeywordGroup({ label, count, chips }: { label: string; count: string; chips: { label: string; active?: boolean }[] }) {
  return (
    <div className="px-4 py-3 border-b border-black/[0.04] last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          {label} <span className="text-gray-400 normal-case font-normal">{count}</span>
        </span>
        <span className="text-[11px] text-indigo-600">+ Analyze all</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <Chip key={c.label} label={c.label} active={c.active} />
        ))}
      </div>
    </div>
  );
}

function ColHead({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
      <span className={`flex items-center gap-1 ${active ? "text-gray-800" : ""}`}>
        {children}
        {active && <ChevronDownIcon className="size-3 text-indigo-600" />}
      </span>
    </th>
  );
}

// Same score-pill tones as `scorePill` in features/onboarding/demo.tsx, but
// with this file's light-mode text colors (that shared helper is dark-only —
// it's also used by the still-dark "how it works" demos, so it can't just
// grow a light variant without changing those too).
function scorePillLight(value: number) {
  const tone =
    value >= 70 ? "bg-emerald-500/15 text-emerald-700" :
    value >= 40 ? "bg-yellow-500/15 text-yellow-400" :
                  "bg-gray-500/10 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {value}
    </span>
  );
}

function diffColor(v: number) {
  return v > 60 ? "text-red-600" : v > 40 ? "text-yellow-400" : "text-emerald-700";
}

function chanceColor(v: number) {
  return v > 15 ? "text-emerald-700" : "text-gray-600";
}

function rankColor(v: number) {
  return v <= 3 ? "text-emerald-700" : v <= 10 ? "text-yellow-400" : "text-gray-700";
}

function Cursor({ x, y, pressed, visible }: { x: number; y: number; pressed: boolean; visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-30 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ transform: `translate(${x}px, ${y}px)`, opacity: visible ? 1 : 0 }}
    >
      <svg
        viewBox="0 0 20 20"
        className={`size-5 drop-shadow-md transition-transform duration-150 ${pressed ? "scale-75" : "scale-100"}`}
        style={{ transformOrigin: "3px 2px" }}
      >
        <path d="M3 2l12.5 8.2-5.6.9 3.2 6.1-2.3 1.2-3.2-6.1L3.4 16z" fill="#111827" stroke="white" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function SkeletonCell({ width = "w-10" }: { width?: string }) {
  return <span className={`block h-3 ${width} rounded bg-black/[0.07] animate-pulse`} />;
}

function InspectorStat({ label, value, sub, bar }: { label: string; value: string; sub?: string; bar?: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-950/[0.07] shadow-sm">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 rounded-full bg-black/[0.06]">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${bar}%` }} />
        </div>
      )}
      {sub && <p className="mt-1 text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

export function DashboardHeroDemo() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLSpanElement>(null);
  const inspectRef = useRef<HTMLSpanElement>(null);
  const searchesRef = useRef<HTMLDivElement>(null);
  const longTailRef = useRef<HTMLSpanElement>(null);
  const childAddRef = useRef<HTMLSpanElement>(null);
  const perfNavRef = useRef<HTMLDivElement>(null);
  const perfChangeRef = useRef<HTMLSpanElement>(null);
  const chartEndRef = useRef<HTMLSpanElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const sortRef = useRef<HTMLSpanElement>(null);
  // Row pitch of the tracked keywords table, for the sort slide.
  const [rowPitch, setRowPitch] = useState(45);
  const exportRef = useRef<HTMLSpanElement>(null);
  const sheetCellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  const [stepIndex, setStepIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [cursor, setCursor] = useState({ x: 620, y: 230 });
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const step = TIMELINE[stepIndex][0];
  const running = visible && !reducedMotion;

  // How far into the current beat the loop got before it last stopped
  // (scrolled off screen), so it resumes mid-beat instead of restarting.
  const stepStartRef = useRef(0);
  const elapsedRef = useRef(0);
  const advancingRef = useRef(false);

  useEffect(() => {
    const el = outerRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    const update = () => {
      setScale(Math.min(1, el.clientWidth / DEMO_WIDTH));
      setNaturalHeight(inner.scrollHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Only play while on screen, and never for visitors who asked for reduced
  // motion: they get the plain static screen (step "rest", no cursor).
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMedia = () => setReducedMotion(media.matches);
    onMedia();
    media.addEventListener("change", onMedia);
    const el = outerRef.current;
    const io = el ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 }) : null;
    if (el && io) io.observe(el);
    return () => {
      media.removeEventListener("change", onMedia);
      io?.disconnect();
    };
  }, []);

  // Advance the loop one beat at a time.
  useEffect(() => {
    if (!running) return;
    stepStartRef.current = performance.now() - elapsedRef.current;
    const timer = setTimeout(() => {
      elapsedRef.current = 0;
      advancingRef.current = true;
      setStepIndex((i) => (i + 1) % TIMELINE.length);
    }, Math.max(0, TIMELINE[stepIndex][1] - elapsedRef.current));
    return () => {
      clearTimeout(timer);
      if (advancingRef.current) advancingRef.current = false;
      else elapsedRef.current = performance.now() - stepStartRef.current;
    };
  }, [running, stepIndex]);

  function jumpTo(index: number) {
    elapsedRef.current = 0;
    if (running) advancingRef.current = true;
    setStepIndex(index);
  }

  // No dependency list on purpose: re-subscribing each render keeps the
  // listener's jumpTo pointed at the current `running`.
  useEffect(() => {
    const restart = () => jumpTo(0);
    window.addEventListener(DEMO_RESTART_EVENT, restart);
    return () => window.removeEventListener(DEMO_RESTART_EVENT, restart);
  });

  // Type the keyword one character at a time during the "typing" beat. The
  // text stays in the box until the Add click clears it.
  useEffect(() => {
    if (step === "typing" && running) {
      const timer = setInterval(() => setTyped((n) => Math.min(n + 1, NEW_ROW.keyword.length)), TYPE_MS);
      return () => clearInterval(timer);
    }
    if (step === "rest" || step === "loadingRow") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTyped(0);
    }
  }, [step, running]);

  // Move the cursor to whatever the current beat is aiming at. Positions are
  // measured in the stage's own (unscaled) coordinates, so the cursor lands
  // on the same spot whether or not the mockup is scaled down to fit.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const target =
      step === "toInput" || step === "typing" ? inputRef.current :
      step === "toAdd" || step === "pressAdd" || step === "loadingRow" || step === "added" ? addRef.current :
      step === "toSort" || step === "pressSort" || step === "sorting" || step === "sorted" || step === "reveal" ? sortRef.current :
      step === "toInspect" || step === "pressInspect" ? inspectRef.current :
      step === "inspector" ? searchesRef.current :
      step === "back" || step === "pressLongTail" || step === "longTailLoading" || step === "longTail" ? longTailRef.current :
      step === "toAddChild" || step === "pressAddChild" || step === "childAdded" ? childAddRef.current :
      step === "toPerfNav" || step === "pressPerfNav" ? perfNavRef.current :
      step === "performance" ? perfChangeRef.current :
      step === "toExport" || step === "pressExport" || step === "exporting" || step === "exported" ? exportRef.current :
      step === "sheet" ? sheetCellRef.current :
      step === "chart" ? chartEndRef.current :
      null;
    if (!target) {
      setCursor({ x: 620, y: 230 });
      return;
    }
    const s = stage.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const k = scale || 1;
    const offsetX = step === "toInput" || step === "typing" ? 40 : t.width / 2;
    setCursor({ x: (t.left - s.left) / k + offsetX, y: (t.top - s.top + t.height / 2) / k });
  }, [step, scale]);

  // Measure the row pitch just before sorting (rows are all one height).
  useLayoutEffect(() => {
    if (step !== "toSort") return;
    const trs = tbodyRef.current?.querySelectorAll("tr");
    if (trs && trs.length > 1) setRowPitch((trs[1] as HTMLElement).offsetTop - (trs[0] as HTMLElement).offsetTop);
  }, [step]);

  const hasNewRow = stepAtLeast(step, "loadingRow") && step !== "reset";
  const rowLoading = step === "loadingRow";
  const rowHighlighted = stepAtLeast(step, "loadingRow") && !stepAtLeast(step, "sorted");
  const sortActive = stepAtLeast(step, "pressSort") && step !== "reset";
  const sorting = step === "sorting";
  const sorted = stepAtLeast(step, "sorted") && step !== "reset";
  const slid = stepAtLeast(step, "reveal") && step !== "reset";
  const rowHovered = stepAtLeast(step, "reveal") && step !== "reset";
  const inspectorOpen = step === "inspector";
  const longTailOpen = stepAtLeast(step, "longTailLoading") && !stepAtLeast(step, "performance");
  const perfOpen = stepAtLeast(step, "performance") && step !== "reset";
  const chartFocused = step === "chart";
  const longTailLoading = step === "longTailLoading";
  const childAdded = step === "childAdded";
  const pressed =
    step === "pressAdd" || step === "pressSort" || step === "pressInspect" || step === "pressLongTail" || step === "pressAddChild" ||
    step === "pressPerfNav" || step === "pressExport";
  const exporting = step === "exporting";
  const exportToast = step === "exported" || step === "sheet";
  const sheetOpen = step === "sheet";
  const scene = sceneOf(stepIndex);

  // Scroll the tracked keywords table sideways to its action buttons during
  // the "reveal" beat, and back once the loop resets. The keyword column is
  // pinned (sticky), so the row stays identifiable while the metrics scroll.
  useEffect(() => {
    const wrap = tableWrapRef.current;
    if (!wrap) return;
    wrap.scrollTo({ left: slid ? wrap.scrollWidth : 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [slid, reducedMotion]);
  const inputText = step === "typing" || step === "toAdd" || step === "pressAdd" ? NEW_ROW.keyword.slice(0, typed) : "";

  // DOM order: insertion order until the sort settles, then sorted. During
  // the "sorting" beat each row is translated to its sorted slot (a FLIP
  // without the measuring), then the DOM swaps to sorted order with no
  // transforms, so the sticky keyword column keeps working afterwards.
  const rows: (typeof ALL_ROWS)[number][] = sorted ? SORTED_ROWS : hasNewRow ? ALL_ROWS : ROWS;

  // Below DEMO_WIDTH the mockup is pinned to its designed width and scaled
  // down to fit; above it, it stays fluid (same as before this ever measured
  // anything) so it keeps filling wider containers instead of leaving a gap.
  const scaled = scale < 1;

  return (
    <div>
    <div
      ref={outerRef}
      className={`rounded-xl ${scaled ? "overflow-hidden" : "overflow-x-auto"}`}
      style={scaled ? { height: naturalHeight * scale } : undefined}
    >
      <div ref={innerRef} style={scaled ? { width: DEMO_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" } : undefined}>
      <div ref={stageRef} data-theme="light" className="relative flex min-w-[1000px] rounded-xl bg-white ring-1 ring-black/[0.08] overflow-hidden">
        {running && <Cursor x={cursor.x} y={cursor.y} pressed={pressed} visible={step !== "reset"} />}

        {/* Sidebar — mirrors features/dashboard/DashboardSidebar.tsx's structure,
            labels, and icons as they'd show on this page (Keyword Research
            active; Campaign Data collapsed). Follows the loop over to
            Keyword Inspector, Long Tail Keywords and Keyword Performance as
            those open. */}
        <aside className="flex w-48 shrink-0 flex-col bg-white border-r border-black/[0.08]">
          {/* Workspace switcher — its own bordered region, same as the real
              sidebar (a plain margin doesn't read as a section break the way
              a border does). */}
          <div className="p-3 border-b border-black/[0.08]">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <div className="flex size-6 shrink-0 items-center justify-center rounded bg-indigo-500 text-[10px] font-bold text-white">A</div>
              <span className="flex-1 truncate text-sm font-medium text-gray-900">AppASO Work…</span>
              <ChevronDownIcon className="size-3.5 text-gray-500 shrink-0" />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
            <NavRow icon={Squares2X2Icon} label="My Apps" />

            <NavRow icon={DocumentChartBarIcon} label="Reports" />
            <NavRow icon={EyeIcon} label="Metadata" />

            <div className="pt-3">
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap text-gray-400">Keyword Intelligence</p>
              <div className="space-y-1">
                <NavRow icon={MagnifyingGlassIcon} label="Keyword Research" active={!inspectorOpen && !longTailOpen && !perfOpen} />
                <NavRow icon={DocumentMagnifyingGlassIcon} label="Keyword Inspector" active={inspectorOpen} />
                <NavRow icon={PuzzlePieceIcon} label="Long Tail Keywords" active={longTailOpen} />
                <div ref={perfNavRef} className={`rounded-lg transition-transform ${step === "pressPerfNav" ? "scale-[0.97]" : ""}`}>
                  <NavRow icon={ArrowTrendingUpIcon} label="Keyword Performance" active={perfOpen} />
                </div>
                <NavRow icon={TagIcon} label="Group by Intent" />
                <NavRow icon={ListBulletIcon} label="Ranked Keywords" />
                <NavRow icon={BeakerIcon} label="Keyword Simulator" />
              </div>
            </div>

            <div className="pt-3">
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap text-gray-400">ASA Intelligence</p>
              <div className="space-y-1">
                <NavRow icon={BanknotesIcon} label="Bid Suggestions" />
                <NavRow icon={ChartBarIcon} label="Campaign Data" chevronOpen={false} />
              </div>
            </div>

            <div className="pt-3">
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap text-gray-400">Market Intelligence</p>
              <div className="space-y-1">
                <NavRow icon={MagnifyingGlassCircleIcon} label="App Explorer" />
                <NavRow icon={ScaleIcon} label="Compare Apps" />
              </div>
            </div>
          </nav>

          <div className="border-t border-black/[0.08] p-2.5 space-y-0.5">
            <FooterRow icon={TrophyIcon} label="Learn & Get Certified" />
            <FooterRow icon={EnvelopeIcon} label="Email support" />
            <FooterRow icon={CreditCardIcon} label="Manage Plan" badge="Enterprise" />
            <FooterRow icon={UserCircleIcon} label="Account settings" />
          </div>
        </aside>

        {/* Main */}
        <div className="relative flex-1 min-w-0 bg-[#f7f7f8]">
          {/* Top search bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.08]">
            <MagnifyingGlassIcon className="size-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-400">Search for an app by name, app id or URL …</span>
          </div>

          {/* App header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.08]">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                <CameraIcon className="size-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">Instagram</p>
                <p className="text-xs text-gray-500 leading-tight flex items-center gap-1">
                  <img src="/app-store.svg" alt="" className="size-3" />
                  App Store
                  <span className="ml-1.5">&middot; {countryFlag("us")} US</span>
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/25 shrink-0">
                <CheckIcon className="size-3.5" />
                Unfollow
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 text-xs font-medium text-gray-600 shrink-0">
                <img src="/app-store.svg" alt="" className="size-3.5" />
                App Store
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900">Keyword Research</p>
              <InformationCircleIcon className="size-4 text-gray-500" />
            </div>
          </div>

          {/* Keyword Suggestions panel */}
          <div className="mx-5 mt-4 rounded-xl bg-white shadow-sm ring-1 ring-black/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08]">
              <span className="text-sm font-semibold text-gray-900">Keyword Suggestions</span>
              <ChevronUpIcon className="size-4 text-gray-500" />
            </div>

            <div className="flex overflow-x-auto border-b border-black/[0.08]">
              <span className="px-3.5 py-3 text-xs font-medium border-b-2 border-indigo-400 text-gray-900 shrink-0">Metadata</span>
              <span className="px-3.5 py-3 text-xs font-medium text-gray-500 shrink-0">Competitor Gap</span>
              <span className="flex items-center gap-1.5 px-3.5 py-3 text-xs font-medium text-gray-500 shrink-0">
                <SparklesIcon className="size-3" />
                AI Suggestions
              </span>
              <div className="ml-auto flex items-center px-3.5 py-3 shrink-0">
                <TranslateToggle checked={false} onChange={() => {}} locked={false} />
              </div>
            </div>

            <KeywordGroup label="Title Keywords" count="1 / 1" chips={[{ label: "instagram", active: true }]} />
            <KeywordGroup
              label="Subtitle Keywords"
              count="0 / 4"
              chips={[{ label: "stories" }, { label: "reels" }, { label: "edits" }, { label: "stories reels" }]}
            />
            <KeywordGroup
              label="Description Keywords"
              count="1 / 20"
              chips={[
                { label: "little" }, { label: "moments" }, { label: "lead" }, { label: "big" },
                { label: "friendships" }, { label: "share" }, { label: "instagram", active: true },
                { label: "meta" }, { label: "connect" }, { label: "friends" }, { label: "fans" },
                { label: "people" }, { label: "around" }, { label: "explore" }, { label: "interests" },
                { label: "post" }, { label: "what's" }, { label: "going" }, { label: "daily" },
              ]}
            />
          </div>

          {/* Table panel */}
          <div className="mx-5 my-4 rounded-xl bg-white shadow-sm ring-1 ring-black/[0.08] overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-black/[0.08]">
              <span className="text-sm font-semibold text-gray-900">Tracked keywords</span>
              <span className="text-xs tabular-nums text-gray-500">· {hasNewRow ? 6 : 5}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-black/[0.08] flex-wrap gap-y-2">
              {["Keyword", "Volume", "Rank", "Relevancy"].map((label) => (
                <span key={label} className="flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                  {label === "Relevancy" && <SparklesIcon className="size-3 text-violet-700" />}
                  {label}
                  <ChevronDownIcon className="size-3 text-gray-400" />
                </span>
              ))}
              <div className="flex items-center rounded-lg bg-gray-50 p-0.5">
                <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">All</span>
                <span className="rounded-md p-1 text-gray-500"><CheckIcon className="size-3.5" /></span>
                <span className="rounded-md p-1 text-gray-500"><StarIcon className="size-3.5" /></span>
              </div>
              <div className="ml-auto">
                <TranslateToggle checked={false} onChange={() => {}} locked={false} />
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 border-b border-black/[0.08]">
              <div
                ref={inputRef}
                className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs transition-shadow ${
                  inputText || step === "typing" ? "bg-white text-gray-800 ring-2 ring-indigo-500/40" : "bg-gray-50 text-gray-400"
                }`}
              >
                {inputText || step === "typing" ? (
                  <span>
                    {inputText}
                    <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-gray-800" />
                  </span>
                ) : (
                  "Enter comma-separated keywords to add…"
                )}
              </div>
              <span
                ref={addRef}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shrink-0 transition-all ${
                  step === "pressAdd" ? "scale-95 bg-indigo-600" : "bg-indigo-500"
                }`}
              >
                <PlusIcon className="size-3.5" />
                Add
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 shrink-0">
                <TableCellsIcon className="size-3.5" />
                Edit columns
                <ChevronDownIcon className="size-3 text-gray-400" />
              </span>
            </div>

            {/* Scrolled programmatically (see the "reveal" effect above),
                like a user scrolling the real table sideways to reach its
                action buttons. */}
            <div ref={tableWrapRef} className="overflow-hidden">
              <table className="w-max min-w-full">
                <thead>
                  <tr className="border-b border-black/[0.08] bg-white">
                    <th className={`sticky left-0 z-10 bg-white px-3 py-2 text-left transition-shadow ${slid ? "shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12)]" : ""}`}>
                      <span className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        <span className="block size-3.5 rounded border border-gray-300" />
                        Keywords
                      </span>
                    </th>
                    <ColHead>Volume</ColHead>
                    <ColHead>Diff.</ColHead>
                    <ColHead>Chance</ColHead>
                    <ColHead>Relevancy</ColHead>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">
                      <span
                        ref={sortRef}
                        className={`inline-flex items-center gap-1 rounded px-1 -mx-1 transition-all ${
                          sortActive ? "text-gray-800" : "text-gray-400"
                        } ${step === "pressSort" ? "scale-95 bg-black/[0.05]" : ""}`}
                      >
                        Opportunity
                        <ChevronDownIcon className={`size-3 text-indigo-600 transition-opacity ${sortActive ? "opacity-100" : "opacity-0"}`} />
                      </span>
                    </th>
                    <ColHead>Est. Daily Downloads</ColHead>
                    <ColHead>App Rank</ColHead>
                    <th />
                  </tr>
                </thead>
                <tbody ref={tbodyRef} className="divide-y divide-black/[0.06]">
                  {rows.map((row, domIndex) => {
                    const isNew = "isNew" in row;
                    const loading = isNew && rowLoading;
                    const shift = sorting ? (SORTED_ROWS.findIndex((r) => r.keyword === row.keyword) - domIndex) * rowPitch : 0;
                    return (
                      <tr
                        key={row.keyword}
                        className={`relative transition-[background-color,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isNew && rowHighlighted ? "bg-indigo-50" : isNew && rowHovered ? "bg-gray-50" : "bg-white"
                        } ${isNew && (step === "loadingRow" || step === "added") ? "animate-[hero-row-in_400ms_ease-out]" : ""} ${
                          isNew ? "z-[1]" : ""
                        }`}
                        style={sorting ? { transform: `translateY(${shift}px)` } : { transitionProperty: "background-color" }}
                      >
                        {/* Pinned: checkbox + keyword. bg-inherit takes the row's
                            (opaque) background so scrolled cells pass under it. */}
                        <td className={`sticky left-0 z-10 bg-inherit px-3 py-2.5 transition-shadow ${slid ? "shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12)]" : ""}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="mr-1.5 block size-3.5 shrink-0 rounded border border-gray-300" />
                            <StarIcon className="size-3.5 text-gray-400 shrink-0" />
                            {/* Min width fits the longest sample keyword, so the columns
                                don't shift when the loop swaps rows in and out. */}
                            <span className="inline-block min-w-[7.5rem] text-sm text-gray-800 whitespace-nowrap">{row.keyword}</span>
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5">{loading ? <SkeletonCell width="w-14" /> : <VolumeBar value={row.volume} />}</td>
                        <td className="px-2.5 py-2.5">{loading ? <SkeletonCell width="w-6" /> : <span className={`text-sm ${diffColor(row.diff)}`}>{row.diff}</span>}</td>
                        <td className="px-2.5 py-2.5">{loading ? <SkeletonCell width="w-6" /> : <span className={`text-sm ${chanceColor(row.chance)}`}>{row.chance}</span>}</td>
                        <td className="px-2.5 py-2.5">{loading ? <SkeletonCell width="w-8" /> : scorePillLight(row.relevancy)}</td>
                        <td className="px-2.5 py-2.5">{loading ? <SkeletonCell width="w-8" /> : scorePillLight(row.opportunity)}</td>
                        <td className="px-2.5 py-2.5">
                          {loading ? <SkeletonCell /> : <span className="text-sm text-gray-700">~{DOWNLOADS_FORMATTER.format(row.estDownloads)}</span>}
                        </td>
                        <td className="px-2.5 py-2.5">
                          {loading ? <SkeletonCell width="w-6" /> : <span className={`text-sm font-medium tabular-nums ${rankColor(row.rank)}`}>#{row.rank}</span>}
                        </td>
                        {/* Hover actions, same four as the real table row:
                            Inspect, Results, Long tail, remove. */}
                        <td className="pr-3 pl-1 py-2.5">
                          <div className={`flex items-center gap-1.5 transition-opacity ${isNew && rowHovered ? "opacity-100" : "opacity-0"}`}>
                            <span
                              ref={isNew ? inspectRef : undefined}
                              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium whitespace-nowrap transition-all ${
                                isNew && step === "pressInspect" ? "scale-95 bg-indigo-100 text-indigo-900" : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              <DocumentMagnifyingGlassIcon className="size-3" />
                              Inspect
                            </span>
                            <span className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700 whitespace-nowrap">
                              <MagnifyingGlassIcon className="size-3" />
                              Results
                            </span>
                            <span
                              ref={isNew ? longTailRef : undefined}
                              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium whitespace-nowrap transition-all ${
                                isNew && step === "pressLongTail" ? "scale-95 bg-gray-200 text-gray-900" : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <PuzzlePieceIcon className="size-3" />
                              Long tail
                            </span>
                            <span className="flex items-center rounded bg-gray-100 px-2 py-1 text-gray-700">
                              <XMarkIcon className="size-3" />
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Holds the sixth row's space until the new keyword fills it,
                      so the hero never changes height mid-loop. */}
                  {!hasNewRow && (
                    <tr aria-hidden="true" className="invisible">
                      <td className="px-3 py-2.5"><span className="block h-5" /></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Keyword Inspector — a trimmed copy of features/aso/keywords/
              inspector, laid over the research screen while the loop shows
              where the Inspect click leads. Always rendered (just hidden)
              so the cursor can measure its target before it fades in. */}
          <div
            aria-hidden={!inspectorOpen}
            className={`absolute inset-0 z-20 overflow-hidden bg-[#f7f7f8] transition-all duration-500 ${
              inspectorOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
            }`}
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.08]">
              <MagnifyingGlassIcon className="size-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400">Search for an app by name, app id or URL …</span>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.08]">
              <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <DocumentMagnifyingGlassIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">Keyword Inspector</p>
                <p className="text-xs text-gray-500 leading-tight">Volume, difficulty, daily searches and live results for any keyword</p>
              </div>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div className="flex items-center gap-2 rounded-xl bg-white p-2.5 ring-1 ring-gray-950/[0.07] shadow-sm">
                <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
                  <MagnifyingGlassIcon className="size-4 text-gray-400" />
                  {NEW_ROW.keyword}
                </div>
                <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 ring-1 ring-black/[0.08]">
                  <img src="/app-store.svg" alt="" className="size-3.5" />
                  App Store
                </span>
                <span className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 ring-1 ring-black/[0.08]">
                  {countryFlag("us")} United States
                </span>
                <span className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white">Inspect</span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <InspectorStat label="Volume" value={String(NEW_ROW.volume)} bar={NEW_ROW.volume} />
                <InspectorStat label="Difficulty" value={String(NEW_ROW.diff)} bar={NEW_ROW.diff} />
                <div ref={searchesRef}>
                  <InspectorStat label="Est. daily searches" value="~9.8K" sub="people a day" />
                </div>
                <InspectorStat label="Results" value="212" sub="apps compete" />
              </div>

              {/* Top 10 insights: your rank and the weakest spots to aim for */}
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
                <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-950/[0.07] shadow-sm">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <TrophyIcon className="size-3.5" />
                    Your app&apos;s rank
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600">
                      <CameraIcon className="size-3.5 text-white" />
                    </span>
                    <p className="text-lg font-semibold leading-tight text-gray-900">
                      #{NEW_ROW.rank}
                      <span className="ml-1.5 text-[11px] font-normal text-gray-500">in {countryFlag("us")} United States</span>
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-500">Highlighted in the list below</p>
                </div>
                <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-950/[0.07] shadow-sm">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <LightBulbIcon className="size-3.5" />
                    Beatable spots in the top 10
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {BEATABLE.map((spot) => (
                      <li key={spot.position} className="flex items-center gap-2 text-xs">
                        <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-amber-600">#{spot.position}</span>
                        <span className="min-w-0 truncate text-gray-700">{spot.name}</span>
                        <span className="shrink-0 text-gray-500">{spot.reason}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[11px] text-gray-500">Apps here have few ratings or low stars, so they&apos;re easier to pass.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 ring-1 ring-gray-950/[0.07]">
                  <span className="text-xs text-gray-500">Keyword in title</span>
                  <span className="text-xs font-semibold tabular-nums text-gray-900">3/10</span>
                </span>
                <span className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 ring-1 ring-gray-950/[0.07]">
                  <span className="text-xs text-gray-500">In title or subtitle</span>
                  <span className="text-xs font-semibold tabular-nums text-gray-900">7/10</span>
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-950/[0.07] shadow-sm">
                <div className="flex items-center gap-1.5 border-b border-black/[0.08] px-4 py-2.5">
                  <span className="text-sm font-semibold text-gray-900">Top 10 apps</span>
                  <span className="text-xs text-gray-500">for &ldquo;{NEW_ROW.keyword}&rdquo;</span>
                </div>
                <div className="divide-y divide-black/[0.05]">
                  {TOP_APPS.map((app, i) => (
                    <div key={app.name} className={`flex items-center gap-3 px-4 py-2 ${"mine" in app ? "bg-indigo-50/60" : ""}`}>
                      <span className="w-5 text-xs font-medium tabular-nums text-gray-400">#{i + 1}</span>
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${app.tone}`}>
                        <CameraIcon className="size-4 text-white" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-gray-900">
                          {app.name}
                          {"mine" in app && (
                            <span className="rounded-full bg-indigo-100 px-1.5 py-px text-[9px] font-semibold text-indigo-700">You</span>
                          )}
                        </p>
                        <p className="truncate text-[11px] text-gray-600">{highlightTerm(app.subtitle)}</p>
                        <p className="truncate text-[10px] text-gray-400">{app.developer}</p>
                      </div>
                      <div className="w-20 shrink-0 text-right">
                        <p className="text-xs text-gray-700"><span className="text-amber-400">★</span> {app.rating.toFixed(1)}</p>
                        <p className="text-[10px] text-gray-500">{app.ratings} ratings</p>
                      </div>
                      <div className="w-20 shrink-0 text-right">
                        <p className="text-xs tabular-nums text-gray-700">{formatDownloads(app.downloads)}</p>
                        <p className="text-[10px] text-gray-500">downloads/mo</p>
                      </div>
                      <div className="w-20 shrink-0 text-right">
                        <p className="text-xs tabular-nums text-gray-700">{formatRevenue(app.revenue)}</p>
                        <p className="text-[10px] text-gray-500">revenue/mo</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Long Tail Keywords — a trimmed copy of features/aso/keywords/
              combination, opened from the row's "Long tail" button with the
              keyword as its seed. Always rendered for the same reason as the
              Inspector above. */}
          <div
            aria-hidden={!longTailOpen}
            className={`absolute inset-0 z-20 overflow-hidden bg-[#f7f7f8] transition-all duration-500 ${
              longTailOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
            }`}
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.08]">
              <MagnifyingGlassIcon className="size-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400">Search for an app by name, app id or URL …</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.08]">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                  <CameraIcon className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">Instagram</p>
                  <p className="text-xs text-gray-500 leading-tight flex items-center gap-1">
                    <img src="/app-store.svg" alt="" className="size-3" />
                    App Store
                    <span className="ml-1.5">&middot; {countryFlag("us")} US</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-900">Long Tail Keywords</p>
                <InformationCircleIcon className="size-4 text-gray-500" />
              </div>
            </div>

            <div className="mx-5 mt-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/[0.08]">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.08]">
                <div className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
                  Add keywords separated with a comma e.g: games,…
                </div>
                <span className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shrink-0">
                  <PlusIcon className="size-3.5" />
                  Add
                </span>
                <TranslateToggle checked={false} onChange={() => {}} locked={false} />
              </div>

              <div className="px-4 py-3 border-b border-black/[0.08]">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">From Keyword Research</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROWS.slice(0, 4).map((row) => (
                    <span key={row.keyword} className="flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
                      <PlusIcon className="size-3 text-gray-500" />
                      {row.keyword}
                    </span>
                  ))}
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/[0.08]">
                    <th className="w-10 px-4 py-2.5" />
                    <ColHead>Keywords</ColHead>
                    <ColHead>Combinations</ColHead>
                    <ColHead>Avg.Vol.</ColHead>
                    <ColHead>Avg.Difficulty</ColHead>
                    <ColHead>Avg.Chance</ColHead>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {/* The seed group row */}
                  <tr>
                    <td className="px-4 py-3">
                      <span className="block size-3.5 rounded border border-gray-300" />
                    </td>
                    <td className="px-2.5 py-3">
                      <div className="flex items-center gap-1.5">
                        {longTailLoading
                          ? <ChevronRightIcon className="size-3.5 text-gray-500 shrink-0" />
                          : <ChevronDownIcon className="size-3.5 text-gray-500 shrink-0" />}
                        <span className="text-sm font-medium text-gray-900">{NEW_ROW.keyword}</span>
                        {childAdded && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600">
                            <CheckIcon className="size-3" />
                            1 added to tracked keywords
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2.5 py-3 text-sm text-gray-700">{longTailLoading ? <SkeletonCell width="w-6" /> : LONG_TAIL.length}</td>
                    <td className="px-2.5 py-3">{longTailLoading ? <SkeletonCell width="w-12" /> : <VolumeBar value={LONG_TAIL_AVG.volume} hoverHint />}</td>
                    <td className="px-2.5 py-3">{longTailLoading ? <SkeletonCell width="w-8" /> : <span className={`text-sm ${diffColor(LONG_TAIL_AVG.difficulty)}`}>{LONG_TAIL_AVG.difficulty}</span>}</td>
                    <td className="px-2.5 py-3">{longTailLoading ? <SkeletonCell width="w-8" /> : <span className={`text-sm ${chanceColor(LONG_TAIL_AVG.chance)}`}>{LONG_TAIL_AVG.chance}</span>}</td>
                    <td className="pr-4 py-3">
                      <span className="flex w-fit items-center rounded bg-gray-50 px-2 py-1 text-gray-600">
                        <XMarkIcon className="size-3" />
                      </span>
                    </td>
                  </tr>
                  {/* Its long tail variants, shown once the group loads */}
                  {!longTailLoading && LONG_TAIL.map((kw, i) => {
                    const isPick = i === LONG_TAIL_PICK;
                    const hovered = isPick && (step === "toAddChild" || step === "pressAddChild" || childAdded);
                    return (
                      <tr key={kw.term} className={`animate-[hero-row-in_400ms_ease-out] transition-colors ${hovered ? "bg-gray-50" : ""}`}>
                        <td className="px-4 py-2.5">
                          <span className={`block size-3.5 rounded border ${isPick && childAdded ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`} />
                        </td>
                        <td className="py-2.5 pl-9 pr-2.5">
                          <span className="text-sm text-gray-700">{highlightTerm(kw.term)}</span>
                        </td>
                        <td className="px-2.5 py-2.5 text-sm text-gray-400">—</td>
                        <td className="px-2.5 py-2.5"><VolumeBar value={kw.volume} hoverHint /></td>
                        <td className="px-2.5 py-2.5"><span className={`text-sm ${diffColor(kw.difficulty)}`}>{kw.difficulty}</span></td>
                        <td className="px-2.5 py-2.5"><span className={`text-sm ${chanceColor(kw.chance)}`}>{kw.chance}</span></td>
                        <td className="pr-4 py-2.5">
                          <div className={`flex items-center gap-1.5 transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}>
                            <span className="flex items-center gap-1 rounded bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 whitespace-nowrap">
                              <DocumentMagnifyingGlassIcon className="size-3.5" />
                              Inspect
                            </span>
                            <span className="flex items-center gap-1 rounded bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700 whitespace-nowrap">
                              <MagnifyingGlassIcon className="size-3.5" />
                              Results
                            </span>
                            <span
                              ref={isPick ? childAddRef : undefined}
                              className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium ring-1 whitespace-nowrap transition-all ${
                                isPick && childAdded
                                  ? "bg-indigo-500/20 text-indigo-600 ring-indigo-500/40"
                                  : isPick && step === "pressAddChild"
                                    ? "scale-90 bg-gray-100 text-gray-900 ring-black/[0.12]"
                                    : "bg-gray-50 text-gray-600 ring-black/[0.08]"
                              }`}
                            >
                              {isPick && childAdded ? <CheckIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
                              {isPick && childAdded ? "Added" : "Add"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Keyword Performance — a trimmed copy of features/aso/keywords/
              performance, opened from the sidebar: competitor chips, the
              Search Visibility chart and the keyword table on one page. The
              cursor works the table (export) first, then the chart. */}
          <div
            aria-hidden={!perfOpen}
            className={`absolute inset-0 z-20 overflow-hidden bg-[#f7f7f8] transition-all duration-500 ${
              perfOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
            }`}
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.08]">
              <MagnifyingGlassIcon className="size-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400">Search for an app by name, app id or URL …</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.08]">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                  <CameraIcon className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">Instagram</p>
                  <p className="text-xs text-gray-500 leading-tight flex items-center gap-1">
                    <img src="/app-store.svg" alt="" className="size-3" />
                    App Store
                    <span className="ml-1.5">&middot; {countryFlag("us")} US</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-900">Keyword Performance</p>
                <InformationCircleIcon className="size-4 text-gray-500" />
              </div>
            </div>

            {/* Competitor chips, like CompetitorsStrip: dots match the chart lines */}
            <div className="mx-5 mt-3 flex items-center gap-2">
              <span className="mr-1 text-xs text-gray-500">Comparing</span>
              <span className="flex items-center gap-1.5 rounded-lg bg-white py-1 pl-1 pr-2.5 text-xs font-medium text-gray-700 ring-1 ring-black/[0.08]">
                <span className="size-5 rounded-md bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600" />
                Instagram
                <span className="size-2 rounded-full bg-indigo-500" />
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-white py-1 pl-1 pr-2.5 text-xs font-medium text-gray-700 ring-1 ring-black/[0.08]">
                <span className="size-5 rounded-md bg-gradient-to-br from-sky-400 to-indigo-500" />
                Snapgram
                <span className="size-2 rounded-full bg-teal-400" />
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600">
                <PencilSquareIcon className="size-3.5" />
                Edit competitors
              </span>
            </div>

            <div
              className={`mx-5 mt-3 overflow-hidden rounded-xl bg-white shadow-sm transition-shadow duration-300 ${
                chartFocused ? "ring-2 ring-indigo-400/60" : "ring-1 ring-black/[0.08]"
              }`}
            >
              <div className="flex items-center justify-between border-b border-black/[0.08] px-4 py-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900">Search Visibility</p>
                    <InformationCircleIcon className="size-3.5 text-gray-400" />
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-500">Est. impressions per day</p>
                </div>
                <ChevronUpIcon className="size-4 text-gray-500" />
              </div>
              <div className="relative px-4 pt-2 pb-2.5">
                <svg viewBox="0 0 600 180" className={`h-28 w-full ${perfOpen ? "animate-[hero-wipe_1400ms_ease-out_both]" : ""}`} preserveAspectRatio="none">
                  {[0, 60, 120, 180].map((y) => (
                    <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  ))}
                  <path
                    d={`${chartPath(VISIBILITY.them, 600, 180)} L600,180 L0,180 Z`}
                    fill="rgba(45,212,191,0.08)"
                  />
                  <path
                    d={chartPath(VISIBILITY.them, 600, 180)}
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={`${chartPath(VISIBILITY.you, 600, 180)} L600,180 L0,180 Z`}
                    fill="rgba(99,102,241,0.1)"
                  />
                  <path
                    d={chartPath(VISIBILITY.you, 600, 180)}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {/* End-of-line marker the cursor points at */}
                <span
                  ref={chartEndRef}
                  className={`absolute right-4 size-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20 ${
                    perfOpen ? "animate-[hero-fade-in_400ms_ease-out_1200ms_both]" : "opacity-0"
                  }`}
                  style={{ top: `calc(0.5rem + ${(1 - VISIBILITY.you[VISIBILITY.you.length - 1] / VISIBILITY_MAX) * 7}rem)` }}
                />
                <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </div>
            </div>

            <div className="mx-5 mt-3 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/[0.08]">
              <div className="flex items-center gap-1.5 border-b border-black/[0.08] px-4 py-2.5">
                <p className="text-sm font-semibold text-gray-900">Keyword Performance</p>
                <span className="text-xs tabular-nums text-gray-500">· {PERFORMANCE.length}</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-black/[0.08] border-b border-black/[0.08]">
                <div className="px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Avg Ranking</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">3</p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Ranked Keywords</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">{PERFORMANCE.length} <span className="text-sm text-gray-500">/ {PERFORMANCE.length}</span></p>
                </div>
              </div>
              {/* Filters + Export Keyword Report, like PerformanceFilters */}
              <div className="flex items-center gap-1.5 border-b border-black/[0.08] px-3 py-2">
                {["Keyword", "Volume", "Rank"].map((label) => (
                  <span key={label} className="flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                    {label}
                    <ChevronDownIcon className="size-3 text-gray-400" />
                  </span>
                ))}
                <span className="rounded-lg bg-gray-50 p-0.5">
                  <span className="block rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">All</span>
                </span>
                <span
                  ref={exportRef}
                  className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all ${
                    step === "pressExport" ? "scale-95 bg-indigo-700" : exporting ? "bg-indigo-600 opacity-70" : "bg-indigo-600"
                  }`}
                >
                  {exporting
                    ? <span className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    : <ArrowDownTrayIcon className="size-3.5" />}
                  {exporting ? "Exporting…" : "Export Keyword Report"}
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/[0.08]">
                    <th rowSpan={2} className="px-4 py-2 text-left align-bottom text-[10px] font-semibold uppercase tracking-wider text-gray-400">Keyword</th>
                    <th rowSpan={2} className="px-3 py-2 text-left align-bottom text-[10px] font-semibold uppercase tracking-wider text-gray-400">Volume</th>
                    <th rowSpan={2} className="px-3 py-2 text-left align-bottom text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">Est. Daily Downloads</th>
                    <th colSpan={2} className="border-l border-black/[0.08] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-3.5 rounded bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600" />
                        Instagram
                      </span>
                    </th>
                    <th colSpan={2} className="border-l border-black/[0.08] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-3.5 rounded bg-gradient-to-br from-sky-400 to-indigo-500" />
                        Snapgram
                      </span>
                    </th>
                  </tr>
                  <tr className="border-b border-black/[0.08]">
                    <th className="border-l border-black/[0.08] px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Rank</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Change</th>
                    <th className="border-l border-black/[0.08] px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Rank</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-400">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {PERFORMANCE.map((row, i) => (
                    <tr
                      key={row.keyword}
                      className={`${"isNew" in row ? "bg-indigo-50/50" : ""} ${perfOpen ? "animate-[hero-row-in_400ms_ease-out_both]" : ""}`}
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5 text-sm text-gray-800 whitespace-nowrap">
                          {row.keyword}
                          {"isNew" in row && <span className="rounded bg-indigo-100 px-1.5 py-px text-[9px] font-semibold text-indigo-700">New</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><VolumeBar value={row.volume} /></td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">~{DOWNLOADS_FORMATTER.format(row.downloads)}</td>
                      <td className="border-l border-black/[0.06] px-3 py-2.5">
                        <span className={`text-sm font-medium tabular-nums ${rankColor(row.rank)}`}>#{row.rank}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span ref={i === 1 ? perfChangeRef : undefined}><ChangeCell value={row.change} /></span>
                      </td>
                      <td className="border-l border-black/[0.06] px-3 py-2.5">
                        <span className={`text-sm tabular-nums ${rankColor(row.theirRank)}`}>#{row.theirRank}</span>
                      </td>
                      <td className="px-3 py-2.5"><ChangeCell value={row.theirChange} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* The export's "downloaded" notice */}
            <div
              className={`absolute bottom-24 right-5 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-black/[0.08] transition-all duration-300 ${
                exportToast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
              }`}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckIcon className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-900">instagram-keyword-performance.xlsx</p>
                <p className="text-[11px] text-gray-500">Monthly volume &amp; rankings, ready to share</p>
              </div>
            </div>

            {/* The downloaded file, opened: a spreadsheet window showing the
                report's current month sheet. */}
            <div
              aria-hidden={!sheetOpen}
              className={`absolute inset-x-8 top-16 z-10 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/[0.12] transition-all duration-500 ${
                sheetOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-[0.98] opacity-0"
              }`}
            >
              {/* Title bar */}
              <div className="flex items-center gap-2 bg-[#107c41] px-3 py-2 text-white">
                <span className="flex size-5 items-center justify-center rounded bg-white/20 text-[10px] font-bold">X</span>
                <span className="text-xs font-medium">instagram-keyword-performance.xlsx</span>
                <span className="ml-auto flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-white/40" />
                  <span className="size-2.5 rounded-full bg-white/40" />
                  <span className="size-2.5 rounded-full bg-white/40" />
                </span>
              </div>
              {/* Formula bar */}
              <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                <span className="w-10 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-center font-medium text-gray-700">D4</span>
                <span className="italic text-gray-400">fx</span>
                <span className="text-gray-700">+12</span>
              </div>
              {/* Grid */}
              <div className="grid grid-cols-[2rem_minmax(0,2.2fr)_1fr_1.2fr_0.9fr_1.2fr] text-[11px]">
                <div className="border-b border-r border-gray-200 bg-gray-100" />
                {["A", "B", "C", "D", "E"].map((col) => (
                  <div key={col} className="border-b border-r border-gray-200 bg-gray-100 py-0.5 text-center text-gray-500">{col}</div>
                ))}

                <div className="border-b border-r border-gray-200 bg-gray-100 py-1.5 text-center text-gray-500">1</div>
                {["Keyword", "Volume", "Highest Ranking", "Change", "Est. Downloads"].map((h) => (
                  <div key={h} className="border-b border-r border-indigo-500 bg-indigo-600 px-2 py-1.5 font-bold text-white">{h}</div>
                ))}

                {REPORT_ROWS.map((row, i) => {
                  const zebra = i % 2 === 1 ? "bg-gray-50" : "bg-white";
                  const change = row.change;
                  return (
                    <div key={row.keyword} className="contents">
                      <div className="border-b border-r border-gray-200 bg-gray-100 py-1.5 text-center text-gray-500">{i + 2}</div>
                      <div className={`border-b border-r border-gray-200 px-2 py-1.5 text-gray-800 ${zebra}`}>{row.keyword}</div>
                      <div className={`border-b border-r border-gray-200 px-2 py-1.5 text-gray-800 ${zebra}`}>{row.volume}</div>
                      <div className={`border-b border-r border-gray-200 px-2 py-1.5 text-gray-800 ${zebra}`}>{row.ranking}</div>
                      <div
                        ref={i === 2 ? sheetCellRef : undefined}
                        className={`border-b border-r px-2 py-1.5 font-bold ${
                          change > 0
                            ? "bg-green-100 text-green-700"
                            : change < 0
                              ? "bg-red-100 text-red-700"
                              : `font-normal text-gray-800 ${zebra}`
                        } ${i === 2 ? "outline outline-2 -outline-offset-2 outline-[#107c41]" : "border-gray-200"}`}
                      >
                        {change > 0 ? `+${change}` : change}
                      </div>
                      <div className={`border-b border-r border-gray-200 px-2 py-1.5 text-gray-800 ${zebra}`}>
                        {Math.round(row.downloads * 30).toLocaleString("en-US")}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Sheet tabs: one per month */}
              <div className="flex items-center gap-0.5 border-t border-gray-200 bg-gray-50 px-2 pt-0.5 text-[11px]">
                {REPORT_MONTHS.map((month, i) => (
                  <span
                    key={month}
                    className={`rounded-b px-3 py-1 ${
                      i === 0 ? "border-x border-b border-gray-200 bg-white font-semibold text-indigo-700 shadow-[inset_0_2px_0_#4f46e5]" : "text-gray-500"
                    }`}
                  >
                    {month}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>

    {/* Chapter labels: show where the loop is, and jump to a part on click. */}
    <div className="flex flex-wrap items-center justify-center gap-2 pt-3 pb-1">
      {SCENES.map((sc, i) => {
        const active = i === scene;
        return (
          <button
            key={sc.label}
            type="button"
            onClick={() => jumpTo(STEP_INDEX[sc.start])}
            className={`relative overflow-hidden rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              active ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span className="relative z-10">{i + 1}. {sc.label}</span>
            {active && running && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-indigo-500 animate-[hero-progress_linear_forwards]"
                style={{ animationDuration: `${SCENE_RANGES[i][1] - SCENE_RANGES[i][0]}ms` }}
              />
            )}
          </button>
        );
      })}
    </div>
    </div>
  );
}

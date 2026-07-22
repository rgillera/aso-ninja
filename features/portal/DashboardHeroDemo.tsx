"use client";

import { useEffect, useRef, useState } from "react";
import {
  MagnifyingGlassIcon,
  MagnifyingGlassCircleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  PlusIcon,
  StarIcon,
  SparklesIcon,
  CameraIcon,
  Squares2X2Icon,
  DocumentChartBarIcon,
  RectangleStackIcon,
  PuzzlePieceIcon,
  ArrowTrendingUpIcon,
  ListBulletIcon,
  TagIcon,
  TableCellsIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { VolumeBar, TranslateToggle } from "@/features/aso/keywords/research/ui";
import { scorePill } from "@/features/onboarding/demo";
import { countryFlag } from "@/libs/countries";

// A static, fully fake replica of the Keyword Research screen — same
// approach as the onboarding/how-it-works demo components (real markup,
// sample data, no live calls) so the marketing hero renders instead of
// shipping a screenshot that goes stale the moment the UI changes.

const ROWS = [
  { keyword: "instagram",          volume: 82, diff: 100, chance: 95, relevancy: 100, opportunity: 88, estDownloads: 482_000, rank: 1 },
  { keyword: "instagram reels",    volume: 55, diff: 100, chance: 95, relevancy: 75,  opportunity: 41, estDownloads: 64_000,  rank: 1 },
  { keyword: "social media",       volume: 57, diff: 100, chance: 95, relevancy: 68,  opportunity: 34, estDownloads: 51_000,  rank: 1 },
  { keyword: "instagram feed",     volume: 5,  diff: 70,  chance: 94, relevancy: 64,  opportunity: 9,  estDownloads: 3_100,   rank: 6 },
  { keyword: "instagram connect",  volume: 5,  diff: 72,  chance: 52, relevancy: 69,  opportunity: 8,  estDownloads: 2_800,   rank: 48 },
];

const DOWNLOADS_FORMATTER = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

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
        active ? "bg-white/10 text-white" : "text-gray-400"
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

function SubNavRow({ icon: Icon, label, active }: { icon: typeof Squares2X2Icon; label: string; active?: boolean }) {
  return (
    <div
      className={`ml-3 flex items-center gap-2 rounded-lg border-l border-white/[0.07] pl-2.5 py-1 text-xs font-medium ${
        active ? "bg-white/10 text-white" : "text-gray-400"
      }`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </div>
  );
}

function FooterRow({ icon: Icon, label, badge }: { icon: typeof Squares2X2Icon; label: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-gray-500">
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="shrink-0 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">{badge}</span>
      )}
    </div>
  );
}

function Chip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
        active
          ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40"
          : "bg-white/[0.04] text-gray-400 ring-1 ring-white/[0.08]"
      }`}
    >
      {active ? <CheckIcon className="size-2.5" /> : <PlusIcon className="size-2.5" />}
      {label}
    </span>
  );
}

function KeywordGroup({ label, count, chips }: { label: string; count: string; chips: { label: string; active?: boolean }[] }) {
  return (
    <div className="px-4 py-3 border-b border-white/[0.05] last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
          {label} <span className="text-gray-700 normal-case font-normal">{count}</span>
        </span>
        <span className="text-[11px] text-indigo-400">+ Analyze all</span>
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
    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
      <span className={`flex items-center gap-1 ${active ? "text-gray-200" : ""}`}>
        {children}
        {active && <ChevronDownIcon className="size-3 text-indigo-400" />}
      </span>
    </th>
  );
}

function diffColor(v: number) {
  return v > 60 ? "text-red-400" : v > 40 ? "text-yellow-400" : "text-emerald-400";
}

function chanceColor(v: number) {
  return v > 15 ? "text-emerald-400" : "text-gray-400";
}

function rankColor(v: number) {
  return v <= 3 ? "text-emerald-400" : v <= 10 ? "text-yellow-400" : "text-gray-300";
}

export function DashboardHeroDemo() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

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

  // Below DEMO_WIDTH the mockup is pinned to its designed width and scaled
  // down to fit; above it, it stays fluid (same as before this ever measured
  // anything) so it keeps filling wider containers instead of leaving a gap.
  const scaled = scale < 1;

  return (
    <div
      ref={outerRef}
      className={`rounded-xl ${scaled ? "overflow-hidden" : "overflow-x-auto"}`}
      style={scaled ? { height: naturalHeight * scale } : undefined}
    >
      <div ref={innerRef} style={scaled ? { width: DEMO_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" } : undefined}>
      <div className="flex min-w-[1000px] rounded-xl bg-[#0d0f14] ring-1 ring-white/[0.07] overflow-hidden">
        {/* Sidebar — mirrors features/dashboard/DashboardSidebar.tsx's structure,
            labels, and icons, collapsed to the state it'd be in on this page
            (Keywords section open, Metadata/Reviews collapsed). */}
        <aside className="flex w-48 shrink-0 flex-col border-r border-white/[0.07] p-2.5">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 mb-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded bg-indigo-500 text-[10px] font-bold text-white">A</div>
            <span className="flex-1 truncate text-sm font-medium text-white">AppASO Work…</span>
            <ChevronDownIcon className="size-3.5 text-gray-500 shrink-0" />
          </div>

          <div className="space-y-1">
            <NavRow icon={Squares2X2Icon} label="My Apps" />
          </div>

          <p className="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">ASO Intelligence</p>
          <div className="space-y-1">
            <NavRow icon={DocumentChartBarIcon} label="Reports" />
            <NavRow icon={RectangleStackIcon} label="Metadata" chevronOpen={false} />
            <NavRow icon={MagnifyingGlassIcon} label="Keywords" active chevronOpen={true} />
            <div className="space-y-0.5">
              <SubNavRow icon={MagnifyingGlassIcon} label="Keyword Research" active />
              <SubNavRow icon={PuzzlePieceIcon} label="Long Tail Keywords" />
              <SubNavRow icon={ArrowTrendingUpIcon} label="Keyword Performance" />
              <SubNavRow icon={ListBulletIcon} label="Ranked Keywords" />
              <SubNavRow icon={TagIcon} label="Group by Intent" />
            </div>
            <NavRow icon={StarIcon} label="Reviews & Ratings" chevronOpen={false} />
          </div>

          <p className="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Market Intelligence</p>
          <div className="space-y-1">
            <NavRow icon={MagnifyingGlassCircleIcon} label="App Explorer" />
          </div>

          <div className="mt-auto space-y-0.5 border-t border-white/[0.07] pt-3">
            <FooterRow icon={RocketLaunchIcon} label="Onboarding steps" />
            <FooterRow icon={AcademicCapIcon} label="Learning Center" />
            <FooterRow icon={ChatBubbleLeftRightIcon} label="Chat with us 👋" />
            <FooterRow icon={CreditCardIcon} label="Manage Plan" badge="Enterprise" />
            <FooterRow icon={UserCircleIcon} label="Account settings" />
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 bg-[#0f1115]">
          {/* Top search bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.07]">
            <MagnifyingGlassIcon className="size-4 text-gray-600 shrink-0" />
            <span className="text-sm text-gray-600">Search for an app by name, app id or URL …</span>
          </div>

          {/* App header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                <CameraIcon className="size-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Instagram</p>
                <p className="text-xs text-gray-500 leading-tight flex items-center gap-1">
                  <img src="/app-store.svg" alt="" className="size-3" />
                  App Store
                  <span className="ml-1.5">&middot; {countryFlag("us")} US</span>
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/25 shrink-0">
                <CheckIcon className="size-3.5" />
                Unfollow
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-gray-400 ring-1 ring-white/[0.08] shrink-0">
                <img src="/app-store.svg" alt="" className="size-3.5" />
                App Store
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-white">Keyword Research</h1>
              <InformationCircleIcon className="size-4 text-gray-500" />
            </div>
          </div>

          {/* Keyword Suggestions panel */}
          <div className="mx-5 mt-4 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
              <span className="text-sm font-semibold text-white">Keyword Suggestions</span>
              <ChevronUpIcon className="size-4 text-gray-500" />
            </div>

            <div className="flex overflow-x-auto border-b border-white/[0.07]">
              <span className="px-3.5 py-3 text-xs font-medium border-b-2 border-indigo-400 text-white shrink-0">Metadata</span>
              <span className="px-3.5 py-3 text-xs font-medium text-gray-500 shrink-0">Competitors</span>
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
          <div className="mx-5 my-4 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.07] flex-wrap gap-y-2">
              {["Keyword", "Volume", "Rank", "Relevancy"].map((label) => (
                <span key={label} className="flex items-center gap-1 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-2.5 py-1 text-xs text-gray-400">
                  {label === "Relevancy" && <SparklesIcon className="size-3 text-violet-400" />}
                  {label}
                  <ChevronDownIcon className="size-3 text-gray-600" />
                </span>
              ))}
              <div className="flex items-center rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] p-0.5">
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white">All</span>
                <span className="rounded-md p-1 text-gray-500"><CheckIcon className="size-3.5" /></span>
                <span className="rounded-md p-1 text-gray-500"><StarIcon className="size-3.5" /></span>
              </div>
              <div className="ml-auto">
                <TranslateToggle checked={false} onChange={() => {}} locked={false} />
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.07]">
              <div className="flex-1 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-2.5 py-1.5 text-xs text-gray-600">
                Enter comma-separated keywords to add…
              </div>
              <span className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shrink-0">
                <PlusIcon className="size-3.5" />
                Add
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-2.5 py-1.5 text-xs text-gray-400 shrink-0">
                <TableCellsIcon className="size-3.5" />
                Edit columns
                <ChevronDownIcon className="size-3 text-gray-600" />
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="w-8 px-3 py-2">
                      <span className="block size-3.5 rounded border border-gray-700" />
                    </th>
                    <ColHead>Keywords</ColHead>
                    <ColHead>Volume</ColHead>
                    <ColHead>Diff.</ColHead>
                    <ColHead>Chance</ColHead>
                    <ColHead>Relevancy</ColHead>
                    <ColHead active>Opportunity</ColHead>
                    <ColHead>Est. Downloads</ColHead>
                    <ColHead>App Rank</ColHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {ROWS.map((row) => (
                    <tr key={row.keyword}>
                      <td className="px-3 py-2.5">
                        <span className="block size-3.5 rounded border border-gray-700" />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <StarIcon className="size-3.5 text-gray-600 shrink-0" />
                          <span className="text-sm text-gray-200 whitespace-nowrap">{row.keyword}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><VolumeBar value={row.volume} /></td>
                      <td className="px-3 py-2.5"><span className={`text-sm ${diffColor(row.diff)}`}>{row.diff}</span></td>
                      <td className="px-3 py-2.5"><span className={`text-sm ${chanceColor(row.chance)}`}>{row.chance}</span></td>
                      <td className="px-3 py-2.5">{scorePill(row.relevancy)}</td>
                      <td className="px-3 py-2.5">{scorePill(row.opportunity)}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-sm text-gray-300">~{DOWNLOADS_FORMATTER.format(row.estDownloads)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-sm font-medium tabular-nums ${rankColor(row.rank)}`}>#{row.rank}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

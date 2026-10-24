"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ChartBarIcon, CheckIcon, ExclamationTriangleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import type { StripeMrr } from "@/libs/stripe/mrr";
import type { DailyActiveUsers, PayingUserEngagement, RecentActiveUser, RetentionCohort, UserMilestones } from "@/features/admin/types";
import { PLAN_BADGE_CLASSES, PLAN_BADGE_FALLBACK, formatDuration } from "@/features/admin/format";

type Props = {
  totals: { dau: number; wau: number; mau: number };
  revenue: { paying: number; trialing: number };
  mrr: StripeMrr | null;
  dailyActive: DailyActiveUsers[];
  retention: RetentionCohort[];
  users: UserMilestones[];
  payingUsers: PayingUserEngagement[];
  recentActive: RecentActiveUser[];
  recentDays: number;
};

// user_activity_days (and visit counting) started on this day; anything
// before it reads as zero activity, not churn.
const DAILY_TRACKING_SINCE = "2026-10-23";

const DAY_MS = 24 * 60 * 60 * 1000;

const CARD = "rounded-2xl bg-[#141417] light:bg-white shadow-lg shadow-black/20";
const SECTION_TITLE = "text-sm font-semibold text-white light:text-gray-900";
const SECTION_NOTE = "mt-0.5 text-xs text-gray-500";
const TH = "px-5 py-3 font-semibold";
const THEAD_ROW =
  "border-b border-white/[0.07] light:border-black/[0.08] text-left text-[10px] font-semibold tracking-widest text-gray-600 light:text-gray-400 uppercase";
const TBODY = "divide-y divide-white/[0.07] light:divide-black/[0.08]";

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Plain date columns (day, cohort_week) are UTC calendar days; format them
// without shifting into the viewer's timezone.
function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatGap(ms: number): string {
  const hours = ms / (60 * 60 * 1000);
  if (hours < 1) return "under 1h";
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Whether MRR is hidden, remembered per browser. The server snapshot is
// "hidden" so a hidden MRR never flashes on screen before hydration.
const HIDE_MRR_KEY = "admin_hide_mrr";
const hideMrrListeners = new Set<() => void>();
// Fallback for when localStorage is blocked, so the toggle still works for
// this page view.
let hideMrrMemory = false;

function readHideMrr(): boolean {
  try {
    const stored = localStorage.getItem(HIDE_MRR_KEY);
    return stored === null ? hideMrrMemory : stored === "1";
  } catch {
    return hideMrrMemory;
  }
}

function writeHideMrr(hidden: boolean) {
  hideMrrMemory = hidden;
  try {
    localStorage.setItem(HIDE_MRR_KEY, hidden ? "1" : "0");
  } catch {
    // Blocked storage: hideMrrMemory covers this page view.
  }
  hideMrrListeners.forEach((l) => l());
}

function subscribeHideMrr(listener: () => void) {
  hideMrrListeners.add(listener);
  return () => {
    hideMrrListeners.delete(listener);
  };
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(cents / 100);
}

function mrrHint(mrr: StripeMrr | null): string {
  if (!mrr) return "Couldn't reach Stripe";
  const parts = [`${mrr.subscriptions.toLocaleString()} ${mrr.subscriptions === 1 ? "subscription" : "subscriptions"}`];
  if (mrr.otherCurrencies.length) parts.push(`plus ${mrr.otherCurrencies.map((c) => c.toUpperCase()).join(", ")}`);
  if (mrr.testMode) parts.push("test mode");
  return parts.join(" · ");
}

function pct(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function Section({ title, note, children }: { title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className={SECTION_TITLE}>{title}</h2>
      {note && <p className={SECTION_NOTE}>{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StatTile({ label, value, hint, action }: { label: string; value: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className={`${CARD} px-5 py-4`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-500">{label}</div>
        {action}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-white light:text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{hint}</div>
    </div>
  );
}

function DailyActiveChart({ data }: { data: DailyActiveUsers[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.users));
  const hovered = hover !== null ? data[hover] : null;

  return (
    <div className={`${CARD} p-5`}>
      <div className="relative">
        {/* Recessive guide at the max value so bar heights have a reference. */}
        <div className="flex items-center gap-2 text-[10px] text-gray-500 tabular-nums">
          <span>{max}</span>
          <div className="flex-1 border-t border-dashed border-white/[0.07] light:border-black/[0.08]" />
        </div>
        <div className="flex h-36 items-end gap-[2px] border-b border-white/[0.1] light:border-black/[0.1]" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div
              key={d.day}
              onMouseEnter={() => setHover(i)}
              className="flex h-full flex-1 items-end"
              aria-label={`${formatDay(d.day)}: ${d.users} active users`}
            >
              <div
                className={`w-full rounded-t-[4px] transition-colors ${
                  hover === i ? "bg-indigo-300 light:bg-indigo-700" : "bg-indigo-500 light:bg-indigo-600"
                }`}
                style={{ height: d.users > 0 ? `${Math.max(2, (d.users / max) * 100)}%` : 0 }}
              />
            </div>
          ))}
        </div>
        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-[#0a0a0c] light:bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-white/[0.1] light:ring-black/[0.1] whitespace-nowrap"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
          >
            <div className="text-gray-400 light:text-gray-600">{formatDay(hovered.day)}</div>
            <div className="font-semibold text-white light:text-gray-900 tabular-nums">
              {hovered.users.toLocaleString()} active {hovered.users === 1 ? "user" : "users"}
            </div>
          </div>
        )}
        <div className="mt-2 flex justify-between text-[10px] text-gray-500">
          <span>{data.length ? formatDay(data[0].day) : ""}</span>
          <span>{data.length ? formatDay(data[data.length - 1].day) : ""}</span>
        </div>
      </div>
    </div>
  );
}

function RetentionCell({ rate }: { rate: { hit: number; eligible: number } }) {
  if (rate.eligible === 0) {
    return <td className="px-5 py-3 text-right text-gray-600 light:text-gray-400" title="Too early to tell">–</td>;
  }
  const share = rate.hit / rate.eligible;
  return (
    <td className="px-5 py-3 text-right" title={`${rate.hit} of ${rate.eligible} users`}>
      {/* One hue, darker = more retained; the number is always printed. */}
      <span
        className="inline-block min-w-12 rounded-md px-2 py-0.5 tabular-nums text-white light:text-gray-900"
        style={{ backgroundColor: `rgb(99 102 241 / ${0.08 + share * 0.6})` }}
      >
        {pct(rate.hit, rate.eligible)}
      </span>
    </td>
  );
}

type Milestone = {
  key: keyof Pick<
    UserMilestones,
    "firstAppAt" | "firstKeywordAt" | "firstInspectAt" | "firstCompetitorAt" | "tourCompletedAt" | "firstCheckoutAt" | "paidAt"
  >;
  label: string;
  short: string;
};

const MILESTONES: Milestone[] = [
  { key: "firstAppAt", label: "Added an app", short: "App" },
  { key: "firstKeywordAt", label: "Added a keyword", short: "Keyword" },
  { key: "firstInspectAt", label: "Used Keyword Inspector", short: "Inspector" },
  { key: "firstCompetitorAt", label: "Added a competitor", short: "Competitor" },
  { key: "tourCompletedAt", label: "Finished the tour", short: "Tour" },
  { key: "firstCheckoutAt", label: "Started checkout", short: "Checkout" },
  { key: "paidAt", label: "Paid", short: "Paid" },
];

// Features beyond the activation steps, shown as chips in the New signups
// table so the step columns stay readable.
const OTHER_FEATURES: { key: keyof UserMilestones; label: string }[] = [
  { key: "firstCombinationAt", label: "Combinations" },
  { key: "firstAiPromptAt", label: "AI Visibility" },
  { key: "firstStoreLinkAt", label: "Store data" },
  { key: "firstAsaLinkAt", label: "Search Ads" },
  { key: "firstInviteAt", label: "Invited teammate" },
  { key: "firstPushAt", label: "Push alerts" },
  { key: "firstCertificationAt", label: "Certification" },
];

const RECENT_PAGE = 20;

const WINDOWS = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: null, label: "All time" },
] as const;

function FunnelBar({ label, count, total, note }: { label: string; count: number; total: number; note?: string }) {
  const width = total ? (count / total) * 100 : 0;
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 py-1.5 text-xs">
      <span className="truncate text-gray-300 light:text-gray-700">{label}</span>
      <div className="h-2.5 rounded-full bg-white/[0.04] light:bg-black/[0.04]">
        <div className="h-full rounded-full bg-indigo-500 light:bg-indigo-600" style={{ width: `${width}%` }} />
      </div>
      <span className="w-40 text-right tabular-nums text-gray-400 light:text-gray-600">
        <span className="font-semibold text-white light:text-gray-900">{count.toLocaleString()}</span> · {pct(count, total)}
        {note && <span className="text-gray-500"> · {note}</span>}
      </span>
    </div>
  );
}

type RiskReason = "canceling" | "inactive" | "dropping";

const RISK_LABELS: Record<RiskReason, string> = {
  canceling: "Set to cancel",
  inactive: "No use in 14+ days",
  dropping: "Visits down",
};

// At risk = canceling at period end, unused for 14+ days, or visiting at
// most half as often as in the 14 days before (and that earlier period had
// enough visits for the drop to mean something).
function riskReasons(u: PayingUserEngagement, now: number): RiskReason[] {
  const reasons: RiskReason[] = [];
  if (u.cancelAtPeriodEnd) reasons.push("canceling");
  if (!u.lastActiveAt || now - new Date(u.lastActiveAt).getTime() > 14 * DAY_MS) reasons.push("inactive");
  else if (u.visitsPrev14 >= 3 && u.visitsLast14 <= u.visitsPrev14 / 2) reasons.push("dropping");
  return reasons;
}

export default function AdminEngagementPage({ totals, revenue, mrr, dailyActive, retention, users, payingUsers, recentActive, recentDays }: Props) {
  const [windowDays, setWindowDays] = useState<number | null>(30);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const mrrHidden = useSyncExternalStore(subscribeHideMrr, readHideMrr, () => true);
  // Rendered fresh on each request; fixed for the life of the page so
  // memoized filters stay stable.
  const [now] = useState(() => Date.now());

  const cohortUsers = useMemo(
    () => (windowDays === null ? users : users.filter((u) => now - new Date(u.createdAt).getTime() <= windowDays * DAY_MS)),
    [users, windowDays, now]
  );

  const activation = useMemo(
    () =>
      MILESTONES.map((m) => {
        const reached = cohortUsers.filter((u) => u[m.key]);
        const gaps = reached.map((u) => new Date(u[m.key]!).getTime() - new Date(u.createdAt).getTime()).filter((g) => g >= 0);
        const mid = median(gaps);
        return { ...m, count: reached.length, medianGap: mid };
      }),
    [cohortUsers]
  );

  const recentSignups = useMemo(
    () =>
      users
        .filter((u) => now - new Date(u.createdAt).getTime() <= 14 * DAY_MS)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [users, now]
  );

  const upgrade = useMemo(() => {
    const viewedPricing = users.filter((u) => u.pricingViews > 0).length;
    const startedCheckout = users.filter((u) => u.firstCheckoutAt).length;
    const paid = users.filter((u) => u.paidAt).length;
    // Started a checkout and still on the free plan: the follow-up list.
    const abandoned = users
      .filter((u) => u.lastCheckoutAt && u.planSlug === "free")
      .sort((a, b) => new Date(b.lastCheckoutAt!).getTime() - new Date(a.lastCheckoutAt!).getTime());
    return { viewedPricing, startedCheckout, paid, abandoned };
  }, [users]);

  const atRisk = useMemo(
    () =>
      payingUsers
        .map((u) => ({ ...u, reasons: riskReasons(u, now) }))
        .filter((u) => u.reasons.length > 0)
        .sort(
          (a, b) =>
            (a.currentPeriodEnd ? new Date(a.currentPeriodEnd).getTime() : Infinity) -
            (b.currentPeriodEnd ? new Date(b.currentPeriodEnd).getTime() : Infinity)
        ),
    [payingUsers, now]
  );

  const stickiness = totals.mau ? Math.round((totals.dau / totals.mau) * 100) : 0;

  const signups = useMemo(() => {
    const age = (u: UserMilestones) => now - new Date(u.createdAt).getTime();
    return {
      thisWeek: users.filter((u) => age(u) <= 7 * DAY_MS).length,
      lastWeek: users.filter((u) => age(u) > 7 * DAY_MS && age(u) <= 14 * DAY_MS).length,
      paid: users.filter((u) => u.paidAt).length,
    };
  }, [users, now]);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <ChartBarIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Super Admin · Engagement</h1>
            <p className="text-xs text-gray-500">
              Days are UTC. Daily activity tracked since {formatDay(DAILY_TRACKING_SINCE)}; super admins excluded.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label="MRR"
            value={mrrHidden ? "••••" : mrr ? formatMoney(mrr.cents, mrr.currency) : "–"}
            hint={mrrHint(mrr)}
            action={
              <button
                type="button"
                onClick={() => writeHideMrr(!mrrHidden)}
                title={mrrHidden ? "Show MRR" : "Hide MRR"}
                aria-label={mrrHidden ? "Show MRR" : "Hide MRR"}
                className="-m-1 rounded p-1 text-gray-500 hover:text-white light:hover:text-gray-900 hover:bg-white/[0.06] light:hover:bg-black/[0.05] transition-colors"
              >
                {mrrHidden ? <EyeSlashIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
              </button>
            }
          />
          <StatTile
            label="Paying users"
            value={revenue.paying.toLocaleString()}
            hint={revenue.trialing ? `Plus ${revenue.trialing.toLocaleString()} on trial` : "No one on trial"}
          />
          <StatTile label="Signups, 7 days" value={signups.thisWeek.toLocaleString()} hint={`${signups.lastWeek.toLocaleString()} the week before`} />
          <StatTile label="Signup to paid" value={pct(signups.paid, users.length)} hint={`${signups.paid.toLocaleString()} of ${users.length.toLocaleString()} users, all time`} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Today" value={totals.dau.toLocaleString()} hint="Active users today" />
          <StatTile label="7 days" value={totals.wau.toLocaleString()} hint="Active in the last 7 days" />
          <StatTile label="30 days" value={totals.mau.toLocaleString()} hint="Active in the last 30 days" />
          <StatTile label="Stickiness" value={`${stickiness}%`} hint="Today's users / 30-day users" />
        </div>

        <Section title="Daily active users" note="Users who used the app each day, last 30 days.">
          <DailyActiveChart data={dailyActive} />
        </Section>

        <Section
          title="Recently active"
          note={`${recentActive.length.toLocaleString()} users active in the last ${recentDays} days, most recent first. Visits, days and time are for the last 7 days.`}
        >
          <div className={`${CARD} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Email</th>
                    <th className={TH}>Plan</th>
                    <th className={TH}>Last active</th>
                    <th className={`${TH} text-right`}>Visits</th>
                    <th className={`${TH} text-right`}>Days</th>
                    <th className={`${TH} text-right`}>Time</th>
                    <th className={`${TH} text-right`}>All-time visits</th>
                    <th className={`${TH} text-right`}>Pricing views</th>
                    <th className={TH}>Last pricing view</th>
                    <th className={TH}>Joined</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {(showAllRecent ? recentActive : recentActive.slice(0, RECENT_PAGE)).map((u) => (
                    <tr key={u.userId} className="hover:bg-white/[0.03] light:hover:bg-black/[0.02]">
                      <td className="px-5 py-3 text-white light:text-gray-900 truncate max-w-xs">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PLAN_BADGE_CLASSES[u.planSlug] ?? PLAN_BADGE_FALLBACK}`}>
                          {u.planName}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-300 light:text-gray-700 whitespace-nowrap" title={new Date(u.lastActiveAt).toLocaleString()}>
                        {formatAgo(u.lastActiveAt, now)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300 light:text-gray-700">{u.visits7d.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300 light:text-gray-700">{u.activeDays7d.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300 light:text-gray-700 whitespace-nowrap">{formatDuration(u.activeSeconds7d)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300 light:text-gray-700">{u.visitCount.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300 light:text-gray-700">{u.pricingViews.toLocaleString()}</td>
                      <td
                        className="px-5 py-3 text-gray-300 light:text-gray-700 whitespace-nowrap"
                        title={u.lastPricingViewAt ? new Date(u.lastPricingViewAt).toLocaleString() : u.pricingViews > 0 ? "Viewed before view times were recorded" : undefined}
                      >
                        {u.lastPricingViewAt ? formatAgo(u.lastPricingViewAt, now) : u.pricingViews > 0 ? "Earlier" : "Never"}
                      </td>
                      <td className="px-5 py-3 text-gray-400 light:text-gray-600 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recentActive.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-500">Nobody active in the last {recentDays} days.</div>
            )}
            {recentActive.length > RECENT_PAGE && (
              <button
                onClick={() => setShowAllRecent((v) => !v)}
                className="w-full border-t border-white/[0.07] light:border-black/[0.08] px-5 py-3 text-xs text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 transition-colors"
              >
                {showAllRecent ? "Show fewer" : `Show all ${recentActive.length.toLocaleString()}`}
              </button>
            )}
          </div>
        </Section>

        <Section
          title="Retention by signup week"
          note="Share of each week's signups who came back on day 1, during days 1 to 7, and during days 22 to 28. A dash means not enough time has passed."
        >
          <div className={`${CARD} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Signed up week of</th>
                    <th className={`${TH} text-right`}>Signups</th>
                    <th className={`${TH} text-right`}>Day 1</th>
                    <th className={`${TH} text-right`}>Week 1</th>
                    <th className={`${TH} text-right`}>Week 4</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {retention.map((c) => (
                    <tr key={c.cohortWeek}>
                      <td className="px-5 py-3 text-gray-300 light:text-gray-700 whitespace-nowrap">{formatDay(c.cohortWeek)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300 light:text-gray-700">{c.users.toLocaleString()}</td>
                      <RetentionCell rate={c.d1} />
                      <RetentionCell rate={c.w1} />
                      <RetentionCell rate={c.w4} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {retention.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-500">No signups in the last 8 weeks.</div>}
          </div>
        </Section>

        <Section title="Activation" note="How many signups reached each step, and the median time from signup to getting there.">
          <div className={`${CARD} p-5`}>
            <div className="mb-3 flex flex-wrap items-center gap-1">
              <span className="mr-2 text-xs text-gray-500">Signed up in the last</span>
              {WINDOWS.map((w) => (
                <button
                  key={w.label}
                  onClick={() => setWindowDays(w.days)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    windowDays === w.days
                      ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
                      : "text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <FunnelBar label="Signed up" count={cohortUsers.length} total={cohortUsers.length} />
            {activation.map((m) => (
              <FunnelBar
                key={m.key}
                label={m.label}
                count={m.count}
                total={cohortUsers.length}
                note={m.medianGap !== null ? formatGap(m.medianGap) : undefined}
              />
            ))}
            <p className="mt-3 text-[11px] text-gray-500">Tour, checkout and payment events are recorded from {formatDay(DAILY_TRACKING_SINCE)}.</p>
          </div>
        </Section>

        <Section title="New signups, last 14 days" note="Which steps each new user has reached, and which other features they've tried.">
          <div className={`${CARD} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Email</th>
                    <th className={TH}>Joined</th>
                    {MILESTONES.map((m) => (
                      <th key={m.key} className={`${TH} text-center`}>
                        {m.short}
                      </th>
                    ))}
                    <th className={TH}>Also used</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {recentSignups.map((u) => (
                    <tr key={u.userId} className="hover:bg-white/[0.03] light:hover:bg-black/[0.02]">
                      <td className="px-5 py-3 text-white light:text-gray-900 truncate max-w-xs">{u.email}</td>
                      <td className="px-5 py-3 text-gray-400 light:text-gray-600 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      {MILESTONES.map((m) => (
                        <td key={m.key} className="px-5 py-3 text-center">
                          {u[m.key] ? (
                            <CheckIcon className="mx-auto size-4 text-emerald-400 light:text-emerald-600" aria-label={`${m.label}: yes`} />
                          ) : (
                            <span className="text-gray-700 light:text-gray-300" aria-label={`${m.label}: no`}>·</span>
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 min-w-40">
                          {OTHER_FEATURES.filter((f) => u[f.key]).map((f) => (
                            <span
                              key={f.key}
                              className="rounded-full bg-white/[0.06] light:bg-black/[0.05] px-2 py-0.5 text-[11px] text-gray-300 light:text-gray-700 whitespace-nowrap"
                            >
                              {f.label}
                            </span>
                          ))}
                          {!OTHER_FEATURES.some((f) => u[f.key]) && <span className="text-gray-700 light:text-gray-300">·</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recentSignups.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-500">No signups in the last 14 days.</div>}
          </div>
        </Section>

        <Section title="Upgrade funnel" note="All time. Pricing views are counted from the Subscription page.">
          <div className={`${CARD} p-5`}>
            <FunnelBar label="All users" count={users.length} total={users.length} />
            <FunnelBar label="Viewed pricing" count={upgrade.viewedPricing} total={users.length} />
            <FunnelBar label="Started checkout" count={upgrade.startedCheckout} total={users.length} />
            <FunnelBar label="Paid" count={upgrade.paid} total={users.length} />
          </div>

          <h3 className="mt-5 text-xs font-semibold text-gray-300 light:text-gray-700">Started checkout but still on Free</h3>
          <div className={`${CARD} mt-2 overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Email</th>
                    <th className={TH}>Plan picked</th>
                    <th className={TH}>Last checkout</th>
                    <th className={`${TH} text-right`}>Pricing views</th>
                    <th className={TH}>Last pricing view</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {upgrade.abandoned.map((u) => (
                    <tr key={u.userId} className="hover:bg-white/[0.03] light:hover:bg-black/[0.02]">
                      <td className="px-5 py-3 text-white light:text-gray-900 truncate max-w-xs">{u.email}</td>
                      <td className="px-5 py-3 text-gray-300 light:text-gray-700 capitalize">{u.lastCheckoutPlan?.replace("_", " ") ?? "Unknown"}</td>
                      <td className="px-5 py-3 text-gray-400 light:text-gray-600 whitespace-nowrap">{formatDate(u.lastCheckoutAt)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300 light:text-gray-700">{u.pricingViews.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {upgrade.abandoned.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-500">No abandoned checkouts yet.</div>}
          </div>
        </Section>

        <Section
          title="Paying users at risk"
          note={`${atRisk.length} of ${payingUsers.length} paying users. Flagged when set to cancel, unused for 14+ days, or visiting half as often as the 14 days before. Soonest renewal first.`}
        >
          <div className={`${CARD} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Email</th>
                    <th className={TH}>Plan</th>
                    <th className={TH}>Why</th>
                    <th className={TH}>Last active</th>
                    <th className={`${TH} text-right`}>Visits, prior 14d</th>
                    <th className={`${TH} text-right`}>Visits, last 14d</th>
                    <th className={TH}>Renews</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {atRisk.map((u) => (
                    <tr key={u.userId} className="hover:bg-white/[0.03] light:hover:bg-black/[0.02]">
                      <td className="px-5 py-3 text-white light:text-gray-900 truncate max-w-xs">{u.email}</td>
                      <td className="px-5 py-3 text-gray-300 light:text-gray-700 whitespace-nowrap">
                        {u.planName}
                        {u.status === "trialing" && <span className="text-gray-500"> (trial)</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.reasons.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 light:text-amber-700 whitespace-nowrap"
                            >
                              <ExclamationTriangleIcon className="size-3" />
                              {RISK_LABELS[r]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-400 light:text-gray-600 whitespace-nowrap">{formatDate(u.lastActiveAt)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300 light:text-gray-700">{u.visitsPrev14.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300 light:text-gray-700">{u.visitsLast14.toLocaleString()}</td>
                      <td className="px-5 py-3 text-gray-400 light:text-gray-600 whitespace-nowrap">{formatDate(u.currentPeriodEnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {atRisk.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-500">No paying users flagged.</div>}
          </div>
        </Section>
      </div>
    </div>
  );
}

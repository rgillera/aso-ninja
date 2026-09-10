import ExcelJS from "exceljs";
import { formatRank } from "./types";
import { REPORT_MONTHS, HISTORY_MONTHS_BY_PLAN, planNeededForMoreHistory } from "@/libs/keyword-report-window";
import type { PlanSlug } from "@/libs/contracts";
import type { MonthlyKeywordStats, PerformanceReportResult } from "@/app/api/keywords/performance-report/route";

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

// Brand palette (ARGB — Excel has no alpha, FF prefix = opaque) matching the
// app's indigo accent, plus green/red for improved/declined rank change and
// amber for a locked, needs-upgrade month.
const HEADER_FILL    = "FF4F46E5"; // indigo-600
const HEADER_TEXT    = "FFFFFFFF";
const ROW_ALT_FILL   = "FFF9FAFB"; // gray-50, zebra striping
const BORDER_COLOR   = "FFE5E7EB"; // gray-200
const IMPROVED_TEXT  = "FF15803D"; // green-700
const IMPROVED_FILL  = "FFDCFCE7"; // green-100
const DECLINED_TEXT  = "FFB91C1C"; // red-700
const DECLINED_FILL  = "FFFEE2E2"; // red-100
const MUTED_TEXT     = "FF6B7280"; // gray-500
const LOCKED_TAB     = "FFF59E0B"; // amber-500
const LOCKED_TEXT    = "FF92400E"; // amber-800
const LOCKED_FILL    = "FFFFFBEB"; // amber-50

// monthKey is "YYYY-MM" — anchor on day 2 (not 1) so no timezone offset can
// roll the parsed date back into the previous month.
function monthLabel(monthKey: string): string {
  return MONTH_LABEL_FORMATTER.format(new Date(`${monthKey}-02T00:00:00`));
}

// Excel sheet names cap at 31 chars and reject : \ / ? * [ ] — month labels
// like "Sep 2026" never hit either limit today, this just keeps a future
// label format from silently failing to write.
function sheetName(label: string): string {
  return label.replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
}

function rankLabel(rank: number | null | undefined): string {
  return formatRank(rank ?? "unranked");
}

// The current calendar month plus the REPORT_MONTHS-1 before it, most recent
// first — a fixed rolling window rather than "whatever months have data", so
// a month with nothing recorded yet still gets its own (empty) tab instead of
// silently disappearing.
function rollingMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function prevMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number); // month is 1-indexed
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Builds and downloads the "Export Report" workbook: one tab per month —
// always a full year (current month plus the 11 before it), regardless of
// plan. Months beyond what planSlug is entitled to (see
// HISTORY_MONTHS_BY_PLAN) render as a locked, upgrade-prompt tab instead of
// data — this is an entitlement gate, not a data-availability check, so it
// applies even if some data for that month happens to still exist. Every
// unlocked month shows average volume, highest (best/lowest-number) rank,
// and rank change vs. the prior calendar month (matches the in-app "Change"
// column: positive = improved, colored green; a decline is colored red).
export async function exportPerformanceReport(
  appName: string, terms: string[], report: PerformanceReportResult, planSlug: PlanSlug
) {
  const unlockedMonths = HISTORY_MONTHS_BY_PLAN[planSlug] ?? HISTORY_MONTHS_BY_PLAN.free;

  const wb = new ExcelJS.Workbook();
  wb.creator = "ASO Ninja";
  wb.created = new Date();

  const months = rollingMonths(REPORT_MONTHS);
  for (let i = 0; i < months.length; i++) {
    const month = months[i];

    if (i >= unlockedMonths) {
      const requiredPlan = planNeededForMoreHistory(i);
      const sheet = wb.addWorksheet(sheetName(`${monthLabel(month)} 🔒`), {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      sheet.properties.tabColor = { argb: LOCKED_TAB };
      sheet.columns = [{ width: 10 }, { width: 24 }, { width: 24 }, { width: 20 }];
      sheet.mergeCells("A1:D3");
      const cell = sheet.getCell("A1");
      cell.value =
        `🔒 Upgrade to ${requiredPlan} to unlock ${monthLabel(month)}\n` +
        `Your plan currently includes ${unlockedMonths === 1 ? "the current month" : `the last ${unlockedMonths} months`} of keyword history.`;
      cell.font = { bold: true, color: { argb: LOCKED_TEXT }, size: 12 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LOCKED_FILL } };
      sheet.getRow(1).height = 24;
      sheet.getRow(2).height = 24;
      sheet.getRow(3).height = 24;
      continue;
    }

    const prevMonth = prevMonthKey(month);
    const hasData = terms.some((t) => report[t]?.[month]);
    const sheet = wb.addWorksheet(sheetName(monthLabel(month)), {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.properties.tabColor = { argb: HEADER_FILL };

    if (!hasData) {
      // Reaching export always means at least one keyword is already tracked
      // (the caller bails out before this if none are) — so an empty month
      // just predates that tracking, not a missing setup step. Same
      // reassurance RankHistoryPanel gives for the same situation.
      sheet.columns = [{ width: 10 }, { width: 20 }, { width: 20 }, { width: 20 }];
      sheet.mergeCells("A1:D2");
      const cell = sheet.getCell("A1");
      cell.value =
        `No data recorded for ${monthLabel(month)} yet\n` +
        (terms.length === 1
          ? "More will fill in as this keyword keeps being tracked."
          : "More will fill in as these keywords keep being tracked.");
      cell.font = { italic: true, color: { argb: MUTED_TEXT }, size: 12 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROW_ALT_FILL } };
      sheet.getRow(1).height = 24;
      sheet.getRow(2).height = 24;
      continue;
    }

    sheet.columns = [
      { header: "Keyword", key: "keyword", width: 28 },
      { header: "Average Volume", key: "volume", width: 18 },
      { header: "Highest Ranking", key: "ranking", width: 18 },
      { header: "Change", key: "change", width: 14 },
    ];
    sheet.autoFilter = "A1:D1";

    const headerRow = sheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: HEADER_TEXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
      cell.alignment = { horizontal: "left", vertical: "middle" };
    });

    terms.forEach((term, rowIndex) => {
      const stats: MonthlyKeywordStats | undefined = report[term]?.[month];
      const prev: MonthlyKeywordStats | undefined = report[term]?.[prevMonth];
      const noData = !stats;
      const rawChange = !noData && typeof prev?.bestRank === "number" && typeof stats?.bestRank === "number"
        ? prev.bestRank - stats.bestRank
        : null;
      const changeLabel = rawChange === null ? "-" : rawChange > 0 ? `+${rawChange}` : `${rawChange}`;

      const row = sheet.addRow({
        keyword: term,
        volume: noData ? "No data yet" : stats!.avgVolume ?? "-",
        ranking: noData ? "No data yet" : rankLabel(stats!.bestRank),
        change: changeLabel,
      });
      row.height = 18;

      row.eachCell((cell) => {
        cell.border = { bottom: { style: "thin", color: { argb: BORDER_COLOR } } };
        if (rowIndex % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROW_ALT_FILL } };
      });

      if (noData) {
        [row.getCell("volume"), row.getCell("ranking")].forEach((cell) => {
          cell.font = { italic: true, color: { argb: MUTED_TEXT } };
        });
      } else if (rawChange !== null && rawChange !== 0) {
        const changeCell = row.getCell("change");
        const improved = rawChange > 0;
        changeCell.font = { bold: true, color: { argb: improved ? IMPROVED_TEXT : DECLINED_TEXT } };
        changeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: improved ? IMPROVED_FILL : DECLINED_FILL } };
      }
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const safeAppName = appName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "app";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeAppName}-keyword-performance-${Date.now()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

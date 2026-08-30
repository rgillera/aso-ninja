import type { AsaKeywordRow } from "@/libs/asa-connections/types";

export type EfficiencyTag = "Pause candidate" | "Scale candidate" | "Monitor" | "No spend";

export type EfficiencyRow = AsaKeywordRow & { cpi: number | null; efficiency: EfficiencyTag };

// SCALE_CPI_RATIO: a keyword converting meaningfully cheaper than this app's
// own median CPI is a scale candidate. Relative to the app's own converting
// keywords rather than a fixed dollar amount — CPI varies wildly by
// category/country, so there's no honest universal "good CPI" to hardcode.
const SCALE_CPI_RATIO = 0.7;

export function tagEfficiency(rows: AsaKeywordRow[]): EfficiencyRow[] {
  const convertingCpis = rows
    .filter((r) => (r.installs ?? 0) > 0 && (r.spend ?? 0) > 0)
    .map((r) => (r.spend as number) / (r.installs as number))
    .sort((a, b) => a - b);

  const median = convertingCpis.length
    ? convertingCpis[Math.floor(convertingCpis.length / 2)]
    : null;

  return rows.map((r) => {
    const spend = r.spend ?? 0;
    const installs = r.installs ?? 0;
    const cpi = installs > 0 ? spend / installs : null;

    let efficiency: EfficiencyTag;
    if (spend <= 0) efficiency = "No spend";
    else if (installs === 0) efficiency = "Pause candidate";
    else if (median !== null && cpi !== null && cpi <= median * SCALE_CPI_RATIO) efficiency = "Scale candidate";
    else efficiency = "Monitor";

    return { ...r, cpi, efficiency };
  });
}

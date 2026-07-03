export type Granularity = "day" | "week" | "month" | "quarter";

// Monday-anchored ISO week start, e.g. "2026-06-29".
function isoWeekStart(d: Date): string {
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - day);
  return start.toISOString().slice(0, 10);
}

// Groups a date into a bucket key for the given granularity. No date library
// exists in this codebase yet, so this stays intentionally minimal.
export function bucketKey(dateIso: string, granularity: Granularity): string {
  const d = new Date(dateIso + "T00:00:00Z");
  switch (granularity) {
    case "day":
      return dateIso;
    case "week":
      return isoWeekStart(d);
    case "month":
      return dateIso.slice(0, 7);
    case "quarter": {
      const [year, month] = dateIso.slice(0, 7).split("-").map(Number);
      const quarter = Math.floor((month - 1) / 3) + 1;
      return `${year}-Q${quarter}`;
    }
  }
}

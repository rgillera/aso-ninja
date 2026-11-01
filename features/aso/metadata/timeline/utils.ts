// Calendar days are handled as local dates throughout, and keyed by their
// local YYYY-MM-DD. Keying by toISOString() (UTC) put a day's dot under the
// neighbouring day's column for anyone east or west of UTC, and shifted a
// custom range by a day on Apply.
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
}

export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function padDate(n: number): string {
  return n.toString().padStart(2, "0");
}

export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysAgo(days: number): Date {
  const d = today();
  d.setDate(d.getDate() - days);
  return d;
}

// "Aug 3 – Nov 1, 2026", or with both years when the range spans two.
export function fmtRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export function buildDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const d = new Date(start);
  while (d <= end) { dates.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return dates;
}

export function defaultRange(): { start: Date; end: Date } {
  return { start: daysAgo(90), end: today() };
}

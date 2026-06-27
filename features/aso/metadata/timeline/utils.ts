export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function padDate(n: number): string {
  return n.toString().padStart(2, "0");
}

export function fmtDate(d: Date): string {
  return `${padDate(d.getMonth() + 1)}/${padDate(d.getDate())}/${d.getFullYear()}`;
}

export function buildDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const d = new Date(start);
  while (d <= end) { dates.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return dates;
}

export function defaultRange(): { start: Date; end: Date } {
  const end   = new Date("2026-06-27");
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  return { start, end };
}

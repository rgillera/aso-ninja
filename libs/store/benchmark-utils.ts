// Rating/install counts are heavily right-skewed (one viral app can 10x the mean),
// so peer aggregates use the median instead of the average.
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// Callers pull this into plain data-loading functions rather than component
// bodies — Date.now() inside a component render is flagged as impure.
export function daysSince(timestampMs?: number): number | undefined {
  return timestampMs ? Math.floor((Date.now() - timestampMs) / 86_400_000) : undefined;
}

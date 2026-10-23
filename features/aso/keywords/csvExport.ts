import { trackEvent } from "@/libs/mixpanel";

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  // Filenames carry a timestamp in places (keywords-<ms>.csv); strip it so
  // exports group by which table they came from.
  try {
    trackEvent("CSV Exported", { file: filename.replace(/-\d+(?=\.csv$)/, ""), rows: rows.length });
  } catch {
    // Analytics must never break the export.
  }
}

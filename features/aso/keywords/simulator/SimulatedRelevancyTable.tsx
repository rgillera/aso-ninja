import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import type { SimulatorRow } from "./types";

function formatScore(n: number | null): string {
  return n === null ? "—" : String(n);
}

export function SimulatedRelevancyTable({ rows, hasSimulated }: { rows: SimulatorRow[]; hasSimulated: boolean }) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-gray-600">No tracked keywords yet — add some in Keyword Research first.</p>;
  }

  const sorted = hasSimulated
    ? [...rows].sort((a, b) => {
        const deltaA = Math.abs((a.simulatedRelevancy ?? a.currentRelevancy ?? 0) - (a.currentRelevancy ?? 0));
        const deltaB = Math.abs((b.simulatedRelevancy ?? b.currentRelevancy ?? 0) - (b.currentRelevancy ?? 0));
        return deltaB - deltaA;
      })
    : rows;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-t border-white/[0.08] px-4 py-3 text-left font-medium text-gray-400">Keyword</th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">Current Relevancy</th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">Simulated Relevancy</th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">
              <span className="inline-flex w-full items-center justify-end gap-1">
                &Delta; <QuestionMarkCircleIcon className="size-3.5" />
              </span>
            </th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">Current Opportunity</th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">Simulated Opportunity</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const hasDelta = hasSimulated && row.simulatedRelevancy !== null && row.currentRelevancy !== null;
            const delta = hasDelta ? row.simulatedRelevancy! - row.currentRelevancy! : 0;
            const deltaColor = !hasDelta ? "text-gray-600" : delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-gray-500";
            const deltaLabel = !hasDelta ? "—" : delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "0";
            return (
              <tr key={row.term}>
                <td className="border-t border-white/[0.08] px-4 py-3 text-gray-200">{row.term}</td>
                <td className="border-t border-white/[0.08] px-4 py-3 text-right text-gray-400">{formatScore(row.currentRelevancy)}</td>
                <td className="border-t border-white/[0.08] px-4 py-3 text-right text-white">
                  {hasSimulated ? formatScore(row.simulatedRelevancy) : "—"}
                </td>
                <td className={`border-t border-white/[0.08] px-4 py-3 text-right font-medium ${deltaColor}`}>{deltaLabel}</td>
                <td className="border-t border-white/[0.08] px-4 py-3 text-right text-gray-400">{formatScore(row.currentOpportunity)}</td>
                <td className="border-t border-white/[0.08] px-4 py-3 text-right text-white">
                  {hasSimulated ? formatScore(row.simulatedOpportunity) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

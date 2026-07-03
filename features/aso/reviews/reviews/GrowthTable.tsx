import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";
import type { GrowthRow } from "./types";

function GrowthCell({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-sm text-gray-500">0{suffix}</span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
      {Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 3 })}{suffix}
    </span>
  );
}

type Props = { rows: GrowthRow[]; from: string; to: string };

export function GrowthTable({ rows, from, to }: Props) {
  return (
    <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.07]">
            <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500"></th>
            <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">
              Reviews gained
              <span className="block font-normal text-gray-600 normal-case">{from} – {to}</span>
            </th>
            <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Growth (absolute)</th>
            <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Growth (percent)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-5 py-2.5 text-sm text-gray-300">{row.label}</td>
              <td className="px-5 py-2.5 text-sm tabular-nums font-medium text-white">{row.gained.toLocaleString()}</td>
              <td className="px-5 py-2.5"><GrowthCell value={row.absoluteGrowth} /></td>
              <td className="px-5 py-2.5">
                {row.percentGrowth == null ? (
                  <span className="text-sm text-gray-600">—</span>
                ) : (
                  <GrowthCell value={Math.round(row.percentGrowth * 1000) / 1000} suffix="%" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

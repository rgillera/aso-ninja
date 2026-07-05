"use client";

import { useState } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

type Props = {
  description: string;
  originalDescription: string;
};

type Tab = "density" | "comparison";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "for", "to", "of", "in", "on", "at",
  "by", "with", "from", "as", "is", "are", "was", "were", "be", "been", "being", "this", "that",
  "these", "those", "it", "its", "your", "you", "our", "we", "us", "i", "my", "me", "he", "she",
  "they", "them", "his", "her", "their", "not", "no", "yes", "do", "does", "did", "can", "could",
  "will", "would", "should", "may", "might", "must", "have", "has", "had", "so", "than", "too",
  "very", "just", "get", "gets", "all", "also", "more", "most", "some", "such", "only", "own",
  "same", "up", "down", "out", "about", "into", "over", "after", "before", "between", "through",
  "during", "without", "within", "per", "via", "new",
]);

export function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function computeTermFrequencies(text: string): Map<string, number> {
  const words = tokenizeWords(text);
  const freq = new Map<string, number>();

  for (const w of words) {
    if (w.length <= 2 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (a.length <= 2 || b.length <= 2 || STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    const bigram = `${a} ${b}`;
    freq.set(bigram, (freq.get(bigram) ?? 0) + 1);
  }

  return freq;
}

export type DensityRow = { keywords: string[]; count: number; density: number };

export function computeKeywordDensity(text: string, minCount = 2, maxRows = 10): DensityRow[] {
  const totalWords = tokenizeWords(text).length;
  if (totalWords === 0) return [];

  const freq = computeTermFrequencies(text);
  const byCount = new Map<number, string[]>();
  for (const [term, count] of freq) {
    if (count < minCount) continue;
    if (!byCount.has(count)) byCount.set(count, []);
    byCount.get(count)!.push(term);
  }

  return Array.from(byCount.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([count, keywords]) => ({
      keywords: keywords.sort(),
      count,
      density: (count / totalWords) * 100,
    }))
    .slice(0, maxRows);
}

function formatPct(n: number) {
  return `${Number(n.toFixed(2))}%`;
}

export function DensityTable({ rows }: { rows: DensityRow[] }) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-gray-600">Not enough description text yet to analyze.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-t border-white/[0.08] px-4 py-3 text-left font-medium text-gray-400">Keyword(s)</th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">Count</th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">
              <span className="inline-flex w-full items-center justify-end gap-1">
                Density <QuestionMarkCircleIcon className="size-3.5" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="border-t border-white/[0.08] px-4 py-3 align-top text-gray-200">{row.keywords.join(",")}</td>
              <td className="border-t border-white/[0.08] px-4 py-3 text-right align-top text-white">{row.count}</td>
              <td className="border-t border-white/[0.08] px-4 py-3 text-right align-top text-white">{formatPct(row.density)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonTable({ current, original }: { current: string; original: string }) {
  const originalWordCount = tokenizeWords(original).length;
  const currentWordCount = tokenizeWords(current).length;
  const originalFreq = computeTermFrequencies(original);
  const currentFreq = computeTermFrequencies(current);

  const terms = new Set([...originalFreq.keys(), ...currentFreq.keys()]);
  const rows = Array.from(terms)
    .map((term) => {
      const originalCount = originalFreq.get(term) ?? 0;
      const currentCount = currentFreq.get(term) ?? 0;
      return {
        term,
        originalCount,
        currentCount,
        originalDensity: originalWordCount ? (originalCount / originalWordCount) * 100 : 0,
        currentDensity: currentWordCount ? (currentCount / currentWordCount) * 100 : 0,
      };
    })
    .filter((r) => r.originalCount >= 2 || r.currentCount >= 2)
    .sort((a, b) => Math.max(b.originalCount, b.currentCount) - Math.max(a.originalCount, a.currentCount))
    .slice(0, 12);

  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-gray-600">Not enough description text yet to compare.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-t border-white/[0.08] px-4 py-3 text-left font-medium text-gray-400">Keyword</th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">New</th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">Original</th>
            <th className="border-t border-white/[0.08] px-4 py-3 text-right font-medium text-gray-400">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const delta = row.currentDensity - row.originalDensity;
            const deltaColor = delta > 0.01 ? "text-green-400" : delta < -0.01 ? "text-red-400" : "text-gray-500";
            const deltaLabel = delta > 0.01 ? `+${delta.toFixed(2)}%` : delta < -0.01 ? `${delta.toFixed(2)}%` : "—";
            return (
              <tr key={row.term}>
                <td className="border-t border-white/[0.08] px-4 py-3 text-gray-200">{row.term}</td>
                <td className="border-t border-white/[0.08] px-4 py-3 text-right text-white">{formatPct(row.currentDensity)}</td>
                <td className="border-t border-white/[0.08] px-4 py-3 text-right text-gray-400">{formatPct(row.originalDensity)}</td>
                <td className={`border-t border-white/[0.08] px-4 py-3 text-right font-medium ${deltaColor}`}>{deltaLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function KeywordDensity({ description, originalDescription }: Props) {
  const [tab, setTab] = useState<Tab>("density");
  const rows = computeKeywordDensity(description);

  return (
    <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 p-4">
        <button
          onClick={() => setTab("density")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "density" ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"}`}
        >
          Keywords density
        </button>
        <button
          onClick={() => setTab("comparison")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "comparison" ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"}`}
        >
          Density comparison
        </button>
      </div>

      {tab === "density" ? (
        <DensityTable rows={rows} />
      ) : (
        <ComparisonTable current={description} original={originalDescription} />
      )}
    </div>
  );
}

import type { Keyword } from "./types";

export const SUGGESTION_TABS = [
  { label: "Metadata", ai: false },
  { label: "Top Ranked", ai: false },
  { label: "Top Installs", ai: false },
  { label: "Apple Ads", ai: false },
  { label: "Auto-Complete", ai: false },
  { label: "AI Generator", ai: true },
  { label: "Semantic", ai: true },
  { label: "Clusters", ai: true },
  { label: "DNA", ai: true },
  { label: "Category", ai: false },
  { label: "Trending", ai: false },
  { label: "Stories", ai: false },
  { label: "Shuffler", ai: false },
] as const;

export const RANK_PILLS = [
  "Top 1", "Top 2-3", "Top 4-10", "Top 11-30", "Top 31-100", "All",
] as const;

export const INITIAL_KEYWORDS: Keyword[] = [
  { keyword: "calorie counter",  volume: 61, maxVolume: 69, diff: 50, chance: 10, kei: 27, rank: "Unranked", growth: null, starred: false },
  { keyword: "food diary",       volume: 45, maxVolume: 52, diff: 42, chance: 18, kei: 31, rank: "Unranked", growth: null, starred: false },
  { keyword: "nutrition tracker",volume: 78, maxVolume: 85, diff: 65, chance: 12, kei: 19, rank: "Unranked", growth: 4,    starred: false },
  { keyword: "meal planner",     volume: 89, maxVolume: 95, diff: 71, chance: 8,  kei: 15, rank: "Unranked", growth: 12,   starred: true  },
  { keyword: "macro tracker",    volume: 55, maxVolume: 61, diff: 48, chance: 21, kei: 34, rank: "Unranked", growth: -2,   starred: false },
];

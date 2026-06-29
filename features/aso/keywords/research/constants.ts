export const SUGGESTION_TABS = [
  { label: "Metadata", ai: false },
  { label: "Top Ranked", ai: false },
  { label: "Top Installs", ai: false },
  { label: "AI Suggestions", ai: true },
] as const;

export const RANK_PILLS = [
  "Top 1", "Top 2-3", "Top 4-10", "Top 11-30", "Top 31-100", "All",
] as const;

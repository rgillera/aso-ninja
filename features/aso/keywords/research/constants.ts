export const SUGGESTION_TABS = [
  { label: "Metadata", ai: false },
  { label: "Competitors", ai: false },
  { label: "AI Suggestions", ai: true },
  { label: "Combinations", ai: false },
] as const;

export const RANK_PILLS = [
  "Top 1", "Top 2-3", "Top 4-10", "Top 11-30", "Top 31-100", "All",
] as const;

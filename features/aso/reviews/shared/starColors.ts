export type RatingHistogram = Record<"1" | "2" | "3" | "4" | "5", number>;

export const STAR_COLORS: Record<keyof RatingHistogram, string> = {
  "5": "#22c55e",
  "4": "#84cc16",
  "3": "#eab308",
  "2": "#f97316",
  "1": "#ef4444",
};

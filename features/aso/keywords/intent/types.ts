export type IntentTheme = { id: string; label: string; isManual: boolean; colorIndex: number | null };

export type IntentKeyword = {
  term: string;
  volume: number;
  relevancy: number | null;
  intentThemeId: string | null;
};

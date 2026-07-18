export type IntentTheme = { id: string; label: string; isManual: boolean };

export type IntentKeyword = {
  term: string;
  volume: number;
  relevancy: number | null;
  intentThemeId: string | null;
};

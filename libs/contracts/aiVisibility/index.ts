export type AiVisibilityPrompt = {
  id: string;
  workspace_id: string;
  prompt: string;
  created_at: string;
};

export type AppAiVisibilityPrompt = {
  id: string;
  app_id: string;
  prompt_id: string;
  added_at: string;
};

export type MentionedApp = {
  name: string;
  position: number;
  reason?: string;
};

export type AiVisibilityCheck = {
  id: string;
  app_id: string;
  prompt_id: string;
  provider: string;
  checked_on: string;
  mentioned: boolean;
  position: number | null;
  competitor_apps: MentionedApp[];
  snippet: string | null;
  created_at: string;
};

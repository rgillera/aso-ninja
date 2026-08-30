export type AsaCredential = {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
};

// Same {connected, status, displayLabel, lastError, lastSyncedOn} shape as
// libs/store-connections/types.ts's ConnectionStatus, so the settings UI can
// reuse the same StatusBadge pattern (see features/aso/settings/index.tsx).
export type AsaConnectionStatus = {
  connected: boolean;
  status?: "connected" | "error";
  displayLabel?: string | null;
  lastError?: string | null;
  lastSyncedOn?: string | null;
};

export type AsaKeywordRow = {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  keywordId: string;
  text: string;
  matchType: string;
  status: string;
  bidAmount: number | null;
  currency: string | null;
  spend: number | null;
  impressions: number | null;
  taps: number | null;
  installs: number | null;
};

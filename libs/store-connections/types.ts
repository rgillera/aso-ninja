export type AppleStoreCredential = {
  provider: "apple";
  issuerId: string;
  keyId: string;
  privateKey: string;
  vendorNumber: string;
};

export type GoogleStoreCredential = {
  provider: "google";
  serviceAccountJson: string;
  bucketId: string;
};

export type StoreCredential = AppleStoreCredential | GoogleStoreCredential;

export type ConnectionStatus = {
  connected: boolean;
  status?: "connected" | "error";
  displayLabel?: string | null;
  lastError?: string | null;
  lastSyncedOn?: string | null;
  // Other apps in the workspace on the same store with no credential yet —
  // drives the "use these credentials for my other apps" option.
  unconnectedOtherApps?: number;
};

// Outcome of reusing one credential for the workspace's other apps.
export type OtherAppsResult = {
  connected: string[];
  failed: { name: string; error: string }[];
};

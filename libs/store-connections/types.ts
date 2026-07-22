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
};

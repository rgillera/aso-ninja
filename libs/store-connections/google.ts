import jwt from "jsonwebtoken";
import type { GoogleStoreCredential } from "./types";

type ServiceAccountKey = { client_email: string; private_key: string };

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/devstorage.read_only";
const STORAGE_API = "https://storage.googleapis.com/storage/v1";

function parseServiceAccount(json: string): ServiceAccountKey {
  const parsed = JSON.parse(json);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account JSON is missing client_email or private_key.");
  }
  return parsed;
}

async function getAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 },
    serviceAccount.private_key,
    { algorithm: "RS256", issuer: serviceAccount.client_email }
  );

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) throw new Error(`Google token exchange failed (status ${res.status}) — check the service account JSON.`);
  const data = await res.json();
  return data.access_token as string;
}

function decodeStorageObject(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  // Play Console's Cloud Storage stats exports are UTF-16LE with a BOM,
  // unlike most APIs' plain UTF-8 — a known quirk of this specific export,
  // not a guess. Detect the BOM and decode accordingly.
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.slice(2));
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

// PROVISIONAL — see apple.ts's DOWNLOAD_PRODUCT_TYPES comment for why this
// can't be nailed down from docs alone. Play Console's classic Cloud Storage
// installs export uses "Daily Device Installs" in both the "overview" and
// "country" dimension files; validate against one real downloaded file
// before trusting this number (compare against the same day/country's figure
// in Play Console's own Statistics UI).
const DOWNLOADS_COLUMN = "Daily Device Installs";
const COUNTRY_COLUMN = "Country";

export type GoogleInstallsResult =
  | { ok: true; downloads: number }
  | { ok: false; error: string; reportMissing: boolean };

// date: YYYY-MM-DD. packageName: the app's Play Store package id (apps.store_id
// for Android). countryCode: the app row's storefront (apps.country), e.g. "US" —
// matched against the country-dimension export's "Country" column so the same
// app tracked under multiple storefronts each gets only its own territory's
// installs instead of every row's copy of the worldwide total.
export async function fetchDailyInstalls(
  credential: GoogleStoreCredential, packageName: string, date: string, countryCode: string
): Promise<GoogleInstallsResult> {
  let serviceAccount: ServiceAccountKey;
  try {
    serviceAccount = parseServiceAccount(credential.serviceAccountJson);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid service account JSON.", reportMissing: false };
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(serviceAccount);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't authenticate with Google.", reportMissing: false };
  }

  const yyyyMM = date.slice(0, 7).replace("-", "");
  const objectName = `stats/installs/installs_${packageName}_${yyyyMM}_country.csv`;

  const objectRes = await fetch(
    `${STORAGE_API}/b/${encodeURIComponent(credential.bucketId)}/o/${encodeURIComponent(objectName)}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!objectRes.ok) {
    if (objectRes.status === 404) {
      return { ok: false, error: "This month's install report isn't available yet in Cloud Storage.", reportMissing: true };
    }
    return { ok: false, error: `Cloud Storage returned an unexpected error (status ${objectRes.status}).`, reportMissing: false };
  }

  const text = decodeStorageObject(await objectRes.arrayBuffer());
  const rows = parseCsv(text);
  // Case-insensitive: Play Console's country export uses lowercase codes
  // ("us"), while apps.country is stored uppercase — compare loosely rather
  // than betting on either side's casing.
  const row = rows.find((r) => r["Date"] === date && r[COUNTRY_COLUMN]?.toUpperCase() === countryCode.toUpperCase());
  if (!row) return { ok: false, error: `No row found for ${date} (${countryCode}) in this month's report.`, reportMissing: true };

  const downloads = parseInt(row[DOWNLOADS_COLUMN], 10);
  return { ok: true, downloads: isNaN(downloads) ? 0 : downloads };
}

// Used by the connect route to validate credentials before persisting them.
// Unlike Apple's per-day reporting lag (where "yesterday" missing is normal
// and 7-days-back reliably dodges it), Google's file is monthly and updated
// continuously — a 404 at 7-days-back almost always means a wrong bucket ID,
// wrong package name, or missing Cloud Storage export permission rather than
// "not published yet". sync.ts deliberately leaves a connection's status
// untouched on reportMissing (treating it as transient), so treating it as
// valid here would let a genuinely broken config look "connected" forever
// with silent nightly sync failures — reportMissing is therefore treated as
// invalid too, not just outright errors. The one real false-positive case
// this creates is the first few days of a new month, which is rare and
// recoverable (the user just retries once that month's file exists). Now
// that fetchDailyInstalls filters to one country, a second false-positive
// exists too: a country with zero installs on the test date has no row in
// the export at all, reading identically to reportMissing. Rare in practice
// (7 days back, any country with real installs) but worth knowing if a valid
// low-traffic-country credential ever gets rejected here.
export async function testGoogleCredential(
  credential: GoogleStoreCredential, packageName: string, countryCode: string
): Promise<{ valid: boolean; error?: string }> {
  const testDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  try {
    const result = await fetchDailyInstalls(credential, packageName, testDate, countryCode);
    if (result.ok) return { valid: true };
    return {
      valid: false,
      error: result.reportMissing
        ? "Couldn't find an install report for this app in that bucket. Double-check the bucket ID and package name — or if this is a brand-new Cloud Storage export, try again in a few days."
        : result.error,
    };
  } catch {
    return { valid: false, error: "Couldn't reach Google Cloud Storage — check the service account JSON and bucket ID." };
  }
}

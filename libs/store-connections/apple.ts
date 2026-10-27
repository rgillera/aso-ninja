import jwt from "jsonwebtoken";
import { gunzipSync } from "zlib";
import type { AppleStoreCredential } from "./types";

const SALES_REPORTS_URL = "https://api.appstoreconnect.apple.com/v1/salesReports";
const AUDIENCE = "appstoreconnect-v1";
const TOKEN_TTL = "19m"; // Apple caps JWTs at 20 minutes

function signAppStoreConnectJwt({ issuerId, keyId, privateKey }: AppleStoreCredential): string {
  return jwt.sign({}, privateKey, {
    algorithm: "ES256",
    issuer: issuerId,
    audience: AUDIENCE,
    expiresIn: TOKEN_TTL,
    keyid: keyId,
  });
}

function parseTsv(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

// Apple's Sales Report "Product Type Identifier" column marks every row as a
// download, update, in-app purchase, etc. — only download-type rows should
// be summed into a downloads total. This set is PROVISIONAL: Apple's field
// reference isn't reliably fetchable to confirm precisely, so it's
// deliberately narrow (new paid + free acquisition only, excluding
// redownloads/updates/IAP) to bias toward undercounting rather than
// overcounting. "1" = iPhone/iPod, "1F" = universal, "1T" = iPad-only (left
// out, an iPad-only app would always read 0). Mac ("F1") is excluded on
// purpose: Mac App Store installs don't come from iOS keyword searches.
// Validate against one real report before trusting this number — compare
// the sum this produces for a known day against App Store Connect's own
// Analytics "Total Downloads" figure for the same day/app.
const DOWNLOAD_PRODUCT_TYPES = new Set(["1", "1F", "1T"]);

// listed: the app has any row at all in this vendor's report for the day
// (downloads, updates, IAP, any country) — i.e. the key's vendor account
// actually owns this app. A valid key for a different account still returns
// 200 with downloads 0, so this is what tells the two apart.
export type AppleSalesResult =
  | { ok: true; downloads: number; listed: boolean }
  | { ok: false; status: number; reportMissing: boolean };

// date: YYYY-MM-DD. appleStoreId: the app's numeric App Store ID (apps.store_id for iOS).
// countryCode: the app row's storefront (apps.country), e.g. "US" — matched
// against the report's "Country Code" column so the same app tracked under
// multiple storefronts each gets only its own territory's downloads instead
// of every row's copy of the worldwide total.
export async function fetchDailyDownloads(
  credential: AppleStoreCredential,
  appleStoreId: string,
  date: string,
  countryCode: string,
): Promise<AppleSalesResult> {
  const token = signAppStoreConnectJwt(credential);
  const params = new URLSearchParams({
    "filter[frequency]": "DAILY",
    "filter[reportDate]": date,
    "filter[reportType]": "SALES",
    "filter[reportSubType]": "SUMMARY",
    "filter[vendorNumber]": credential.vendorNumber,
    "filter[version]": "1_1",
  });

  const res = await fetch(`${SALES_REPORTS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    // A 404 here means Apple hasn't generated a report for this exact date
    // yet (reporting lag, common for "yesterday") — not proof of bad
    // credentials, unlike a 401/403.
    return { ok: false, status: res.status, reportMissing: res.status === 404 };
  }

  const gzipped = Buffer.from(await res.arrayBuffer());
  const tsv = gunzipSync(gzipped).toString("utf-8");
  const rows = parseTsv(tsv);

  const downloads = rows
    .filter((r) =>
      r["Apple Identifier"] === appleStoreId &&
      DOWNLOAD_PRODUCT_TYPES.has(r["Product Type Identifier"]) &&
      r["Country Code"]?.toUpperCase() === countryCode.toUpperCase()
    )
    .reduce((sum, r) => sum + (parseInt(r["Units"], 10) || 0), 0);
  const listed = rows.some((r) => r["Apple Identifier"] === appleStoreId);

  return { ok: true, downloads, listed };
}

// Used by the connect route to validate credentials before persisting them.
// Queries a date old enough (7 days back) that a genuinely missing report is
// implausible, so a failure response here unambiguously means bad
// credentials rather than "report not generated yet".
// requireListed: also reject when the app has no row in that day's report.
// Off for the app the user is connecting by hand (a brand-new or very quiet
// app can legitimately have an empty day), on when reusing a key across the
// workspace's other apps, where a key from a different vendor account would
// otherwise "connect" and silently sync zeros forever.
export async function testAppleCredential(
  credential: AppleStoreCredential, appleStoreId: string, countryCode: string,
  { requireListed = false }: { requireListed?: boolean } = {}
): Promise<{ valid: boolean; error?: string }> {
  const testDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  try {
    const result = await fetchDailyDownloads(credential, appleStoreId, testDate, countryCode);
    if (result.ok && requireListed && !result.listed) {
      return { valid: false, error: "Not found in this vendor account's sales report." };
    }
    if (result.ok) return { valid: true };
    if (result.status === 401 || result.status === 403) {
      return { valid: false, error: "App Store Connect rejected these credentials. Double-check the Issuer ID, Key ID, private key, and Vendor Number." };
    }
    return { valid: false, error: `App Store Connect returned an unexpected error (status ${result.status}).` };
  } catch {
    return { valid: false, error: "Couldn't reach App Store Connect — check the private key is a valid .p8 file and try again." };
  }
}

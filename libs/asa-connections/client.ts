import jwt from "jsonwebtoken";
import type { AsaCredential, AsaKeywordRow } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// CONFIDENCE NOTE — read this before debugging a failed call here.
//
// Apple is mid-migration from the legacy, well-documented Campaign
// Management API (api.searchads.apple.com, sunsetting Jan 26, 2027) to the
// new Apple Ads Platform API (api.ads.apple.com/v1). This client targets
// the new v1 API by request. developer.apple.com's docs for it are
// JS-rendered in a normal browser, but every symbol page there also has a
// plain-markdown twin at the same path with ".md" appended (e.g.
// /documentation/Apple-Ads-Platform-API/campaigns-endpoints.md) that isn't
// JS-rendered — used to pull the real endpoint list, filter fields, and
// example payloads below directly from Apple's docs on 2026-09-12.
//
// Confirmed against official docs + one live /acls call:
//   - Auth: OAuth2 client-credentials JWT (ES256), same appleid.apple.com
//     infra the legacy API also uses.
//   - Response envelope: {result: object|array, pagination, error} — NOT
//     the legacy API's {data: [...]}. asaFetch unwraps `result` (and
//     `data`, harmlessly, in case any endpoint still uses it).
//   - There is no bare GET list endpoint for any resource. Every "list X"
//     operation is POST /v1/<resource>/query with a {filters, sorting,
//     pagination} body — a flat, filter-based model, not the legacy API's
//     nested /campaigns/{id}/adgroups/{id}/... paths. That's what the
//     "404 for /campaigns" bug was: that path doesn't exist in v1 at all.
//   - Campaigns identify their promoted app via promotedObjectType
//     ("APPSTORE_APP") + promotedObjectId (the adamId as a string) —
//     there's no top-level `adamId` field like the legacy API had.
//   - Keyword bid lives at `bid: {amount, currency}`, not `bidAmount`.
//   - Keyword reports are POST /v1/reports/apps/keywords/query, returning
//     {rows: [{metadata: {id, ...}, totalMetrics: {...}}]} — install counts
//     are `tapInstalls`/`totalInstalls`, not `installs`.
//
// Not verified against a live call beyond /acls (no test campaign data was
// available at write time) — filter/field names above come from Apple's
// docs, not a live response, so a subtly wrong enum value or filter
// combination could still surface as a 400. Every function below throws
// with Apple's actual HTTP status + response body on failure rather than
// swallowing it, so a wrong guess here fails loudly and specifically —
// check the thrown error message first.
// ─────────────────────────────────────────────────────────────────────────

const TOKEN_URL = "https://appleid.apple.com/auth/oauth2/token";
const API_BASE = "https://api.ads.apple.com/v1";
const TOKEN_TTL_SECONDS = 60 * 60; // Apple's documented client-secret JWT max lifetime for this flow

function signClientSecretJwt({ teamId, clientId, keyId, privateKey }: AsaCredential): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: teamId, sub: clientId, iat: now, exp: now + TOKEN_TTL_SECONDS },
    privateKey,
    { algorithm: "ES256", audience: "https://appleid.apple.com", keyid: keyId }
  );
}

async function getAccessToken(credential: AsaCredential): Promise<string> {
  const clientSecret = signClientSecretJwt(credential);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credential.clientId,
      client_secret: clientSecret,
      scope: "searchadsorg",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apple rejected the token request (status ${res.status}): ${body || "no response body"}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error("Apple's token response didn't include an access_token.");
  return data.access_token as string;
}

// Thin wrapper: attaches auth + org-context headers, throws with Apple's
// actual status/body on any non-2xx so callers never have to guess why a
// request failed. Unwraps the {result: ...} envelope confirmed above (the
// sibling `pagination`/`error` fields are dropped here — fine for how this
// client uses single-page queryList calls below, see its comment).
async function asaFetch(token: string, adAccountId: string | null, path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(adAccountId ? { "X-AP-Context": `adAccountId=${adAccountId}` } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apple Search Ads API returned status ${res.status} for ${path}: ${body || "no response body"}`);
  }

  const json = await res.json();
  return json?.data ?? json?.result ?? json;
}

async function resolveAdAccountId(token: string): Promise<string> {
  const body = await asaFetch(token, null, "/acls");
  // Confirmed live shape: {result: {acls: [{roles, adAccount: {id, name, orgId}}]}}
  // — asaFetch above already unwraps `result`, so `body` here is {acls: [...]}.
  const list: Array<{ adAccount?: { id?: string | number; orgId?: string | number; name?: string } }> = Array.isArray(body?.acls)
    ? body.acls
    : Array.isArray(body)
      ? body
      : [];

  // Orgs that have ever touched Search Ads Basic carry an extra pseudo
  // ad-account named "Search Ads Basic" alongside their real Advanced one,
  // both sharing the same orgId. The org's primary/Advanced account is the
  // one whose adAccount.id equals its own orgId — prefer that when there's
  // more than one entry, since campaigns for most apps live there.
  const primary = list.find((a) => a.adAccount?.id != null && String(a.adAccount.id) === String(a.adAccount.orgId));
  const chosen = primary ?? list[0];
  const accountId = chosen?.adAccount?.id ?? chosen?.adAccount?.orgId;

  if (!accountId) {
    throw new Error(
      `Apple's /acls response didn't include an account id — no Apple Search Ads accounts on this credential? Raw response: ${JSON.stringify(body).slice(0, 1000)}`
    );
  }
  return String(accountId);
}

type QueryFilter = { field: string; operator: string; value: string | number | boolean | Array<string | number> };
type ApiCampaign = { id: string | number; name: string };
type ApiAdGroup = { id: string | number; name: string };
type ApiKeyword = { id: string | number; text: string; matchType: string; status: string; bid?: { amount?: string; currency?: string } };

// The v1 API has no bare GET list endpoint for anything — every "list X" op is
// POST /v1/<resource>/query with {filters, pagination}, returning
// {result: [...], pagination: {totalCount, ...}}. asaFetch already unwraps
// `result`, so this only ever sees one page. Fine for the volumes this
// feature deals with (pageSize below is the documented per-call cap), but an
// account with 1000+ campaigns/ad groups/keywords under one filter would
// silently truncate — worth adding real offset-based pagination if that
// turns out to matter in practice.
async function queryList(token: string, adAccountId: string, path: string, filters: QueryFilter[]) {
  const body = await asaFetch(token, adAccountId, path, {
    method: "POST",
    body: JSON.stringify({ filters, pagination: { offset: 0, pageSize: 1000 } }),
  });
  return Array.isArray(body) ? body : [];
}

// adamId: the app's numeric App Store ID (apps.store_id for iOS). Campaigns
// carry it as `promotedObjectId` (a string) alongside `promotedObjectType:
// "APPSTORE_APP"` — there's no separate top-level `adamId` field in v1.
async function fetchCampaignsForApp(token: string, adAccountId: string, adamId: string): Promise<ApiCampaign[]> {
  const list = await queryList(token, adAccountId, "/campaigns/query", [
    { field: "promotedObjectType", operator: "EQUALS", value: "APPSTORE_APP" },
    { field: "promotedObjectId", operator: "EQUALS", value: String(adamId) },
  ]);
  return list as ApiCampaign[];
}

async function fetchAdGroups(token: string, adAccountId: string, campaignId: string | number): Promise<ApiAdGroup[]> {
  const list = await queryList(token, adAccountId, "/adgroups/query", [{ field: "campaignId", operator: "EQUALS", value: Number(campaignId) }]);
  return list as ApiAdGroup[];
}

async function fetchKeywords(token: string, adAccountId: string, adGroupId: string | number): Promise<ApiKeyword[]> {
  const list = await queryList(token, adAccountId, "/keywords/query", [{ field: "adGroupId", operator: "EQUALS", value: Number(adGroupId) }]);
  return list as ApiKeyword[];
}

// Keyword-level spend/impressions/taps/installs for the last 30 days. Kept
// separate from the campaign/adgroup/keyword walk above and treated as
// non-fatal by fetchAppKeywords below — if this endpoint's exact shape is
// wrong, the keyword list + bids still come through, just without
// performance numbers, rather than failing the whole page.
async function fetchKeywordReport(token: string, adAccountId: string, campaignId: string | number): Promise<Map<string, { spend: number; impressions: number; taps: number; installs: number }>> {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().split("T")[0];

  const body = await asaFetch(token, adAccountId, "/reports/apps/keywords/query", {
    method: "POST",
    body: JSON.stringify({
      pagination: { offset: 0, pageSize: 1000 },
      filters: [{ field: "campaignId", operator: "EQUALS", value: String(campaignId) }],
      // "ORTZ" is Apple's own literal example value for timeZone in their docs
      // (the ad account's configured reporting time zone) — used verbatim.
      timeRange: { start: iso(start), end: iso(end), timeZone: "ORTZ", granularity: "DAILY" },
    }),
  });

  const rows: Array<{
    metadata?: { id?: string | number };
    totalMetrics?: { localSpend?: { amount?: string }; impressions?: number; taps?: number; tapInstalls?: number; totalInstalls?: number };
  }> = Array.isArray(body?.rows) ? body.rows : [];

  const byKeyword = new Map<string, { spend: number; impressions: number; taps: number; installs: number }>();
  for (const row of rows) {
    const keywordId = row.metadata?.id;
    if (keywordId === undefined) continue;
    const m = row.totalMetrics;
    byKeyword.set(String(keywordId), {
      spend: parseFloat(m?.localSpend?.amount ?? "0") || 0,
      impressions: m?.impressions ?? 0,
      taps: m?.taps ?? 0,
      // totalInstalls includes view-through installs; tapInstalls is the
      // narrower tap-attributed count. Prefer the broader total, falling
      // back if a report ever omits it.
      installs: m?.totalInstalls ?? m?.tapInstalls ?? 0,
    });
  }
  return byKeyword;
}

export async function testAsaCredential(credential: AsaCredential): Promise<{ valid: boolean; error?: string; adAccountId?: string }> {
  try {
    const token = await getAccessToken(credential);
    const adAccountId = await resolveAdAccountId(token);
    return { valid: true, adAccountId };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Couldn't validate these credentials." };
  }
}

export type FetchAppKeywordsResult =
  | { ok: true; rows: AsaKeywordRow[]; reportWarning?: string }
  | { ok: false; error: string };

// adamId: the app's numeric App Store ID (apps.store_id for iOS) — used to
// filter the workspace's Apple Search Ads campaigns down to the ones
// actually promoting this app, since one ASA org can run campaigns for
// several apps at once.
export async function fetchAppKeywords(credential: AsaCredential, adAccountId: string, adamId: string): Promise<FetchAppKeywordsResult> {
  try {
    const token = await getAccessToken(credential);
    const campaigns = await fetchCampaignsForApp(token, adAccountId, adamId);

    const rows: AsaKeywordRow[] = [];
    let reportWarning: string | undefined;

    for (const campaign of campaigns) {
      const adGroups = await fetchAdGroups(token, adAccountId, campaign.id);

      let reportByKeyword = new Map<string, { spend: number; impressions: number; taps: number; installs: number }>();
      try {
        reportByKeyword = await fetchKeywordReport(token, adAccountId, campaign.id);
      } catch (e) {
        reportWarning = `Couldn't load spend/performance numbers: ${e instanceof Error ? e.message : "unknown error"}`;
      }

      for (const group of adGroups) {
        const keywords = await fetchKeywords(token, adAccountId, group.id);
        for (const kw of keywords) {
          const perf = reportByKeyword.get(String(kw.id));
          rows.push({
            campaignId: String(campaign.id),
            campaignName: campaign.name,
            adGroupId: String(group.id),
            adGroupName: group.name,
            keywordId: String(kw.id),
            text: kw.text,
            matchType: kw.matchType,
            status: kw.status,
            bidAmount: kw.bid?.amount != null ? parseFloat(kw.bid.amount) : null,
            currency: kw.bid?.currency ?? null,
            spend: perf?.spend ?? null,
            impressions: perf?.impressions ?? null,
            taps: perf?.taps ?? null,
            installs: perf?.installs ?? null,
          });
        }
      }
    }

    return { ok: true, rows, reportWarning };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't reach the Apple Search Ads API." };
  }
}

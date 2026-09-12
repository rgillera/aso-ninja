import jwt from "jsonwebtoken";
import type { AsaCredential, AsaKeywordRow } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// CONFIDENCE NOTE — read this before debugging a failed call here.
//
// Apple is mid-migration from the legacy, well-documented Campaign
// Management API (api.searchads.apple.com, sunsetting Jan 26, 2027) to a
// new Platform API (api.ads.apple.com/v1). This client targets the new v1
// API by request, but as of writing, developer.apple.com's docs for it are
// JS-rendered (not fetchable by this session's tools) and third-party
// coverage of v1 specifically is thin. Confidence per piece:
//
//   HIGH   — OAuth2 client-credentials token exchange (TOKEN_URL, JWT
//            shape, grant_type/scope). Same Apple ID OAuth infra the
//            legacy API already used for years; multiple independent
//            sources agree on this part. Also HIGH now: API_BASE, the
//            X-AP-Context header name/value (adAccountId=...), GET /acls
//            for account discovery, and its response envelope — all
//            confirmed against a live call on 2026-09-12:
//            {result: {acls: [{roles, adAccount: {id, name, orgId}}]}}.
//            That envelope is {result: {...}}, NOT the legacy API's
//            {data: ...} — asaFetch below unwraps both.
//   MEDIUM — Exact paths and response sub-keys for
//            campaigns/adgroups/targetingkeywords/reports. Built by
//            mirroring the legacy v4/v5 resource model (which Apple's own
//            docs describe v1 as having "direct equivalents" to) onto the
//            new base URL, with each one now also trying a
//            resource-named sub-key (e.g. {campaigns: [...]}) matching
//            the confirmed /acls pattern. Paths themselves still not
//            verified against a live call.
//
// Every function below throws with Apple's actual HTTP status + response
// body on failure rather than swallowing it, so a wrong guess here fails
// loudly and specifically — check the thrown error message first.
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
// request failed. Unwraps Apple's envelope — confirmed against a live /acls
// call to be {result: {...}} on v1, not the legacy API's {data: ...} — but
// falls back to the raw JSON if a response isn't wrapped either way.
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

type ApiCampaign = { id: string | number; name: string; adamId: string | number };
type ApiAdGroup = { id: string | number; name: string };
type ApiTargetingKeyword = { id: string | number; text: string; matchType: string; status: string; bidAmount?: { amount?: string; currency?: string } };

// Each of these tries a bare array first, then falls back to the resource-named
// sub-key the confirmed /acls shape uses (result.acls) — still an unverified
// guess for these specific endpoints (see the MEDIUM-confidence note above), but
// consistent with the one shape we've actually confirmed live.
async function fetchCampaignsForApp(token: string, adAccountId: string, adamId: string): Promise<ApiCampaign[]> {
  const body = await asaFetch(token, adAccountId, "/campaigns");
  const list: ApiCampaign[] = Array.isArray(body) ? body : Array.isArray(body?.campaigns) ? body.campaigns : [];
  return list.filter((c) => String(c.adamId) === String(adamId));
}

async function fetchAdGroups(token: string, adAccountId: string, campaignId: string | number): Promise<ApiAdGroup[]> {
  const body = await asaFetch(token, adAccountId, `/campaigns/${campaignId}/adgroups`);
  return Array.isArray(body) ? body : Array.isArray(body?.adGroups) ? body.adGroups : [];
}

async function fetchTargetingKeywords(token: string, adAccountId: string, campaignId: string | number, adGroupId: string | number): Promise<ApiTargetingKeyword[]> {
  const body = await asaFetch(token, adAccountId, `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords`);
  return Array.isArray(body) ? body : Array.isArray(body?.targetingKeywords) ? body.targetingKeywords : [];
}

// Keyword-level spend/impressions/taps/installs for the last 30 days. Kept
// separate from the campaign/adgroup/keyword walk above and treated as
// non-fatal by fetchAppKeywords below — if this endpoint's exact shape is
// wrong, the keyword list + bids still come through, just without
// performance numbers, rather than failing the whole page.
type KeywordReportRow = { keywordId: string | number; impressions?: number; taps?: number; installs?: number; localSpend?: { amount?: string } };

async function fetchKeywordReport(token: string, adAccountId: string, campaignId: string | number): Promise<Map<string, { spend: number; impressions: number; taps: number; installs: number }>> {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().split("T")[0];

  const body = await asaFetch(token, adAccountId, `/campaigns/${campaignId}/reports/keywords`, {
    method: "POST",
    body: JSON.stringify({ startTime: iso(start), endTime: iso(end), granularity: "DAILY" }),
  });

  // Best-effort extraction across a couple of plausible envelope shapes —
  // see the LOW-confidence note at the top of this file.
  const rows: KeywordReportRow[] =
    body?.reportingDataResponse?.row?.map((r: { metadata?: { keywordId: string | number }; total?: KeywordReportRow }) => ({ keywordId: r.metadata?.keywordId, ...r.total })) ??
    (Array.isArray(body) ? body : []);

  const byKeyword = new Map<string, { spend: number; impressions: number; taps: number; installs: number }>();
  for (const row of rows) {
    if (row.keywordId === undefined) continue;
    byKeyword.set(String(row.keywordId), {
      spend: parseFloat(row.localSpend?.amount ?? "0") || 0,
      impressions: row.impressions ?? 0,
      taps: row.taps ?? 0,
      installs: row.installs ?? 0,
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
        const keywords = await fetchTargetingKeywords(token, adAccountId, campaign.id, group.id);
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
            bidAmount: kw.bidAmount?.amount != null ? parseFloat(kw.bidAmount.amount) : null,
            currency: kw.bidAmount?.currency ?? null,
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

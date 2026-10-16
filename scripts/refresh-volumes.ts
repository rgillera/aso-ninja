// One-off: re-scores volume for every tracked keyword with the current
// autocomplete method (libs/keyword-autocomplete.ts) instead of waiting for
// the refresh cron's weekly rotation to reach each one.
//
// Makes no store *search* requests: the fallback/tiebreaker volume is rebuilt
// from what's already stored (iOS: the latest keyword_volume_history.raw_apps;
// Android: the latest keyword_rankings_history snapshot's titles). Only the
// autocomplete endpoints are hit live, through the same queues the app uses.
//
// Writes, per (term, store, country): a fresh keyword_volume_history row for
// today (copying the latest row's diff/raw_apps, so nothing is lost), and
// volume + opportunity on every tracking app's keyword_metrics row. History
// is never deleted.
//
// Usage (dry run by default, prints old → new):
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx --tsconfig tsconfig.json scripts/refresh-volumes.ts [--apply]
//       [--clear-cache | --recheck-suspect] [--store=ios|android] [--terms=a,b]
//
// --clear-cache deletes every keyword_autocomplete_popularity row first (it's
// only a cache) so every score is redone with the current rules.
//
// --recheck-suspect is the fast version: only keywords a scoring-rule change
// can plausibly move are re-checked — never suggested (prefix_chars null),
// first suggested at SUSPECT_MIN_PREFIX+ letters, or not scored yet. Keywords
// suggested within the first few letters (popular, with plenty of rivals) are
// skipped outright: no requests, no writes.
//
// --terms limits the run to those keywords (comma-separated, any case).
//
// A keyword whose volume comes out unchanged is never written. Re-running
// after an interruption is safe: already re-scored keywords hit the fresh
// cache and cost nothing.

import { createClient } from "@supabase/supabase-js";
import { resolveIosVolume, resolveAndroidVolume } from "../libs/keyword-autocomplete";
import { computeIosVolumeAndDiff, computeAndroidTitleVolume, recomputeOpportunity, type RawStoreApp } from "../libs/keyword-volume";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const CLEAR_CACHE = args.has("--clear-cache");
const RECHECK_SUSPECT = !CLEAR_CACHE && args.has("--recheck-suspect");
const ONLY_STORE = [...args].find((a) => a.startsWith("--store="))?.split("=")[1];
const ONLY_TERMS = [...args].find((a) => a.startsWith("--terms="))?.slice("--terms=".length)
  .split(",").map((t) => t.toLowerCase().trim().replace(/\s+/g, " ")).filter(Boolean);

// Won-by-default brands (see wonByDefault in libs/keyword-autocomplete.ts)
// only surface once a prefix is nearly unique, which is never within the
// first three letters for any keyword sampled.
const SUSPECT_MIN_PREFIX = 4;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

type MetricsRow = {
  app_id: string; keyword_id: string; volume: number | null; chance: number | null;
  relevancy: number | null; relevancy_scored: boolean | null; opportunity: number | null;
  keywords: { term: string }; apps: { store: "ios" | "android"; country: string };
};

async function loadTrackedMetrics(): Promise<MetricsRow[]> {
  const rows: MetricsRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("keyword_metrics")
      .select("app_id, keyword_id, volume, chance, relevancy, relevancy_scored, opportunity, keywords!inner(term, status), apps!inner(store, country)")
      .eq("keywords.status", "active")
      .order("app_id").order("keyword_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as unknown as MetricsRow[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

// term|store|country → prefix_chars (null = never suggested). Missing key =
// no cached score at all.
async function loadAutocompleteCache(): Promise<Map<string, number | null>> {
  const cache = new Map<string, number | null>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from("keyword_autocomplete_popularity").select("term, store, country, prefix_chars");
    if (ONLY_STORE) q = q.eq("store", ONLY_STORE);
    const { data, error } = await q.order("term").order("store").order("country").range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) cache.set(`${r.term}|${r.store}|${r.country}`, r.prefix_chars as number | null);
    if (!data || data.length < PAGE) break;
  }
  return cache;
}

function isSuspect(prefixChars: number | null | undefined) {
  return prefixChars === undefined || prefixChars === null || prefixChars >= SUSPECT_MIN_PREFIX;
}

async function fallbackVolume(term: string, store: "ios" | "android", country: string) {
  const { data: latest } = await supabase
    .from("keyword_volume_history")
    .select("score, diff, raw_apps, recorded_on")
    .eq("term", term).eq("store", store).eq("country", country)
    .order("recorded_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (store === "ios") {
    const apps = latest?.raw_apps as RawStoreApp[] | null | undefined;
    return { latest, fallback: apps?.length ? computeIosVolumeAndDiff(apps, term).volume : null };
  }

  const { data: lastDay } = await supabase
    .from("keyword_rankings_history")
    .select("recorded_on")
    .eq("keyword", term).eq("store", "android").eq("country", country)
    .order("recorded_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastDay) return { latest, fallback: null };
  const { data: snapshot } = await supabase
    .from("keyword_rankings_history")
    .select("app_name")
    .eq("keyword", term).eq("store", "android").eq("country", country)
    .eq("recorded_on", lastDay.recorded_on);
  const apps = (snapshot ?? []).map((r) => ({ title: r.app_name as string }));
  return { latest, fallback: apps.length ? computeAndroidTitleVolume(apps, term) : null };
}

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY RUN"}${CLEAR_CACHE ? " + clear cache" : ""}${RECHECK_SUSPECT ? " + suspects only" : ""}${ONLY_STORE ? ` (${ONLY_STORE} only)` : ""}${ONLY_TERMS ? ` (terms: ${ONLY_TERMS.join(", ")})` : ""}`);

  if (CLEAR_CACHE && APPLY) {
    let q = supabase.from("keyword_autocomplete_popularity").delete();
    q = ONLY_STORE ? q.eq("store", ONLY_STORE) : q.neq("term", "");
    const { error } = await q;
    if (error) throw error;
    console.log("Cleared autocomplete cache.");
  }

  const metrics = await loadTrackedMetrics();
  const cache = RECHECK_SUSPECT ? await loadAutocompleteCache() : null;
  const groups = new Map<string, MetricsRow[]>();
  const skipped = new Set<string>();
  for (const row of metrics) {
    if (ONLY_STORE && row.apps.store !== ONLY_STORE) continue;
    const term = row.keywords.term.toLowerCase().trim().replace(/\s+/g, " ");
    if (ONLY_TERMS && !ONLY_TERMS.includes(term)) continue;
    const k = `${term}|${row.apps.store}|${row.apps.country.toLowerCase()}`;
    if (cache && !groups.has(k) && !isSuspect(cache.get(k))) { skipped.add(k); continue; }
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  if (cache) {
    console.log(`Skipping ${skipped.size} combos suggested within ${SUSPECT_MIN_PREFIX - 1} letters.`);
    // Drop the suspects' cached scores so they're actually re-fetched.
    if (APPLY && groups.size) {
      for (const k of groups.keys()) {
        const [term, store, country] = k.split("|");
        const { error } = await supabase.from("keyword_autocomplete_popularity").delete()
          .eq("term", term).eq("store", store).eq("country", country);
        if (error) throw error;
      }
    }
  }
  console.log(`${groups.size} keyword/store/country combos to check.\n`);

  const today = new Date().toISOString().split("T")[0];
  let i = 0, changed = 0, failed = 0;
  for (const [k, rows] of groups) {
    i++;
    const [term, store, country] = k.split("|") as [string, "ios" | "android", string];
    try {
      const { latest, fallback } = await fallbackVolume(term, store, country);
      const base = fallback ?? latest?.score ?? rows[0].volume ?? 0;
      // A dry run must not write the autocomplete cache either, so it scores
      // through a client that always misses the cache and drops writes —
      // i.e. it previews a fresh score, as if run with --clear-cache.
      const client = APPLY ? supabase : readOnlyClient();
      const volume = store === "ios"
        ? await resolveIosVolume(client, term, country, base, { apps: (latest?.raw_apps as RawStoreApp[] | null | undefined) ?? undefined })
        : await resolveAndroidVolume(client, term, country, base);
      const old = rows[0].volume;
      const stale = rows.filter((r) => r.volume !== volume);
      if (!stale.length) {
        console.log(`[${i}/${groups.size}] ${store} ${country} "${term}": ${old ?? "-"} (unchanged)`);
        continue;
      }
      changed++;
      console.log(`[${i}/${groups.size}] ${store} ${country} "${term}": ${old ?? "-"} → ${volume}`);

      if (!APPLY) continue;
      await supabase.from("keyword_volume_history").upsert(
        { term, store, country, score: volume, diff: latest?.diff ?? null, raw_apps: latest?.raw_apps ?? null, recorded_on: today },
        { onConflict: "term,store,country,recorded_on" }
      );
      const now = new Date().toISOString();
      for (const row of stale) {
        await supabase.from("keyword_metrics")
          .update({ volume, opportunity: recomputeOpportunity(row, volume, row.chance ?? 0), updated_at: now })
          .eq("app_id", row.app_id).eq("keyword_id", row.keyword_id);
      }
    } catch (err) {
      failed++;
      console.error(`[${i}/${groups.size}] ${store} ${country} "${term}": failed`, err);
    }
  }
  console.log(`\nDone. ${changed} changed, ${failed} failed${APPLY ? "" : " (dry run, nothing written)"}.`);
}

// Stands in for the Supabase client in a dry run: every cache lookup misses
// and every write is a no-op.
function readOnlyClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain, eq: () => chain,
    maybeSingle: async () => ({ data: null }),
    upsert: async () => ({ error: null }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: () => chain } as any;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

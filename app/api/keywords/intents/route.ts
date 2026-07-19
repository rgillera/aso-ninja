import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { generateText } from "@/libs/gemini";

export type IntentTheme = { id: string; label: string; isManual: boolean };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const MIN_THEMES = 4;
const MAX_THEMES = 8;

// Same natural-key fallback /api/keywords/list uses: a previewed-but-not-yet-
// formally-tracked app has no apps-table id on the client yet, so resolve it
// server-side the same way /api/keywords/save does.
async function resolveAppId(
  supabase: SupabaseClient,
  appId: string,
  fallback: { workspaceId?: string; bundleId?: string; store?: string; country?: string }
): Promise<string> {
  if (appId) return appId;
  const { workspaceId, bundleId, store, country } = fallback;
  if (!workspaceId || !bundleId || !store) return "";
  const { data } = await supabase
    .from("apps")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("store", store)
    .eq("bundle_id", bundleId)
    .eq("country", (country ?? "us").toUpperCase())
    .maybeSingle();
  return data?.id ?? "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toThemes(rows: any[] | null): IntentTheme[] {
  return (rows ?? []).map((r) => ({ id: r.id, label: r.label, isManual: !!r.is_manual }));
}

async function generateThemeLabels(appName: string, description: string): Promise<string[]> {
  const prompt = `You are an ASO expert building a search-intent taxonomy for the app "${appName}" so its tracked keywords can be grouped into campaigns for Apple Search Ads.

App description: "${description.slice(0, 500)}"

Generate ${MIN_THEMES} to ${MAX_THEMES} distinct search-intent themes — specific clusters of what a user is trying to accomplish when they search, NOT generic ASO buckets like "branded" or "generic". Each theme should be 2-4 words, lowercase, and describe a concrete use case or feature area this app actually supports.

Example for a pet care app: ["ai pet care", "pet health records", "shared pet care", "vet appointment reminders", "pet medication tracking"]

Reply with ONLY a JSON array of strings, ${MIN_THEMES} to ${MAX_THEMES} items. No explanation, no markdown.`;

  try {
    const raw = await generateText(prompt, 0.3);
    if (!raw) return [];
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as unknown[];
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const label = item.trim().toLowerCase();
      if (label.length < 2 || label.length > 60) continue;
      if (seen.has(label)) continue;
      seen.add(label);
      labels.push(label);
      if (labels.length >= MAX_THEMES) break;
    }
    return labels;
  } catch {
    return [];
  }
}

// GET /api/keywords/intents?appId=...
// or: ?workspaceId=...&bundleId=...&store=...&country=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();
  const appId = await resolveAppId(supabase, searchParams.get("appId") ?? "", {
    workspaceId: searchParams.get("workspaceId") ?? undefined,
    bundleId:    searchParams.get("bundleId") ?? undefined,
    store:       searchParams.get("store") ?? undefined,
    country:     searchParams.get("country") ?? undefined,
  });
  if (!appId) return NextResponse.json({ themes: [], appId: null });

  const { data } = await supabase
    .from("app_intent_themes")
    .select("id, label, is_manual")
    .eq("app_id", appId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ themes: toThemes(data), appId });
}

// POST /api/keywords/intents
// Body: { appId, workspaceId, appName, description, bundleId?, store?, country? }
// (Re)generates the app's intent theme list. Themes whose label survives the
// regeneration keep their id (and any keywords already assigned to them);
// themes that don't survive are dropped, which un-assigns their keywords
// back to "Other" via the intent_theme_id FK's ON DELETE SET NULL.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { appId: rawAppId, workspaceId, appName, description, bundleId, store, country } = body as {
    appId?: string; workspaceId?: string; appName?: string; description?: string;
    bundleId?: string; store?: string; country?: string;
  };

  if (!appName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro_plus")) {
    return NextResponse.json({ error: "Intent grouping requires the Pro+ plan" }, { status: 403 });
  }

  const supabase = await createClient();
  const appId = await resolveAppId(supabase, rawAppId ?? "", { workspaceId, bundleId, store, country });
  if (!appId) {
    return NextResponse.json({ error: "Add at least one keyword for this app before generating intent themes." }, { status: 400 });
  }

  const labels = await generateThemeLabels(appName, description ?? "");
  if (labels.length < MIN_THEMES) {
    return NextResponse.json({ error: "Couldn't generate intent themes for this app — try again." }, { status: 502 });
  }

  const { data: existingRows } = await supabase
    .from("app_intent_themes")
    .select("id, label, is_manual, sort_order")
    .eq("app_id", appId);

  // Generated labels start after any existing manual themes so a user's own
  // additions stay put rather than getting reshuffled to the front.
  const manualCount = (existingRows ?? []).filter((r) => r.is_manual).length;
  const { error: upsertErr } = await supabase
    .from("app_intent_themes")
    .upsert(
      labels.map((label, i) => ({ app_id: appId, label, sort_order: manualCount + i })),
      { onConflict: "app_id,label" }
    );
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // Only LLM-generated themes are diffed away when they don't recur — a
  // user's own manually-added themes always survive a regenerate.
  const newLabelSet = new Set(labels.map((l) => l.toLowerCase()));
  const staleIds = (existingRows ?? [])
    .filter((r) => !r.is_manual && !newLabelSet.has(r.label.toLowerCase()))
    .map((r) => r.id);
  if (staleIds.length) {
    await supabase.from("app_intent_themes").delete().in("id", staleIds);
  }

  const { data: finalRows } = await supabase
    .from("app_intent_themes")
    .select("id, label, is_manual")
    .eq("app_id", appId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ themes: toThemes(finalRows), appId });
}

// PUT /api/keywords/intents
// Body: { appId, workspaceId, label, bundleId?, store?, country? }
// Adds a single user-defined theme — no LLM call, and it's exempt from the
// diff-and-drop that a later "Regenerate intents" runs on generated themes.
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { appId: rawAppId, workspaceId, label: rawLabel, bundleId, store, country } = body as {
    appId?: string; workspaceId?: string; label?: string;
    bundleId?: string; store?: string; country?: string;
  };

  const label = (rawLabel ?? "").trim();
  if (!workspaceId || !label) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (label.length > 60) {
    return NextResponse.json({ error: "Keep intent names under 60 characters." }, { status: 400 });
  }

  const planState = await getWorkspacePlanState(workspaceId);
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro_plus")) {
    return NextResponse.json({ error: "Intent grouping requires the Pro+ plan" }, { status: 403 });
  }

  const supabase = await createClient();
  const appId = await resolveAppId(supabase, rawAppId ?? "", { workspaceId, bundleId, store, country });
  if (!appId) {
    return NextResponse.json({ error: "Add at least one keyword for this app before adding an intent." }, { status: 400 });
  }

  const { data: existingRows } = await supabase
    .from("app_intent_themes")
    .select("id, label, sort_order")
    .eq("app_id", appId);

  if ((existingRows ?? []).some((r) => r.label.toLowerCase() === label.toLowerCase())) {
    return NextResponse.json({ error: `"${label}" already exists.` }, { status: 409 });
  }

  const nextSortOrder = (existingRows ?? []).reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;
  const { error: insertErr } = await supabase
    .from("app_intent_themes")
    .insert({ app_id: appId, label, sort_order: nextSortOrder, is_manual: true });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const { data: finalRows } = await supabase
    .from("app_intent_themes")
    .select("id, label, is_manual")
    .eq("app_id", appId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ themes: toThemes(finalRows), appId });
}

// PATCH /api/keywords/intents
// Body: { appId, workspaceId, terms, themeId, bundleId?, store?, country? }
// Manually (re)assigns one or more keywords to an intent theme; themeId null
// moves them back to "Other".
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { appId: rawAppId, workspaceId, terms, themeId, bundleId, store, country } = body as {
    appId?: string; workspaceId?: string; terms?: string[]; themeId?: string | null;
    bundleId?: string; store?: string; country?: string;
  };

  if (!workspaceId || !terms?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const appId = await resolveAppId(supabase, rawAppId ?? "", { workspaceId, bundleId, store, country });
  if (!appId) return NextResponse.json({ error: "App not found" }, { status: 400 });

  const normalised = terms.map((t) => t.toLowerCase().trim()).filter(Boolean);

  const { data: keywordRows, error: kwErr } = await supabase
    .from("keywords")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("term", normalised);
  if (kwErr) return NextResponse.json({ error: kwErr.message }, { status: 500 });

  const keywordIds = (keywordRows ?? []).map((r) => r.id);
  if (!keywordIds.length) return NextResponse.json({ ok: true });

  const { error: updateErr } = await supabase
    .from("keyword_metrics")
    .update({ intent_theme_id: themeId ?? null })
    .eq("app_id", appId)
    .in("keyword_id", keywordIds);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/keywords/intents
// Body: { appId, workspaceId, themeId, bundleId?, store?, country? }
// Deletes a single theme — manual or LLM-generated alike. Any keyword
// assigned to it falls back to "Other" via the intent_theme_id FK's
// ON DELETE SET NULL, so no separate keyword update is needed here.
export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { appId: rawAppId, workspaceId, themeId, bundleId, store, country } = body as {
    appId?: string; workspaceId?: string; themeId?: string;
    bundleId?: string; store?: string; country?: string;
  };

  if (!workspaceId || !themeId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const appId = await resolveAppId(supabase, rawAppId ?? "", { workspaceId, bundleId, store, country });
  if (!appId) return NextResponse.json({ error: "App not found" }, { status: 400 });

  const { error: deleteErr } = await supabase
    .from("app_intent_themes")
    .delete()
    .eq("id", themeId)
    .eq("app_id", appId);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  const { data: finalRows } = await supabase
    .from("app_intent_themes")
    .select("id, label, is_manual")
    .eq("app_id", appId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ themes: toThemes(finalRows), appId });
}

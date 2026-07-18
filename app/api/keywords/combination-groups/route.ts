import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type SavedCombinationChild = {
  term: string;
  volume: number;
  results: number;
  difficulty: number;
  chance: number;
};

export type SavedCombinationGroup = {
  seed: string;
  expanded: boolean;
  children: SavedCombinationChild[];
};

type ResolveParams = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId?: string;
  bundleId?: string;
  store?: string;
  country?: string;
};

// Select-only lookup — used by read/update/delete, where the app must
// already exist (a group can't exist for an app that was never resolved).
async function resolveExistingAppId({ supabase, workspaceId, bundleId, store, country }: ResolveParams): Promise<string | undefined> {
  if (!workspaceId || !bundleId || !store) return undefined;
  const { data } = await supabase
    .from("apps")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("store", store)
    .eq("bundle_id", bundleId)
    .eq("country", (country ?? "us").toUpperCase())
    .maybeSingle();
  return data?.id ?? undefined;
}

// GET /api/keywords/combination-groups?appId=...
// or, for an app previewed but not yet formally tracked:
// GET /api/keywords/combination-groups?workspaceId=...&bundleId=...&store=...&country=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let appId = searchParams.get("appId") ?? "";

  const supabase = await createClient();

  if (!appId) {
    appId = (await resolveExistingAppId({
      supabase,
      workspaceId: searchParams.get("workspaceId") ?? undefined,
      bundleId:    searchParams.get("bundleId") ?? undefined,
      store:       searchParams.get("store") ?? undefined,
      country:     searchParams.get("country") ?? undefined,
    })) ?? "";
  }

  if (!appId) return NextResponse.json({ groups: [] });

  const { data: groupRows, error } = await supabase
    .from("keyword_combination_groups")
    .select("id, seed, expanded, keyword_combination_children(term, volume, results, difficulty, chance)")
    .eq("app_id", appId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ groups: [] }, { status: 500 });

  const groups: SavedCombinationGroup[] = (groupRows ?? []).map((g) => ({
    seed:     g.seed,
    expanded: g.expanded,
    children: (g.keyword_combination_children ?? []) as SavedCombinationChild[],
  }));

  return NextResponse.json({ groups });
}

// POST /api/keywords/combination-groups
// Body: { seed, children, expanded?, workspaceId, appId?, bundleId?, storeId?, appName?, store?, country? }
// Creates/replaces a group's combinations. Resolves (and if needed, creates)
// the apps row the same way /api/keywords/save does, so a group generated
// for a not-yet-tracked preview app still persists correctly.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    seed, children, expanded, workspaceId,
    appId: clientAppId, bundleId, storeId, appName, store, country,
  } = body as {
    seed?: string;
    children?: SavedCombinationChild[];
    expanded?: boolean;
    workspaceId?: string;
    appId?: string;
    bundleId?: string;
    storeId?: string;
    appName?: string;
    store?: string;
    country?: string;
  };

  if (!seed || !children || !workspaceId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();

  let appId: string | undefined = clientAppId;

  if (!appId && bundleId && storeId && appName && store) {
    const normalCountry = (country ?? "us").toUpperCase();
    const { data: app, error: appErr } = await supabase
      .from("apps")
      .upsert(
        { workspace_id: workspaceId, name: appName, store, bundle_id: bundleId, store_id: storeId, country: normalCountry, updated_at: new Date().toISOString() },
        { onConflict: "workspace_id,store,bundle_id,country" }
      )
      .select("id")
      .single();

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 403 });
    if (app) appId = app.id;
  }

  if (!appId) return NextResponse.json({ error: "Could not resolve app" }, { status: 400 });

  const { data: group, error: groupErr } = await supabase
    .from("keyword_combination_groups")
    .upsert(
      { app_id: appId, seed: seed.toLowerCase(), expanded: expanded ?? true },
      { onConflict: "app_id,seed" }
    )
    .select("id")
    .single();

  if (groupErr) return NextResponse.json({ error: groupErr.message }, { status: 500 });

  // Combinations are regenerated wholesale on each save, so replace rather
  // than merge — stale children from a previous fetch shouldn't linger.
  await supabase.from("keyword_combination_children").delete().eq("group_id", group.id);

  if (children.length) {
    await supabase.from("keyword_combination_children").insert(
      children.map((c) => ({
        group_id:   group.id,
        term:       c.term,
        volume:     c.volume,
        results:    c.results,
        difficulty: c.difficulty,
        chance:     c.chance,
      }))
    );
  }

  return NextResponse.json({ appId });
}

// PATCH /api/keywords/combination-groups — toggle a group's expanded state.
// Body: { seed, expanded, appId?, workspaceId?, bundleId?, store?, country? }
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { seed, expanded, appId: clientAppId, workspaceId, bundleId, store, country } = body as {
    seed?: string;
    expanded?: boolean;
    appId?: string;
    workspaceId?: string;
    bundleId?: string;
    store?: string;
    country?: string;
  };

  if (!seed || typeof expanded !== "boolean") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const appId = clientAppId || (await resolveExistingAppId({ supabase, workspaceId, bundleId, store, country }));
  if (!appId) return NextResponse.json({ error: "Could not resolve app" }, { status: 400 });

  const { error } = await supabase
    .from("keyword_combination_groups")
    .update({ expanded })
    .eq("app_id", appId)
    .eq("seed", seed.toLowerCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/keywords/combination-groups?seed=...&appId=...
// or ?seed=...&workspaceId=...&bundleId=...&store=...&country=...
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seed = searchParams.get("seed") ?? "";
  let appId  = searchParams.get("appId") ?? "";

  const supabase = await createClient();

  if (!seed) return NextResponse.json({ error: "Missing seed" }, { status: 400 });

  if (!appId) {
    appId = (await resolveExistingAppId({
      supabase,
      workspaceId: searchParams.get("workspaceId") ?? undefined,
      bundleId:    searchParams.get("bundleId") ?? undefined,
      store:       searchParams.get("store") ?? undefined,
      country:     searchParams.get("country") ?? undefined,
    })) ?? "";
  }

  if (!appId) return NextResponse.json({ ok: true });

  const { error } = await supabase
    .from("keyword_combination_groups")
    .delete()
    .eq("app_id", appId)
    .eq("seed", seed.toLowerCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { syncAppDownloads } from "@/libs/store-connections/sync";

// POST /api/ai-visibility/save
// Body: { prompts, workspaceId, appId?, bundleId?, storeId?, appName?, iconUrl?, store?, country? }
//
// App-resolution block mirrors /api/keywords/save/route.ts exactly — a user
// can add a tracked prompt from a previewed-but-not-yet-followed app, so the
// same upsert-or-resolve flow is needed here too.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompts, workspaceId, appId: clientAppId, bundleId, storeId, appName, iconUrl, store, country } = body as {
    prompts: string[];
    workspaceId: string;
    appId?: string;
    bundleId?: string;
    storeId?: string;
    appName?: string;
    iconUrl?: string;
    store?: string;
    country?: string;
  };

  if (!prompts?.length || !workspaceId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Resolve appId — prefer client-provided ID, then upsert, then lookup
  let appId: string | undefined = clientAppId;

  if (!appId && bundleId && storeId && appName && store) {
    const normalCountry = (country ?? "us").toUpperCase();

    const { data: app, error: appErr } = await supabase
      .from("apps")
      .upsert(
        { workspace_id: workspaceId, name: appName, store, bundle_id: bundleId, store_id: storeId, icon_url: iconUrl ?? null, country: normalCountry, updated_at: new Date().toISOString() },
        { onConflict: "workspace_id,store,bundle_id,country" }
      )
      .select("id")
      .single();

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 403 });
    if (app) {
      appId = app.id;

      const admin = createAdminClient();
      const { data: connection } = await admin
        .from("app_store_connections")
        .select("status, last_synced_on")
        .eq("app_id", appId!)
        .maybeSingle();
      if (connection?.status === "connected" && !connection.last_synced_on) {
        await syncAppDownloads(appId!, admin).catch(() => {
          // Best-effort — see app/api/apps/[id]/connect/route.ts's
          // syncAllSiblingCountries for why a sync failure here must not
          // fail the surrounding request.
        });
      }
    }
  }

  // 2. Upsert prompt text
  const normalised = prompts.map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean);
  if (!normalised.length) return NextResponse.json({ appId });

  const { data: promptRows, error: promptErr } = await supabase
    .from("ai_visibility_prompts")
    .upsert(
      normalised.map((prompt) => ({ workspace_id: workspaceId, prompt })),
      { onConflict: "workspace_id,prompt" }
    )
    .select("id, prompt");

  if (promptErr) return NextResponse.json({ error: promptErr.message }, { status: 403 });
  if (!promptRows?.length) return NextResponse.json({ appId });

  // 3. Link all prompts to the app
  if (appId) {
    await supabase
      .from("app_ai_visibility_prompts")
      .upsert(
        promptRows.map((p) => ({ app_id: appId!, prompt_id: p.id })),
        { onConflict: "app_id,prompt_id", ignoreDuplicates: true }
      );
  }

  // promptIds lets the client immediately trigger a first check for exactly
  // the prompts this request just tracked (see /api/ai-visibility/check),
  // instead of leaving a newly added prompt as "Not checked yet" until the
  // user notices and clicks Check again — there's no automatic recurring
  // re-check to fall back on (see
  // 20260922000001_drop_ai_visibility_refresh_cron.sql).
  return NextResponse.json({ appId, promptIds: promptRows.map((p) => p.id) });
}

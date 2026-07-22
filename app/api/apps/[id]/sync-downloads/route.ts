import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { syncAppDownloads } from "@/libs/store-connections/sync";

type PageProps = { params: Promise<{ id: string }> };

// POST /api/apps/[id]/sync-downloads — manual "Sync now" trigger.
// get_app_store_credential is service_role-only (see
// supabase/migrations/20260722000003_app_store_connection_rpcs.sql), so the
// RLS-scoped client can't sync directly — this route does the owner/admin
// check itself (same rule the connect/disconnect RPCs enforce) before
// handing off to the admin client.
export async function POST(_request: NextRequest, { params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: app } = await supabase.from("apps").select("id, workspace_id").eq("id", id).maybeSingle();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", app.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only workspace owners and admins can sync store data." }, { status: 403 });
  }

  const admin = createAdminClient();
  const result = await syncAppDownloads(id, admin);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { testAsaCredential } from "@/libs/asa-connections/client";
import { getAsaConnectionStatus } from "@/libs/asa-connections/service";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { AsaCredential, AsaConnectionStatus } from "@/libs/asa-connections/types";

// GET /api/asa/connect?workspaceId=... — current connection status.
// Read-only, RLS already scopes asa_connections to workspace members, so the
// plain session client is enough (no admin client / role check needed here).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ connected: false } satisfies AsaConnectionStatus);

  const supabase = await createClient();
  const status = await getAsaConnectionStatus(workspaceId, supabase);
  return NextResponse.json(status);
}

// POST /api/asa/connect — body: { workspaceId, clientId, teamId, keyId, privateKey }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { workspaceId, clientId, teamId, keyId, privateKey } = body as {
    workspaceId?: string; clientId?: string; teamId?: string; keyId?: string; privateKey?: string;
  };
  if (!workspaceId || !clientId || !teamId || !keyId || !privateKey) {
    return NextResponse.json({ error: "Missing Client ID, Team ID, Key ID, or private key." }, { status: 400 });
  }

  const planState = await getWorkspacePlanState(workspaceId);
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro")) {
    return NextResponse.json({ error: "Connecting Apple Search Ads requires the Pro plan or above." }, { status: 403 });
  }

  const credential: AsaCredential = { clientId, teamId, keyId, privateKey };
  const validation = await testAsaCredential(credential);
  if (!validation.valid || !validation.adAccountId) {
    return NextResponse.json({ error: validation.error ?? "Couldn't validate these credentials." }, { status: 400 });
  }

  // connect_asa_credential is security definer but checks auth.uid() against
  // workspace_members internally, so it must run on the session-bound
  // client (not the admin client, which has no user session to check).
  const { error } = await supabase.rpc("connect_asa_credential", {
    p_workspace_id: workspaceId,
    p_credential: credential,
    p_display_label: `Apple Search Ads · ${validation.adAccountId}`,
    p_ad_account_id: validation.adAccountId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/asa/connect?workspaceId=...
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("disconnect_asa_credential", { p_workspace_id: workspaceId });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.json({ ok: true });
}

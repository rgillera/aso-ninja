"use server";

import { createClient, isImpersonating } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { VIEW_ONLY_ERROR } from "@/libs/admin/impersonation";
import { KEYWORD_FIELD_LIMIT } from "./coverage";

// The app's saved iOS keyword field (see the apps_keyword_field migration),
// or "" when none was entered.
export async function getKeywordFieldAction(appId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("apps").select("keyword_field").eq("id", appId).maybeSingle();
  return data?.keyword_field ?? "";
}

// Any workspace member can save it, not just admins (the only role apps' RLS
// lets update): it's their own listing data, like tracking a keyword. The
// read through the user's client is the membership check, then the admin
// client writes this one column.
export async function saveKeywordFieldAction(appId: string, value: string): Promise<{ error?: string }> {
  if (await isImpersonating()) return { error: VIEW_ONLY_ERROR };
  if (value.length > KEYWORD_FIELD_LIMIT) return { error: `The keyword field can't have more than ${KEYWORD_FIELD_LIMIT} characters.` };
  const supabase = await createClient();
  const { data: app } = await supabase.from("apps").select("id, store").eq("id", appId).maybeSingle();
  if (!app) return { error: "App not found." };
  if (app.store !== "ios") return { error: "Only App Store apps have a keyword field." };
  const { error } = await createAdminClient()
    .from("apps")
    .update({ keyword_field: value.trim() || null })
    .eq("id", appId);
  return error ? { error: "Couldn't save the keyword field." } : {};
}

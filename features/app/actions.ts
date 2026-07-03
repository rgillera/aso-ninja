"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/libs/supabase/server";
import type { AppStore } from "@/libs/contracts";

export type AppState = { error?: string; field?: string } | null;

export async function createAppAction(
  _prev: AppState,
  formData: FormData
): Promise<AppState> {
  const workspaceId = formData.get("workspace_id") as string;
  const name = (formData.get("name") as string)?.trim();
  const store = formData.get("store") as AppStore;
  const bundleId = (formData.get("bundle_id") as string)?.trim();
  const storeId = (formData.get("store_id") as string)?.trim();
  const iconUrl = (formData.get("icon_url") as string)?.trim() || null;

  if (!name) return { error: "App name is required.", field: "name" };
  if (!store) return { error: "Select a store.", field: "store" };
  if (!bundleId) return { error: "Bundle ID is required.", field: "bundle_id" };
  if (!storeId) return { error: "Store ID is required.", field: "store_id" };

  const supabase = await createClient();
  const { error } = await supabase.from("apps").insert({
    workspace_id: workspaceId,
    name,
    store,
    bundle_id: bundleId,
    store_id: storeId,
    icon_url: iconUrl,
  });

  if (error?.code === "23505")
    return { error: "This app is already added to the workspace.", field: "bundle_id" };
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return null;
}

export async function deleteAppAction(appId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("apps").delete().eq("id", appId);
  revalidatePath("/dashboard");
}

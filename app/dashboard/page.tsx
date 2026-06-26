import { headers } from "next/headers";
import { createClient } from "@/libs/supabase/server";
import DashboardPage from "@/features/dashboard/DashboardPage";
import type { App } from "@/libs/contracts";

export default async function Page() {
  const headerStore = await headers();
  const currentPath = headerStore.get("x-invoke-path") ?? "/dashboard";

  const supabase = await createClient();

  const { data: apps } = await supabase
    .from("apps")
    .select("*")
    .order("created_at", { ascending: false });

  return <DashboardPage currentPath={currentPath} apps={(apps ?? []) as App[]} />;
}

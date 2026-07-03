import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import AccountPage from "@/features/account/AccountPage";
import type { Profile } from "@/libs/contracts";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return <AccountPage email={user.email ?? ""} profile={profile as Profile | null} />;
}

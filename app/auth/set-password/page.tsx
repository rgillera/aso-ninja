import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import SetPasswordPage from "@/features/auth/SetPasswordPage";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <SetPasswordPage />;
}

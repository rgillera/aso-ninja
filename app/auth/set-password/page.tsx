import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import SetPasswordPage from "@/features/auth/SetPasswordPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <SetPasswordPage />;
}

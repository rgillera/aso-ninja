import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ResetPasswordPage />;
}

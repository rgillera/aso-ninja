import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import CertificationExam from "@/features/certification/CertificationExam";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const holderName = profile?.full_name?.trim() || user.email?.split("@")[0] || "";

  return <CertificationExam holderName={holderName} />;
}

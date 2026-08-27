import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import CertificationHome from "@/features/certification/CertificationHome";
import { getMyLatestCertificationAction } from "@/features/certification/actions";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, certification] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    getMyLatestCertificationAction(),
  ]);

  const holderName = profile?.full_name?.trim() || user.email?.split("@")[0] || "";

  return <CertificationHome holderName={holderName} certification={certification} />;
}

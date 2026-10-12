import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import PortalNav from "./PortalNav";
import PortalHero from "./PortalHero";
import PortalHowItWorks from "./PortalHowItWorks";
import PortalFeature from "./PortalFeature";
import PortalCertification from "./PortalCertification";
import PortalPricing from "./PortalPricing";
import PortalTestimonials from "./PortalTestimonials";
import PortalGrowthAudit from "./PortalGrowthAudit";
import PortalFooter from "./PortalFooter";

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Social proof: a 3,000 baseline plus every registered account. profiles is
  // RLS-scoped per user, so count through the service-role client.
  const { count: registeredUsers } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const trustedByCount = 3000 + (registeredUsers ?? 0);

  return (
    <div className="bg-[#f5f6f8]">
      <PortalNav isAuthenticated={isAuthenticated} />
      <PortalHero isAuthenticated={isAuthenticated} trustedByCount={trustedByCount} />
      <PortalHowItWorks />
      <PortalFeature />
      <PortalCertification isAuthenticated={isAuthenticated} />
      <PortalPricing isAuthenticated={isAuthenticated} />
      <PortalTestimonials />
      <PortalGrowthAudit />
      <PortalFooter />
    </div>
  );
}

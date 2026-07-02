import { createClient } from "@/libs/supabase/server";
import PortalNav from "./PortalNav";
import PortalHero from "./PortalHero";
import PortalFeature from "./PortalFeature";
import PortalPricing from "./PortalPricing";
import PortalTestimonials from "./PortalTestimonials";
import PortalFooter from "./PortalFooter";

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <div className="bg-gray-900">
      <PortalNav isAuthenticated={isAuthenticated} />
      <PortalHero isAuthenticated={isAuthenticated} />
      <PortalFeature />
      <PortalPricing />
      <PortalTestimonials />
      <PortalFooter />
    </div>
  );
}

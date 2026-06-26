import PortalNav from "./PortalNav";
import PortalHero from "./PortalHero";
import PortalFeature from "./PortalFeature";
import PortalPricing from "./PortalPricing";
import PortalTestimonials from "./PortalTestimonials";
import PortalFooter from "./PortalFooter";

export default function PortalPage() {
  return (
    <div className="bg-gray-900">
      <PortalNav />
      <PortalHero />
      <PortalFeature />
      <PortalPricing />
      <PortalTestimonials />
      <PortalFooter />
    </div>
  );
}

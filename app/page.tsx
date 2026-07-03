import type { Metadata } from "next";
import PortalPage from "@/features/portal/PortalPage";

export const metadata: Metadata = {
  title: "AppASO - Free App Store Optimization Tool",
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AppASO",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Free ASO for your app. Track keyword rankings, optimize metadata, monitor reviews, and analyze competitors for iOS and Android in one workspace.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PortalPage />
    </>
  );
}

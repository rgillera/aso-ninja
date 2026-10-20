import type { Metadata } from "next";
import PortalPage from "@/features/portal/PortalPage";
import { siteDescription, siteTitle } from "@/libs/seo";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://appaso.io";

// Title and description come from the root layout defaults. openGraph is
// restated because setting it here replaces the layout's whole object.
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "AppASO",
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "AppASO",
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      founder: { "@type": "Person", name: "Rodel Gillera" },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "AppASO",
      url: siteUrl,
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: "AppASO",
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: siteDescription,
      featureList: [
        "Keyword research",
        "App Store and Google Play rank tracking",
        "Metadata optimization",
        "Competitor analysis",
      ],
      publisher: { "@id": `${siteUrl}/#organization` },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ],
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

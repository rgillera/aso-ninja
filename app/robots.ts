import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://appaso.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/auth", "/admin", "/agents", "/mobile"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

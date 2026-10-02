import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // About was folded into Our Story; keep old links and search results working.
      { source: "/about", destination: "/our-story", permanent: true },
      // Contact page removed; the footer carries email and chat on every page.
      { source: "/contact", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Service workers are notorious for getting stuck on a stale cached
        // copy — force a revalidate on every load so push/notificationclick
        // fixes actually reach installed PWAs.
        source: "/sw-mobile.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

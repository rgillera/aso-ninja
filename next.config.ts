import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

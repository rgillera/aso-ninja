import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { InstallBanner } from "@/features/mobile/InstallBanner";

// Deliberately not nested under app/dashboard/layout.tsx — this route never
// inherits DashboardShell's sidebar/nav. Points at its own manifest (see
// public/mobile-manifest.webmanifest) instead of the site-wide one so it
// installs as its own home-screen app, scoped to just this route.
export const metadata: Metadata = {
  title: "Rankings",
  manifest: "/mobile-manifest.webmanifest",
  // iOS's "Add to Home Screen" prefers this over the manifest's short_name
  // (and otherwise falls back to the page <title> above, "Rankings") — set
  // explicitly so the install name matches Android's too.
  appleWebApp: {
    title: "AppASO",
  },
};

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-full bg-[#111318] text-gray-300">
      <InstallBanner />
      {children}
    </div>
  );
}

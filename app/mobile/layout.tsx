import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";

// Deliberately not nested under app/dashboard/layout.tsx — this route never
// inherits DashboardShell's sidebar/nav. Points at its own manifest (see
// public/mobile-manifest.webmanifest) instead of the site-wide one so it
// installs as its own home-screen app, scoped to just this route.
export const metadata: Metadata = {
  title: "Rankings",
  manifest: "/mobile-manifest.webmanifest",
};

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <div className="min-h-full bg-[#111318] text-gray-300">{children}</div>;
}

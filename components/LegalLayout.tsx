import type { ReactNode } from "react";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export default async function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <div className="bg-[#f5f6f8] min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-8 shadow-clay ring-1 ring-black/5 sm:p-12">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">{title}</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: {lastUpdated}</p>

            <div className="mt-10 space-y-10 text-gray-600 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:leading-relaxed [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-indigo-500">
              {children}
            </div>
          </div>
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}

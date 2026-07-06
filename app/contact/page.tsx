import type { Metadata } from "next";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export const metadata: Metadata = {
  title: "Contact",
  alternates: {
    canonical: "/contact",
  },
};

export default async function ContactPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <div className="bg-gray-900 min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main className="pt-32 pb-24 sm:pb-32">
        <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Contact</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Get in touch
          </h1>
          <p className="mt-6 text-lg text-gray-400">
            Questions, feedback, or need help with your workspace? We usually reply within one business
            day.
          </p>

          <div className="mt-10 flex justify-center">
            <a
              href="mailto:hello@appaso.io"
              className="inline-flex items-center gap-x-2 rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <EnvelopeIcon className="size-4" aria-hidden="true" />
              hello@appaso.io
            </a>
          </div>
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}

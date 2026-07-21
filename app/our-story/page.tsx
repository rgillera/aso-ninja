import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export const metadata: Metadata = {
  title: "Our Story",
  alternates: {
    canonical: "/our-story",
  },
};

const milestones: { year: string; title: string; description: ReactNode }[] = [
  {
    year: "2020",
    title: "Started growing apps",
    description:
      "We started publishing and growing our own apps, learning app store optimization the hard way — through trial, error, and a lot of ranking data.",
  },
  {
    year: "May 2025",
    title: "ASO Ninja is born",
    description:
      "We turned that experience into a service, officially launching ASO Ninja to run done-for-you App Store Optimization for other app teams. Along the way we managed and scaled multiple apps at once, learning first-hand what actually moves rankings and installs — then layered in Meta Ads and Apple Search Ads to scale growth beyond organic.",
  },
  {
    year: "July 2026",
    title: "AppASO launches",
    description: (
      <>
        We started building AppASO, putting the same keyword research and metadata tooling we use for our
        ASO clients into a self-serve SaaS workspace. We&apos;ve since retired the ASO Ninja brand, but we
        still take on select clients one-on-one through our{" "}
        <a href="/#pricing" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Managed ASO
        </a>{" "}
        plan.
      </>
    ),
  },
];

export default async function OurStoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <div className="bg-gray-900 min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <section className="pt-32 pb-16 sm:pb-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Our story</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              From growing our own apps{" "}
              <span className="text-indigo-400">to building the tools we needed</span>
            </h1>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" aria-hidden="true" />
              <div className="space-y-10">
                {milestones.map((m) => (
                  <div key={m.year} className="relative pl-8">
                    <span className="absolute left-0 top-1.5 size-3.5 rounded-full bg-indigo-400 ring-4 ring-gray-900" />
                    <p className="text-sm font-semibold text-indigo-400">{m.year}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{m.title}</h3>
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}

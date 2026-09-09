import type { Metadata } from "next";
import { RocketLaunchIcon, EyeIcon, BoltIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export const metadata: Metadata = {
  title: "About",
  alternates: {
    canonical: "/about",
  },
};

const values = [
  {
    name: "Built for indie teams",
    description:
      "Most ASO tools are priced and built for large marketing teams. AppASO is built first for indie developers and small teams who need real intelligence without the overhead.",
    icon: RocketLaunchIcon,
  },
  {
    name: "Transparent data",
    description:
      "No black-box scores. Every ranking, volume estimate, and suggestion in AppASO is something you can inspect and understand, not just trust blindly.",
    icon: EyeIcon,
  },
  {
    name: "Move fast",
    description:
      "Daily rank snapshots, quick metadata iteration, and a workspace that gets out of your way so you can ship changes and see what actually moves the needle.",
    icon: BoltIcon,
  },
];

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <div className="bg-[#f5f6f8] min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <section className="pt-32 pb-16 sm:pb-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">About</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              App Store Optimization,{" "}
              <span className="text-indigo-600">without the enterprise price tag</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              AppASO exists because keyword tracking, metadata optimization, and competitor analysis
              shouldn&apos;t be locked behind tools priced for agencies. We built a single workspace so
              indie developers and small app teams can get the same intelligence, for free.
            </p>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {values.map((value) => (
                <div key={value.name} className="rounded-2xl bg-white p-8 shadow-clay ring-1 ring-black/5">
                  <value.icon className="size-8 text-indigo-600" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{value.name}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <a
                href="/signup"
                className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Create free account
              </a>
            </div>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}

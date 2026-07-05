import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ChartBarIcon,
  StarIcon,
  GlobeAltIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    name: "Keyword Tracking",
    description:
      "Track keyword rankings across App Store and Google Play. Get daily snapshots and see rank changes over time so you know what's moving.",
    icon: MagnifyingGlassIcon,
  },
  {
    name: "Keyword Research",
    description:
      "Discover competitor apps, compare keyword overlap, and find opportunities your competition is already capitalizing on.",
    icon: GlobeAltIcon,
  },
  {
    name: "Metadata Editor",
    description:
      "Edit your app title, subtitle, description, and keyword field per locale. Check keyword density, preview search results, and benchmark against your category before you save.",
    icon: DocumentTextIcon,
  },
  {
    name: "Analytics",
    description:
      "Visualize ranking trends, keyword performance, and conversion metrics in one place. Filter by store, locale, and date range.",
    icon: ChartBarIcon,
  },
  {
    name: "Reviews & Ratings",
    description:
      "Monitor reviews synced daily from both stores. Filter by rating, locale, and version. Never miss a critical review again.",
    icon: StarIcon,
  },
  {
    name: "Team Workspaces",
    description:
      "Invite your team into a shared workspace with one source of truth. Everyone sees the same data, no spreadsheets required.",
    icon: UsersIcon,
  },
];

export default function PortalFeature() {
  return (
    <section id="features" className="bg-gray-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Everything you need</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Full ASO intelligence, one workspace
          </h2>
          <p className="mt-6 text-lg text-gray-400">
            Every feature is scoped to your workspace so your team has a single source of truth across all your apps.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:max-w-none lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.name}
              className="flex flex-col rounded-2xl bg-gray-800/50 ring-1 ring-white/10 p-8 transition-colors hover:bg-gray-800/80 hover:ring-indigo-500/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
                <f.icon className="size-5 text-indigo-400" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-white">{f.name}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400 flex-1">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

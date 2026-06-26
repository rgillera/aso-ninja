import { PlusIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import type { App } from "@/libs/contracts";

type Props = { apps: App[] };

function Storebadge({ store }: { store: App["store"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        store === "ios"
          ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
          : "bg-green-500/10 text-green-400 ring-green-500/20"
      }`}
    >
      {store === "ios" ? "App Store" : "Google Play"}
    </span>
  );
}

export default function MyApps({ apps }: Props) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">My Apps</h1>
          <p className="mt-1 text-sm text-gray-400">
            {apps.length} app{apps.length !== 1 ? "s" : ""} tracked in this workspace
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors">
          <PlusIcon className="size-4" />
          Add app
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-gray-800/20 py-24">
          <DevicePhoneMobileIcon className="size-10 text-gray-700 mb-4" />
          <p className="text-sm font-medium text-gray-400">No apps yet</p>
          <p className="mt-1 text-sm text-gray-600">Add your first app to start tracking its ASO performance.</p>
          <button className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors">
            <PlusIcon className="size-4" />
            Add app
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <a
              key={app.id}
              href={`/dashboard/apps/${app.id}`}
              className="flex items-start gap-4 rounded-2xl bg-gray-800/50 ring-1 ring-white/10 p-5 hover:bg-gray-800/80 transition-colors"
            >
              {app.icon_url ? (
                <img
                  src={app.icon_url}
                  alt={app.name}
                  className="size-12 rounded-xl shrink-0 object-cover"
                />
              ) : (
                <div className="size-12 rounded-xl bg-gray-700 shrink-0 flex items-center justify-center">
                  <DevicePhoneMobileIcon className="size-6 text-gray-500" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{app.name}</p>
                <p className="mt-0.5 text-xs text-gray-500 truncate">{app.bundle_id}</p>
                <div className="mt-2">
                  <Storebadge store={app.store} />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

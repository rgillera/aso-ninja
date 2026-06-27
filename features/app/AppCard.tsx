import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import type { App } from "@/libs/contracts";
import { COUNTRY_MAP, countryFlag } from "@/libs/countries";

function StoreBadge({ store }: { store: App["store"] }) {
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

export default function AppCard({ app }: { app: App }) {
  const countryName = app.country ? (COUNTRY_MAP[app.country] ?? app.country) : null;

  return (
    <a
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
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{app.name}</p>
        <p className="mt-0.5 text-xs text-gray-500 truncate">{app.bundle_id}</p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <StoreBadge store={app.store} />
          {countryName && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-white/5 text-gray-400 ring-1 ring-inset ring-white/10">
              <span>{countryFlag(app.country!)}</span>
              {countryName}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

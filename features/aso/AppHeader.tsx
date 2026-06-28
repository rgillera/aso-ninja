import { InformationCircleIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { countryFlag } from "@/libs/countries";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";

type Props = {
  app: ActiveApp | null;
  title: string;
};

export function AppHeader({ app, title }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
      <div className="flex items-center gap-3">
        {app ? (
          <>
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="size-8 rounded-xl bg-[#0d0f14] shrink-0 flex items-center justify-center">
                <DevicePhoneMobileIcon className="size-4 text-gray-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{app.name}</p>
              <p className="text-xs text-gray-500 leading-tight">
                {app.store === "ios" ? "App Store" : "Google Play"}
                {app.country && (
                  <span className="ml-1.5">
                    &middot; {countryFlag(app.country)} {app.country.toUpperCase()}
                  </span>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="size-8 rounded-xl bg-[#0d0f14] shrink-0 flex items-center justify-center">
              <DevicePhoneMobileIcon className="size-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 leading-tight">No app selected</p>
              <p className="text-xs text-gray-600 leading-tight">Select an app from My Apps</p>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <h1 className="text-sm font-semibold text-white">{title}</h1>
        <InformationCircleIcon className="size-4 text-gray-500" />
      </div>
    </div>
  );
}

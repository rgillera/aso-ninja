import Link from "next/link";
import { DevicePhoneMobileIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";
import { countryFlag } from "@/libs/countries";

type PickerApp = {
  id: string;
  name: string;
  store: string;
  icon_url: string | null;
  country: string | null;
};

export function AppPicker({ workspaceId, apps }: { workspaceId: string; apps: PickerApp[] }) {
  return (
    <main className="mx-auto max-w-md">
      <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-4">
        <Link href="/mobile" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
          <ChevronLeftIcon className="size-3.5" />
          Workspaces
        </Link>
      </header>

      <p className="px-4 pt-4 pb-2 text-xs text-gray-600">Pick an app to view its keyword rankings</p>

      <ul className="divide-y divide-white/[0.06]">
        {apps.map((app) => (
          <li key={app.id}>
            <Link href={`/mobile/${workspaceId}/${app.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.04]">
              {app.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={app.icon_url} alt="" className="size-9 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <DevicePhoneMobileIcon className="size-4 text-gray-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-200">{app.name}</p>
                <p className="text-xs text-gray-600">
                  {app.store === "ios" ? "App Store" : "Google Play"}
                  {app.country ? ` · ${countryFlag(app.country)} ${app.country}` : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

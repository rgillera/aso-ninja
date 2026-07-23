"use client";

import { useState } from "react";
import Link from "next/link";
import { Bars3Icon, XMarkIcon, ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import { signOutAction } from "@/features/auth/actions";
import { NotificationToggle } from "@/features/mobile/NotificationToggle";

type NavWorkspace = { id: string; name: string };
type NavApp = { id: string; name: string };

export function NavigationDrawer({
  workspaceId,
  appId,
}: {
  workspaceId: string;
  appId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [workspaces, setWorkspaces] = useState<NavWorkspace[]>([]);
  const [apps, setApps] = useState<NavApp[]>([]);

  function openDrawer() {
    setOpen(true);
    if (loaded) return;
    fetch(`/api/mobile/nav?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data: { workspaces: NavWorkspace[]; apps: NavApp[] }) => {
        setWorkspaces(data.workspaces ?? []);
        setApps(data.apps ?? []);
        setLoaded(true);
      });
  }

  return (
    <>
      <button onClick={openDrawer} aria-label="Menu" className="p-1 text-gray-400 hover:text-gray-200">
        <Bars3Icon className="size-5" />
      </button>

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <div
        className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[80vw] flex-col bg-[#15171d] shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4">
          <h2 className="text-sm font-medium text-gray-100">Menu</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-gray-500 hover:text-gray-200">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <NotificationToggle />
          </div>

          <p className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Workspaces
          </p>
          <ul>
            {/* No ?switch=1 here (unlike the "Workspaces"/"Apps" back-links
                on the picker pages) — tapping a workspace in the drawer is a
                "take me there" action, so it should land as directly as
                possible via the normal remembered/single-app skip logic in
                app/mobile/[workspaceId]/page.tsx, not force its app picker
                to show when there's nothing to actually choose. */}
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/mobile/${ws.id}`}
                  className={`block px-4 py-2.5 text-sm ${ws.id === workspaceId ? "font-medium text-white" : "text-gray-400 hover:text-gray-200"}`}
                >
                  {ws.name}
                </Link>
              </li>
            ))}
          </ul>

          <p className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Apps
          </p>
          <ul>
            {apps.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/mobile/${workspaceId}/${app.id}`}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2.5 text-sm ${app.id === appId ? "font-medium text-white" : "text-gray-400 hover:text-gray-200"}`}
                >
                  {app.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <ArrowRightStartOnRectangleIcon className="size-4 shrink-0" />
              Log out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

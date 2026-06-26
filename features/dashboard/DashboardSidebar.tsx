"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  StarIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { signOutAction } from "@/features/auth/actions";

const asoLinks = [
  { label: "Metadata", href: "/dashboard/metadata", icon: DocumentTextIcon },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartBarIcon },
  { label: "Keywords", href: "/dashboard/keywords", icon: MagnifyingGlassIcon },
  { label: "Reviews & Ratings", href: "/dashboard/reviews", icon: StarIcon },
  { label: "Explore", href: "/dashboard/explore", icon: GlobeAltIcon },
];

type Props = { currentPath?: string };

export default function DashboardSidebar({ currentPath = "" }: Props) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-gray-950 border-r border-white/10">
      {/* Workspace switcher */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded bg-indigo-500 text-xs font-bold text-white">
              A
            </div>
            <span>My Workspace</span>
          </div>
          <ChevronDownIcon
            className={`size-4 text-gray-500 transition-transform ${workspaceOpen ? "rotate-180" : ""}`}
          />
        </button>

        {workspaceOpen && (
          <div className="mt-1 rounded-lg bg-gray-900 ring-1 ring-white/10 py-1">
            <button className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:text-white transition-colors">
              + Create workspace
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* My Apps */}
        <a
          href="/dashboard"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            currentPath === "/dashboard"
              ? "bg-white/10 text-white"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Squares2X2Icon className="size-4 shrink-0" />
          My Apps
        </a>

        {/* ASO Intelligence */}
        <div className="pt-4">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-600">
            ASO Intelligence
          </p>
          <div className="space-y-1">
            {asoLinks.map((link) => {
              const active = currentPath.startsWith(link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="size-4 shrink-0" />
                    {link.label}
                  </div>
                  <ChevronRightIcon className="size-3.5 text-gray-600" />
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User / sign out */}
      <div className="p-3 border-t border-white/10">
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

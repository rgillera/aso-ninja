"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

const adminLinks: { label: string; href: string; icon: typeof UsersIcon }[] = [
  { label: "Users", href: "/admin", icon: UsersIcon },
  { label: "Keywords", href: "/admin/keywords", icon: MagnifyingGlassIcon },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#111318] light:bg-[#f5f6f8] overflow-hidden">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setIsMobileOpen(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 max-w-[85vw] shrink-0 flex-col bg-[#0d0f14] light:bg-white border-r border-white/[0.07] light:border-black/[0.08] transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 p-4 border-b border-white/[0.07] light:border-black/[0.08]">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 light:text-indigo-600">
            <ShieldCheckIcon className="size-4" />
          </div>
          <span className="text-sm font-semibold text-white light:text-gray-900">Super Admin</span>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="ml-auto p-1 text-gray-500 hover:text-white light:hover:text-gray-900 lg:hidden"
            aria-label="Close navigation"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {adminLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <a
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
                    : "text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
                }`}
              >
                <link.icon className="size-4 shrink-0" />
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.07] light:border-black/[0.08] p-3">
          <a
            href="/dashboard"
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="size-4 shrink-0" />
            Back to Dashboard
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#111318] light:bg-[#f5f6f8]">
        <div className="flex items-center gap-3 border-b border-white/[0.07] light:border-black/[0.08] px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900 transition-colors"
            aria-label="Open navigation"
          >
            <Bars3Icon className="size-5" />
          </button>
          <span className="text-sm font-semibold text-white light:text-gray-900">Super Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

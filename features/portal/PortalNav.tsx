"use client";

import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

const links = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Testimonials", href: "/#testimonials" },
];

export default function PortalNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-white/10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <a href="/" className="flex items-center gap-2">
          <span className="flex items-end gap-0.5 rounded-md bg-gray-950 p-1.5">
            <span className="h-2.5 w-1 rounded-sm bg-indigo-500" />
            <span className="h-4 w-1 rounded-sm bg-indigo-400" />
            <span className="h-5 w-1 rounded-sm bg-indigo-300" />
          </span>
          <span className="text-xl font-bold text-white tracking-tight">
            App<span className="text-indigo-400">ASO</span>
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-4">
          {isAuthenticated ? (
            <a
              href="/dashboard"
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
            >
              Dashboard
            </a>
          ) : (
            <>
              <a href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Sign in
              </a>
              <a
                href="/signup"
                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
              >
                Create free account
              </a>
            </>
          )}
        </div>

        <button
          className="lg:hidden text-gray-300 hover:text-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <XMarkIcon className="size-6" /> : <Bars3Icon className="size-6" />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-gray-900 px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-300 hover:text-white" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <hr className="border-white/10" />
          {isAuthenticated ? (
            <a href="/dashboard" className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white text-center hover:bg-indigo-400">
              Dashboard
            </a>
          ) : (
            <>
              <a href="/login" className="text-sm font-medium text-gray-300 hover:text-white">Sign in</a>
              <a href="/signup" className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white text-center hover:bg-indigo-400">
                Create free account
              </a>
            </>
          )}
        </div>
      )}
    </header>
  );
}

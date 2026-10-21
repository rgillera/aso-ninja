"use client";

import { useEffect, useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

const links = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Testimonials", href: "/#testimonials" },
];

export default function PortalNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // Full-width bar with a hairline that only appears once the page scrolls
    // under it, same as the ad landing pages' header.
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || open ? "border-gray-950/[0.06] bg-white/80 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2">
          <span className="flex items-end gap-0.5 rounded-lg bg-gray-950 p-1.5">
            <span className="h-2.5 w-1 rounded-sm bg-indigo-500" />
            <span className="h-4 w-1 rounded-sm bg-indigo-400" />
            <span className="h-5 w-1 rounded-sm bg-indigo-300" />
          </span>
          <span className="text-lg font-bold tracking-tight text-gray-950">
            App<span className="text-indigo-600">ASO</span>
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-950"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <a
              href="/dashboard"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Dashboard
            </a>
          ) : (
            <>
              <a href="/login" className="rounded-full px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-950">
                Sign in
              </a>
              <a
                href="/signup"
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Create free account
              </a>
            </>
          )}
        </div>

        <button
          className="rounded-full p-1.5 text-gray-600 hover:bg-gray-950/[0.04] hover:text-gray-900 lg:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? <XMarkIcon className="size-6" /> : <Bars3Icon className="size-6" />}
        </button>
      </nav>

      {open && (
        <div className="flex flex-col gap-1 border-t border-gray-950/[0.06] bg-white px-4 py-3 lg:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-950/[0.04] hover:text-gray-900"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <hr className="my-1 border-black/[0.06]" />
          {isAuthenticated ? (
            <a href="/dashboard" className="rounded-full bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-500">
              Dashboard
            </a>
          ) : (
            <>
              <a href="/login" className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-950/[0.04] hover:text-gray-900">Sign in</a>
              <a href="/signup" className="rounded-full bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-500">
                Create free account
              </a>
            </>
          )}
        </div>
      )}
    </header>
  );
}

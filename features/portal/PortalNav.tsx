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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? "bg-white/80 backdrop-blur-sm border-b border-black/[0.06] shadow-clay-sm"
          : "bg-transparent border-b border-transparent shadow-none"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <a href="/" className="flex items-center gap-2">
          <span className="flex items-end gap-0.5 rounded-md bg-gray-950 p-1.5">
            <span className="h-2.5 w-1 rounded-sm bg-indigo-500" />
            <span className="h-4 w-1 rounded-sm bg-indigo-400" />
            <span className="h-5 w-1 rounded-sm bg-indigo-300" />
          </span>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            App<span className="text-indigo-600">ASO</span>
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-4">
          {isAuthenticated ? (
            <a
              href="/dashboard"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors"
            >
              Dashboard
            </a>
          ) : (
            <>
              <a href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Sign in
              </a>
              <a
                href="/signup"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors"
              >
                Create free account
              </a>
            </>
          )}
        </div>

        <button
          className="lg:hidden text-gray-600 hover:text-gray-900"
          onClick={() => setOpen(!open)}
        >
          {open ? <XMarkIcon className="size-6" /> : <Bars3Icon className="size-6" />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden border-t border-black/[0.06] bg-white px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-gray-900" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <hr className="border-black/[0.06]" />
          {isAuthenticated ? (
            <a href="/dashboard" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white text-center shadow-clay-btn hover:bg-indigo-500">
              Dashboard
            </a>
          ) : (
            <>
              <a href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</a>
              <a href="/signup" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white text-center shadow-clay-btn hover:bg-indigo-500">
                Create free account
              </a>
            </>
          )}
        </div>
      )}
    </header>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeftIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

// Follows the dashboard's theme cookie (light unless the user picked dark).
// data-theme sits on this wrapper rather than <html> since the root layout
// doesn't set it; the `light:` variant matches any ancestor.
export default async function NotFound() {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <div data-theme={theme} className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col items-center justify-center bg-[#111318] light:bg-[#f5f6f8] px-4 py-16">
        <Link href="/" className="mb-12 flex items-center gap-2">
          <span className="flex items-end gap-0.5 rounded-lg bg-gray-950 p-1.5 ring-1 ring-white/10">
            <span className="h-2.5 w-1 rounded-sm bg-indigo-500" />
            <span className="h-4 w-1 rounded-sm bg-indigo-400" />
            <span className="h-5 w-1 rounded-sm bg-indigo-300" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white light:text-gray-900">
            App<span className="text-indigo-400 light:text-indigo-600">ASO</span>
          </span>
        </Link>

        <div className="w-full max-w-md rounded-2xl bg-white/[0.03] light:bg-white px-8 py-10 text-center ring-1 ring-white/[0.07] light:ring-black/[0.08] light:shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/15">
            <MagnifyingGlassIcon className="size-6 text-indigo-400 light:text-indigo-600" />
          </div>
          <p className="mt-6 text-5xl font-bold tracking-tight text-white light:text-gray-900">404</p>
          <h1 className="mt-3 text-lg font-semibold text-white light:text-gray-900">
            This page isn&apos;t ranking anywhere
          </h1>
          <p className="mt-2 text-sm text-gray-400 light:text-gray-600">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
            >
              Go to dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-gray-300 light:text-gray-700 ring-1 ring-white/10 light:ring-black/10 transition-colors hover:bg-white/[0.06] light:hover:bg-black/[0.04]"
            >
              <ArrowLeftIcon className="size-4" />
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

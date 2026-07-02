import Link from "next/link";

export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.16),_transparent_28%),_linear-gradient(180deg,_#04122d_0%,_#03060f_100%)] text-slate-100 px-6 py-12">
      <div className="max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/85 p-10 shadow-2xl shadow-slate-950/40">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">We'll be back soon</p>
          <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Site maintenance</h1>
          <p className="mt-6 text-base leading-8 text-slate-300">
            AppASO is currently undergoing scheduled maintenance. We're working on improvements and will be back shortly.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="mailto:hello@appaso.io"
              className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

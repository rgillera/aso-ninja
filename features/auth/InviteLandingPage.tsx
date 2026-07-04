"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/libs/supabase/client";

export default function InviteLandingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // No link tokens present (e.g. visited directly) — fall back to manual entry.
      setShowCodeEntry(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/auth/set-password");
    });
  }, [router]);

  async function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim().toLowerCase();
    const token = (formData.get("code") as string).trim();

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "invite" });

    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/auth/set-password");
  }

  if (!showCodeEntry) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4 gap-3">
        <p className="text-sm text-gray-400">{error ?? "Confirming your invite…"}</p>
        <button
          type="button"
          onClick={() => setShowCodeEntry(true)}
          className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Enter your invite code instead
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="mt-6 text-2xl font-semibold text-white">Enter your invite code</h1>
          <p className="mt-2 text-sm text-gray-400">
            Use the email you were invited with and the code from your invite email.
          </p>
        </div>

        <div className="bg-gray-800/50 ring-1 ring-white/10 rounded-2xl p-8">
          <form onSubmit={handleCodeSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg bg-gray-900 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1.5">
                Invite code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className="w-full rounded-lg bg-gray-900 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
            >
              {pending ? "Confirming…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { updateProfileAction } from "./actions";
import { signOutAction } from "@/features/auth/actions";
import type { Profile } from "@/libs/contracts";

type Props = {
  email: string;
  profile: Profile | null;
};

function Alert({ state }: { state: { error?: string; success?: string } | null }) {
  if (!state?.error && !state?.success) return null;
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ring-1 ${
      state.error
        ? "bg-red-500/10 text-red-400 ring-red-500/20"
        : "bg-green-500/10 text-green-400 ring-green-500/20"
    }`}>
      {state.error ?? state.success}
    </div>
  );
}

export default function AccountPage({ email, profile }: Props) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-10">
        <div className="mb-8">
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            ← Back to dashboard
          </a>
          <h1 className="mt-4 text-2xl font-semibold text-white">Account Settings</h1>
          <p className="mt-1 text-sm text-gray-400">{email}</p>
        </div>

        <div className="space-y-8">
          <section className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-lg shadow-black/20 p-6">
            <h2 className="text-base font-semibold text-white mb-5">Profile</h2>
            <form action={formAction} className="space-y-4">
              <Alert state={state} />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Full name
                </label>
                <input
                  name="full_name"
                  defaultValue={profile?.full_name ?? ""}
                  required
                  className={`w-full rounded-lg bg-[#0d0f14] border px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                    state?.error ? "border-red-500/50" : "border-white/[0.07]"
                  }`}
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  value={email}
                  disabled
                  className="w-full rounded-lg bg-[#0d0f14] border border-white/[0.07] px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {pending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-lg shadow-black/20 p-6">
            <h2 className="text-base font-semibold text-white mb-2">Sign out</h2>
            <p className="text-sm text-gray-400 mb-5">
              Sign out of your account on this device.
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

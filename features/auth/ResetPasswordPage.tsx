"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "./actions";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPasswordAction, null);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="mt-6 text-2xl font-semibold text-white">Choose a new password</h1>
        </div>

        <div className="bg-gray-800/50 ring-1 ring-white/10 rounded-2xl p-8">
          <form action={action} className="space-y-5">
            {state?.error && (
              <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/20 px-4 py-3 text-sm text-red-400">
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`w-full rounded-lg bg-gray-900 border px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                  state?.field === "password" ? "border-red-500/50" : "border-white/10"
                }`}
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm new password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                className={`w-full rounded-lg bg-gray-900 border px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                  state?.field === "confirm" ? "border-red-500/50" : "border-white/10"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
            >
              {pending ? "Saving…" : "Reset password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

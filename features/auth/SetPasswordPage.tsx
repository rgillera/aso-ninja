"use client";

import { useActionState } from "react";
import { setPasswordAction } from "./actions";

export default function SetPasswordPage() {
  const [state, action, pending] = useActionState(setPasswordAction, null);

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">Set your password</h1>
          <p className="mt-2 text-sm text-gray-600">
            You&apos;ve joined a workspace. Choose a password to finish setting up your account.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-clay-lg ring-1 ring-black/5">
          <form action={action} className="space-y-5">
            {state?.error && (
              <div className="rounded-lg bg-red-50 ring-1 ring-red-100 px-4 py-3 text-sm text-red-600">
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="w-full rounded-lg bg-white border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`w-full rounded-lg bg-white border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                  state?.field === "password" ? "border-red-300" : "border-gray-200"
                }`}
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                className={`w-full rounded-lg bg-white border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                  state?.field === "confirm" ? "border-red-300" : "border-gray-200"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white transition-colors"
            >
              {pending ? "Saving…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

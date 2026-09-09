"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "./actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Remembered it after all?{" "}
            <a href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors">
              Sign in
            </a>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-clay-lg ring-1 ring-black/5">
          {state?.success ? (
            <p className="text-sm text-gray-700">
              If an account exists for that email, we&apos;ve sent a link to reset your password.
            </p>
          ) : (
            <form action={action} className="space-y-5">
              {state?.error && (
                <div className="rounded-lg bg-red-50 ring-1 ring-red-100 px-4 py-3 text-sm text-red-600">
                  {state.error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg bg-white border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white transition-colors"
              >
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { resendVerificationEmailAction } from "./actions";

export default function VerifyEmailPage({ email, next }: { email: string; next?: string }) {
  const [state, action, pending] = useActionState(resendVerificationEmailAction, null);

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 ring-1 ring-indigo-100">
          <svg
            className="size-6 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 6.75c0-.414.336-.75.75-.75h18a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H3a.75.75 0 01-.75-.75V6.75z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7l9 6 9-6" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-gray-900">Check your email</h1>
        <p className="mt-2 text-sm text-gray-600">
          We sent a verification link to <span className="text-gray-900 font-medium">{email}</span>. Click the
          link to activate your account.
        </p>

        <div className="mt-8 bg-white rounded-2xl p-6 shadow-clay-lg ring-1 ring-black/5">
          {state?.error && (
            <div className="mb-4 rounded-lg bg-red-50 ring-1 ring-red-100 px-4 py-3 text-sm text-red-600">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="mb-4 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 px-4 py-3 text-sm text-emerald-600">
              Verification email resent.
            </div>
          )}

          <p className="text-sm text-gray-600">Didn&apos;t get the email?</p>
          <form action={action} className="mt-3">
            <input type="hidden" name="email" value={email} />
            {next && <input type="hidden" name="next" value={next} />}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white transition-colors"
            >
              {pending ? "Sending…" : "Resend verification email"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Wrong email?{" "}
          <a
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
          >
            Sign up again
          </a>
        </p>
      </div>
    </div>
  );
}

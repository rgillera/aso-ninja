"use client";

import { useActionState } from "react";
import { resendVerificationEmailAction } from "./actions";

export default function VerifyEmailPage({ email, next }: { email: string; next?: string }) {
  const [state, action, pending] = useActionState(resendVerificationEmailAction, null);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/20">
          <svg
            className="size-6 text-indigo-400"
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

        <h1 className="mt-6 text-2xl font-semibold text-white">Check your email</h1>
        <p className="mt-2 text-sm text-gray-400">
          We sent a verification link to <span className="text-gray-200 font-medium">{email}</span>. Click the
          link to activate your account.
        </p>

        <div className="mt-8 bg-gray-800/50 ring-1 ring-white/10 rounded-2xl p-6">
          {state?.error && (
            <div className="mb-4 rounded-lg bg-red-500/10 ring-1 ring-red-500/20 px-4 py-3 text-sm text-red-400">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="mb-4 rounded-lg bg-green-500/10 ring-1 ring-green-500/20 px-4 py-3 text-sm text-green-400">
              Verification email resent.
            </div>
          )}

          <p className="text-sm text-gray-400">Didn&apos;t get the email?</p>
          <form action={action} className="mt-3">
            <input type="hidden" name="email" value={email} />
            {next && <input type="hidden" name="next" value={next} />}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
            >
              {pending ? "Sending…" : "Resend verification email"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Wrong email?{" "}
          <a
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Sign up again
          </a>
        </p>
      </div>
    </div>
  );
}

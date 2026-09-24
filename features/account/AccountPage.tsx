"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { TrophyIcon, SunIcon, MoonIcon, QrCodeIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { updateProfileAction, deleteAccountAction } from "./actions";
import { signOutAction } from "@/features/auth/actions";
import type { CertificationRecord } from "@/features/certification/actions";
import { CertificateDownload } from "@/features/certification/CertificateDownload";
import { useTheme } from "@/features/dashboard/ThemeContext";
import { MobileAppQrButton } from "@/features/dashboard/MobileAppQrButton";
import type { Profile } from "@/libs/contracts";

type Props = {
  email: string;
  profile: Profile | null;
  certification?: CertificationRecord | null;
};

function Alert({ state }: { state: { error?: string; success?: string } | null }) {
  if (!state?.error && !state?.success) return null;
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ring-1 ${
      state.error
        ? "bg-red-500/10 text-red-400 light:text-red-600 ring-red-500/20"
        : "bg-green-500/10 text-green-400 ring-green-500/20"
    }`}>
      {state.error ?? state.success}
    </div>
  );
}

// Was a row in DashboardSidebar's footer — moved here since it's a per-device
// convenience, not a nav destination, and account settings is that quiet
// utility drawer for things that don't belong in the main nav.
function MobileAppSection() {
  return (
    <section className="rounded-2xl bg-[#1a1d24] light:bg-white shadow-lg shadow-black/20 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white light:text-gray-900 flex items-center gap-2">
            <QrCodeIcon className="size-4 text-indigo-400 light:text-indigo-600" />
            Mobile app
          </h2>
          <p className="mt-1 text-sm text-gray-400 light:text-gray-600">
            Scan the QR code to track rankings and get push notifications on your phone.
          </p>
        </div>
        <MobileAppQrButton />
      </div>
    </section>
  );
}

function DeleteAccountSection() {
  const [state, formAction, pending] = useActionState(deleteAccountAction, null);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  return (
    <section className="rounded-2xl bg-[#1a1d24] light:bg-white shadow-lg shadow-black/20 p-6 ring-1 ring-red-500/20">
      <h2 className="text-base font-semibold text-red-400 light:text-red-600 mb-2 flex items-center gap-2">
        <ExclamationTriangleIcon className="size-4" />
        Delete account
      </h2>
      <p className="text-sm text-gray-400 light:text-gray-600 mb-5">
        Permanently delete your account and all of its data, including every workspace you own
        and its apps, keywords, rankings, reviews and connections. Any paid subscription is
        canceled immediately. You will be removed from workspaces you were invited to. This
        cannot be undone.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-red-500/10 light:bg-red-50 px-4 py-2 text-sm font-semibold text-red-400 light:text-red-600 ring-1 ring-red-500/30 hover:bg-red-500/20 light:hover:bg-red-100 transition-colors"
        >
          Delete my account
        </button>
      ) : (
        <form action={formAction} className="space-y-4">
          <Alert state={state} />
          <div>
            <label htmlFor="delete-confirmation" className="block text-sm font-medium text-gray-300 light:text-gray-700 mb-1.5">
              Type <span className="font-mono font-semibold text-red-400 light:text-red-600">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirmation"
              name="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              autoFocus
              className="w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 border border-white/[0.07] light:border-black/[0.08] px-4 py-2.5 text-sm text-white light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setConfirmation("");
              }}
              className="rounded-lg bg-white/10 light:bg-gray-200 px-4 py-2 text-sm font-semibold text-white light:text-gray-900 hover:bg-white/15 light:hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || confirmation.trim() !== "DELETE"}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Deleting…" : "Permanently delete account"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="rounded-2xl bg-[#1a1d24] light:bg-white shadow-lg shadow-black/20 p-6">
      <h2 className="text-base font-semibold text-white light:text-gray-900 mb-2">Appearance</h2>
      <p className="text-sm text-gray-400 light:text-gray-600 mb-5">
        Choose how AppASO looks on this device. Light is the default.
      </p>
      <div className="inline-flex items-center gap-1 rounded-2xl bg-white/[0.06] light:bg-white p-1 light:shadow-sm light:ring-1 light:ring-black/5">
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-pressed={theme === "dark"}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            theme === "dark" ? "bg-indigo-500 light:bg-indigo-600 text-white shadow-sm" : "text-gray-400 light:text-gray-500 hover:text-gray-200 light:hover:text-gray-900"
          }`}
        >
          <MoonIcon className="size-4" />
          Dark
        </button>
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-pressed={theme === "light"}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            theme === "light" ? "bg-indigo-500 light:bg-indigo-600 text-white shadow-sm" : "text-gray-400 light:text-gray-500 hover:text-gray-200 light:hover:text-gray-900"
          }`}
        >
          <SunIcon className="size-4" />
          Light
        </button>
      </div>
    </section>
  );
}

export default function AccountPage({ email, profile, certification }: Props) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);
  const holderName = profile?.full_name?.trim() || email.split("@")[0] || "";

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-10">
        <div className="mb-8">
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-white light:hover:text-gray-900 transition-colors"
          >
            ← Back to dashboard
          </a>
          <h1 className="mt-4 text-2xl font-semibold text-white light:text-gray-900">Account Settings</h1>
          <p className="mt-1 text-sm text-gray-400 light:text-gray-600">{email}</p>
        </div>

        <div className="space-y-8">
          <section className="rounded-2xl bg-[#1a1d24] light:bg-white shadow-lg shadow-black/20 p-6">
            <h2 className="text-base font-semibold text-white light:text-gray-900 mb-5">Profile</h2>
            <form action={formAction} className="space-y-4">
              <Alert state={state} />

              <div>
                <label className="block text-sm font-medium text-gray-300 light:text-gray-700 mb-1.5">
                  Full name
                </label>
                <input
                  name="full_name"
                  defaultValue={profile?.full_name ?? ""}
                  required
                  className={`w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 border px-4 py-2.5 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                    state?.error ? "border-red-500/50" : "border-white/[0.07] light:border-black/[0.08]"
                  }`}
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 light:text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  value={email}
                  disabled
                  className="w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
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

          <AppearanceSection />

          <MobileAppSection />

          <section className="rounded-2xl bg-[#1a1d24] light:bg-white shadow-lg shadow-black/20 p-6">
            <h2 className="text-base font-semibold text-white light:text-gray-900 mb-2 flex items-center gap-2">
              <TrophyIcon className="size-4 text-indigo-400 light:text-indigo-600" />
              ASO Certification
            </h2>
            {certification ? (
              <>
                <p className="text-sm text-gray-400 light:text-gray-600 mb-5">
                  Certified on{" "}
                  {new Date(certification.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
                  Download your certificate anytime.
                </p>
                <CertificateDownload
                  holderName={holderName}
                  certificateId={certification.certificateId}
                  issuedAt={certification.issuedAt}
                />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400 light:text-gray-600 mb-5">
                  You haven&apos;t earned your ASO Certification yet.
                </p>
                <Link
                  href="/dashboard/certification"
                  className="inline-block rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
                >
                  Take the exam
                </Link>
              </>
            )}
          </section>

          <section className="rounded-2xl bg-[#1a1d24] light:bg-white shadow-lg shadow-black/20 p-6">
            <h2 className="text-base font-semibold text-white light:text-gray-900 mb-2">Sign out</h2>
            <p className="text-sm text-gray-400 light:text-gray-600 mb-5">
              Sign out of your account on this device.
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg bg-white/10 light:bg-gray-200 px-4 py-2 text-sm font-semibold text-white light:text-gray-900 hover:bg-white/15 light:hover:bg-gray-300 transition-colors"
              >
                Sign out
              </button>
            </form>
          </section>

          <DeleteAccountSection />
        </div>
      </div>
    </main>
  );
}

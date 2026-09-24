"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  TrophyIcon,
  SunIcon,
  MoonIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  SwatchIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { updateProfileAction, deleteAccountAction } from "./actions";
import { signOutAction } from "@/features/auth/actions";
import type { CertificationRecord } from "@/features/certification/actions";
import { CertificateDownload } from "@/features/certification/CertificateDownload";
import { useTheme } from "@/features/dashboard/ThemeContext";
import { MobileAppQrButton } from "@/features/dashboard/MobileAppQrButton";
import { SettingsCard, SettingsHeader } from "@/features/dashboard/SettingsCard";
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

const inputBase =
  "w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 border px-3.5 py-2.5 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition";
const labelClass = "block text-sm font-medium text-gray-300 light:text-gray-700 mb-1.5";

// Was a row in DashboardSidebar's footer — moved here since it's a per-device
// convenience, not a nav destination, and account settings is that quiet
// utility drawer for things that don't belong in the main nav.
function MobileAppSection({ className }: { className?: string }) {
  return (
    <SettingsCard
      className={className}
      icon={QrCodeIcon}
      title="Mobile app"
      description="Scan the QR code to track rankings and get push notifications on your phone."
      action={<MobileAppQrButton />}
    />
  );
}

// Lives as a quiet link in the Profile card's footer rather than its own red
// section, so a destructive, rarely-used action isn't sitting in plain view.
// The warning and the "type DELETE" confirmation only appear in the dialog.
function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-gray-500 hover:text-red-400 light:hover:text-red-600 transition-colors"
      >
        Delete account
      </button>
      {open && <DeleteAccountDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(deleteAccountAction, null);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!pending && e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  // Portaled to <body> so this form never nests inside the Profile form in
  // the DOM, and so the overlay escapes the scrolling <main>.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={pending ? undefined : onClose} />

      <form
        action={formAction}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="relative w-full max-w-md rounded-2xl bg-gray-900 light:bg-white shadow-2xl light:shadow-black/10 p-6"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="shrink-0 flex size-9 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
            <ExclamationTriangleIcon className="size-5 text-red-400 light:text-red-600" />
          </div>
          <div>
            <h2 id="delete-account-title" className="text-base font-semibold text-white light:text-gray-900">
              Delete your account?
            </h2>
            <p className="mt-1 text-sm text-gray-400 light:text-gray-600">
              This permanently deletes your account and every workspace you own, including its
              apps, keywords, rankings, reviews and connections. Any paid subscription is canceled
              immediately, and you&apos;ll be removed from workspaces you were invited to. This
              cannot be undone.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Alert state={state} />
          <div>
            <label htmlFor="delete-confirmation" className={labelClass}>
              Type <span className="font-mono font-semibold text-red-400 light:text-red-600">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirmation"
              name="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              autoFocus
              className={`${inputBase} border-white/[0.07] light:border-black/[0.08] focus:ring-red-500`}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || confirmation.trim() !== "DELETE"}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending && <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {pending ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function AppearanceSection({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const option = (value: "dark" | "light", Icon: typeof SunIcon, label: string) => (
    <button
      type="button"
      onClick={() => setTheme(value)}
      aria-pressed={theme === value}
      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
        theme === value
          ? "bg-indigo-500 light:bg-indigo-600 text-white shadow-sm"
          : "text-gray-400 light:text-gray-500 hover:text-gray-200 light:hover:text-gray-900"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
  return (
    <SettingsCard
      className={className}
      icon={SwatchIcon}
      title="Appearance"
      description="Choose how AppASO looks on this device. Light is the default."
      action={
        <div className="inline-flex items-center gap-1 rounded-xl bg-white/[0.06] light:bg-gray-100 p-1">
          {option("light", SunIcon, "Light")}
          {option("dark", MoonIcon, "Dark")}
        </div>
      }
    />
  );
}

export default function AccountPage({ email, profile, certification }: Props) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);
  const holderName = profile?.full_name?.trim() || email.split("@")[0] || "";

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[85rem] px-6 py-10">
        <SettingsHeader title="Account Settings" subtitle={email} />

        {/* Paired rows (not two independent columns) so each row's cards
            stretch to a shared height and their edges line up. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SettingsCard
            className="h-full"
            icon={UserCircleIcon}
            title="Profile"
            description="Your name appears on certificates and to teammates in shared workspaces."
          >
            <form id="profile-form" action={formAction} className="space-y-4">
              <Alert state={state} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="full_name" className={labelClass}>Full name</label>
                  <input
                    id="full_name"
                    name="full_name"
                    defaultValue={profile?.full_name ?? ""}
                    required
                    className={`${inputBase} focus:ring-indigo-500 ${
                      state?.error ? "border-red-500/50" : "border-white/[0.07] light:border-black/[0.08]"
                    }`}
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input
                    id="email"
                    value={email}
                    disabled
                    className={`${inputBase} border-transparent text-gray-500 light:text-gray-500 cursor-not-allowed`}
                  />
                </div>
              </div>
            </form>
            <div className="mt-4 flex items-center justify-between gap-4">
              <DeleteAccountButton />
              <button
                type="submit"
                form="profile-form"
                disabled={pending}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </SettingsCard>

          <div className="flex flex-col gap-6">
            <AppearanceSection className="flex-1" />
            <MobileAppSection className="flex-1" />
          </div>

          <SettingsCard
            className="h-full"
            icon={TrophyIcon}
            title="ASO Certification"
            description={
              certification ? (
                <>
                  Certified on{" "}
                  {new Date(certification.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
                  Download your certificate anytime.
                </>
              ) : (
                <>You haven&apos;t earned your ASO Certification yet.</>
              )
            }
            action={
              !certification && (
                <Link
                  href="/dashboard/certification"
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
                >
                  Take the exam
                </Link>
              )
            }
          >
            {certification && (
              <CertificateDownload
                holderName={holderName}
                certificateId={certification.certificateId}
                issuedAt={certification.issuedAt}
              />
            )}
          </SettingsCard>

          <SettingsCard
            className="h-full"
            icon={ArrowRightStartOnRectangleIcon}
            title="Sign out"
            description="Sign out of your account on this device."
            action={
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-lg bg-white/10 light:bg-gray-100 px-4 py-2 text-sm font-semibold text-white light:text-gray-900 hover:bg-white/15 light:hover:bg-gray-200 transition-colors"
                >
                  Sign out
                </button>
              </form>
            }
          />
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useTransition } from "react";
import { createBundleLinkAction } from "@/features/admin/actions";
import { CopyField } from "@/features/admin/CopyField";
import { BUNDLES, type BundlePlan } from "@/libs/stripe/bundles";
import { bundleEmailBody, bundleEmailSubject } from "@/features/admin/bundleEmail";

const DURATIONS = [
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
] as const;
type Duration = (typeof DURATIONS)[number]["id"];

function price(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US")}`;
}

// Admin → Bundle Links: pick Pro or Pro+, optionally lock the buyer's email,
// and get a checkout link to paste into the call chat, plus a follow-up
// email with the link in it.
export function BundleLinkForm() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [duration, setDuration] = useState<Duration>("24h");
  const [result, setResult] = useState<{ plan: BundlePlan; url: string; expiresAt: string; email: string; firstName: string; duration: Duration } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate(plan: BundlePlan) {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await createBundleLinkAction(plan, email, duration);
      if (res.ok) setResult({ plan, url: res.url, expiresAt: res.expiresAt, email: email.trim().toLowerCase(), firstName, duration });
      else setError(res.error);
    });
  }

  const expires = result
    ? new Date(result.expiresAt).toLocaleString("en-US", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-[#141417] light:bg-white p-4 ring-1 ring-white/[0.06] light:ring-black/[0.08]">
        <label htmlFor="bundle-name" className="block text-xs font-medium text-gray-400 light:text-gray-600">
          Buyer first name (optional, for the email)
        </label>
        <input
          id="bundle-name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Alex"
          className="mt-1.5 mb-4 w-full rounded-lg bg-black/30 light:bg-gray-50 px-3 py-2 text-sm text-white light:text-gray-900 ring-1 ring-white/10 light:ring-black/10 outline-none focus:ring-indigo-500"
        />

        <label htmlFor="bundle-email" className="block text-xs font-medium text-gray-400 light:text-gray-600">
          Buyer email (optional)
        </label>
        <input
          id="bundle-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          className="mt-1.5 w-full rounded-lg bg-black/30 light:bg-gray-50 px-3 py-2 text-sm text-white light:text-gray-900 ring-1 ring-white/10 light:ring-black/10 outline-none focus:ring-indigo-500"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          With an email, checkout can only be paid with it, so the plan goes on the account you expect. Leave it empty to let the buyer type their own.
        </p>

        <div className="mt-4">
          <span className="block text-xs font-medium text-gray-400 light:text-gray-600">Link works for</span>
          <div className="mt-1.5 inline-flex rounded-lg bg-black/30 light:bg-gray-100 p-1 ring-1 ring-white/10 light:ring-black/10">
            {DURATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDuration(d.id)}
                aria-pressed={duration === d.id}
                className={`rounded-md px-3 py-1 text-xs font-medium ${duration === d.id ? "bg-indigo-600 text-white" : "text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-500">24 hours for buyers ready on the call; 7 days for those who need someone&apos;s approval first.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {(Object.keys(BUNDLES) as BundlePlan[]).map((plan) => (
            <button
              key={plan}
              type="button"
              disabled={pending}
              onClick={() => generate(plan)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {BUNDLES[plan].label} link · {price(BUNDLES[plan].amountCents)}
            </button>
          ))}
        </div>
        {pending && <p className="mt-3 text-xs text-gray-500">Making the link…</p>}
        {error && <p className="mt-3 text-sm text-amber-400 light:text-amber-700">{error}</p>}
      </div>

      {result && (
        <div className="space-y-5">
          <CopyField
            label={`${BUNDLES[result.plan].label} bundle, ${price(BUNDLES[result.plan].amountCents)}${result.email ? ` for ${result.email}` : ""}, valid until ${expires} PH time`}
            value={result.url}
          />
          <CopyField label="Email subject" value={bundleEmailSubject(result.plan)} />
          <CopyField label="Email" value={bundleEmailBody(result)} multiline />
        </div>
      )}
    </div>
  );
}

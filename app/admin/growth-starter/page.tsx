import { notFound } from "next/navigation";
import { GiftIcon } from "@heroicons/react/24/outline";
import { createRealUserClient } from "@/libs/supabase/server";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import { createGrowthStarterOfferToken, createGrowthStarterCallOfferToken, CALL_OFFER_HOURS } from "@/libs/stripe/growth-starter-offer";
import { CopyField } from "@/features/admin/CopyField";
import { ExtendStarterProForm } from "@/features/admin/ExtendStarterProForm";

// Makes Growth Starter Pro bonus links: pick a deadline, get one link to send
// everyone offered the bonus for that deadline. A plain GET form, so nothing
// is stored; the same date always gives the same link. "Call only" makes a
// link valid for CALL_OFFER_HOURS from the moment it's made, to share on the
// strategy call: a new link each time.

type PageProps = { searchParams: Promise<{ deadline?: string; call?: string }> };

function defaultDeadline(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export default async function Page({ searchParams }: PageProps) {
  // The layout already gates /admin; checked again because this page signs links.
  const supabase = await createRealUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) notFound();

  const { deadline, call } = await searchParams;
  const isCall = call === "1";
  const result = isCall ? createGrowthStarterCallOfferToken() : deadline ? createGrowthStarterOfferToken(deadline) : null;
  const link = result && "token" in result
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/growth-starter?offer=${encodeURIComponent(result.token)}`
    : null;

  // Pasted into the call's chat while still on the call.
  const callMessage = isCall && link
    ? `Here's your link for the Growth Starter ($500, one payment): ${link}

Since we're on the call, it includes a bonus: 12 months of AppASO Pro ($288 value) instead of the usual 3 months, plus lifetime access to the App Growth Kit ($149 value). This bonus is only for our call, so the link works for the next ${CALL_OFFER_HOURS} hours.`
    : null;

  const email = !isCall && result && "token" in result && link
    ? `Thanks for your time today and for sharing more about your app and your current growth efforts.

Based on our conversation, I understand that [BLANK].

I believe our Growth Starter is a good fit for where you are right now.

Here's what's included:

- Expert review of your full funnel, from store listing to purchase, done before our call
- 60-minute strategy call: a live review of your app, the opportunities you're missing, and a clear plan to grow it
- Keyword opportunities and competitor gaps, walked through with you on the call
- A one-page action plan with every fix ranked by impact
- 30-minute onboarding on ASO basics and how to set up AppASO Pro, so you can start with confidence
- A 30-minute check-in call at month 1 to review what moved and what's next
- 1 month of email support from the same specialist who researched your app
- Lifetime access to the App Growth Kit ($149 value): our growth playbook, experiment library, templates, and calculators
- If you later want us to do the work, the full $500 comes off the Growth Sprint when you upgrade within 2 months of the strategy call

Your bonus: get the Growth Starter by ${result.deadlineLabel} and you get 12 months of AppASO Pro ($288 value) instead of the usual 3 months.

It's $500, one payment.

Here's your link: ${link}

The goal is simple: find what's holding your app back, show you what you're missing, and give you a plan to get more users and grow your revenue.

The bonus ends after ${result.deadlineLabel}. Any questions, just reply to this email.`
    : null;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <GiftIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Super Admin · Growth Starter bonus</h1>
            <p className="text-xs text-gray-500">
              A link that includes 12 months of Pro with the Growth Starter, until the end of the deadline day, or for {CALL_OFFER_HOURS} hours when offered on the call only.
            </p>
          </div>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl bg-[#141417] light:bg-white p-4 ring-1 ring-white/[0.06] light:ring-black/[0.08]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-400 light:text-gray-600">Buy by</span>
            <input
              type="date"
              name="deadline"
              defaultValue={deadline ?? defaultDeadline()}
              required
              className="rounded-lg bg-black/30 light:bg-gray-50 px-3 py-2 text-sm text-white light:text-gray-900 ring-1 ring-white/10 light:ring-black/10 outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Make link
          </button>
          <span className="self-center text-xs text-gray-500">or</span>
          <button
            type="submit"
            name="call"
            value="1"
            formNoValidate
            className="rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-4 py-2 text-sm font-semibold text-gray-200 light:text-gray-800 hover:bg-white/[0.10] light:hover:bg-black/[0.08]"
          >
            Call only ({CALL_OFFER_HOURS} hours)
          </button>
        </form>

        {result && "error" in result && (
          <p className="mt-4 text-sm text-amber-400 light:text-amber-700">{result.error}</p>
        )}

        {link && email && result && "token" in result && (
          <div className="mt-6 space-y-5">
            <CopyField label={`Bonus link, valid through ${result.deadlineLabel}`} value={link} />
            <CopyField label="Follow-up email" value={email} multiline />
          </div>
        )}

        {link && callMessage && result && "token" in result && (
          <div className="mt-6 space-y-5">
            <CopyField label={`Call-only bonus link, valid for ${CALL_OFFER_HOURS} hours (until ${result.expiresAt.toLocaleString("en-US", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} PH time)`} value={link} />
            <CopyField label="Message for the call chat" value={callMessage} multiline />
          </div>
        )}

        <ExtendStarterProForm />
      </div>
    </div>
  );
}

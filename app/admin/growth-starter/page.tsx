import { notFound } from "next/navigation";
import { GiftIcon } from "@heroicons/react/24/outline";
import { createRealUserClient } from "@/libs/supabase/server";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import { createGrowthStarterOfferToken, createGrowthStarterTimedOfferToken, parseTimedOfferHours } from "@/libs/stripe/growth-starter-offer";
import { CopyField } from "@/features/admin/CopyField";
import { ExtendStarterProForm } from "@/features/admin/ExtendStarterProForm";
import { BonusLinkForm } from "@/features/admin/BonusLinkForm";

// Makes Growth Starter Pro bonus links: pick a deadline, get one link to send
// everyone offered the bonus for that deadline. A plain GET form, so nothing
// is stored; the same date always gives the same link. The timed buttons make
// a link valid from the moment it's made, a new link each time: 24 hours with
// a follow-up email, or 2 hours to share in the chat on the strategy call.

// Shared by the follow-up email and the call chat message.
const INCLUDED = `Here's everything included in the $500 Growth Starter package:

12 Months of AppASO Pro ($288 value): Get a full year of access to our ASO platform to research high-potential keywords, monitor keyword rankings, analyze competitors, and track your app's organic growth.

Lifetime App Growth Kit Access ($149 value): Get our growth playbook, experiment library, templates, and calculators.

Know-Your-App Deep Dive: A 30-minute call on your goals, numbers, users, and what you've tried so far, so every recommendation fits your app instead of a generic checklist.

Full Funnel Review: Following the deep dive, our ASO specialist will conduct an in-depth review of your app, covering everything from your store listing to the purchase experience, completed before our call.

60-Minute Strategy Call: A live walkthrough of your app, the growth opportunities you're missing, and a clear strategy to improve performance.

Prioritized Action Plan: A clear, written one-page roadmap detailing all our recommended improvements, organized by priority and ranked by potential impact, so you know exactly what to fix first and how to maximize your app's growth opportunities.

30-Day Check-In: A 30-minute follow-up call after one month to review progress and discuss next steps.

Listing Reviews Before You Publish: For one month, send any change to your title, subtitle, keywords, or screenshots to the same specialist who researched your app, and get written feedback before it goes live.

Strategy Call Guarantee: If after the strategy call you don't think it was worth $500, tell us within 7 days and we refund you in full. You keep the action plan.

You'll walk away with expert insights, a prioritized growth roadmap, and the tools and support to start improving your app's performance.`;

type PageProps = { searchParams: Promise<{ deadline?: string; hours?: string }> };

function defaultDeadline(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export default async function Page({ searchParams }: PageProps) {
  // The layout already gates /admin; checked again because this page signs links.
  const supabase = await createRealUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) notFound();

  const { deadline, hours: hoursParam } = await searchParams;
  const hours = parseTimedOfferHours(hoursParam);
  const isCall = hours === 2;
  const result = hours ? createGrowthStarterTimedOfferToken(hours) : deadline ? createGrowthStarterOfferToken(deadline) : null;
  const phTime = result && "token" in result
    ? result.expiresAt.toLocaleString("en-US", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
  const link = result && "token" in result
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/growth-starter?offer=${encodeURIComponent(result.token)}`
    : null;

  // Pasted into the call's chat while still on the call.
  const callMessage = isCall && link
    ? `Thanks for your time today and for walking me through your app and your current growth efforts.

Based on what we discussed, I believe our Growth Starter is a good fit for where you are right now.

${INCLUDED}

Your bonus, since we're on the call: get the Growth Starter within the next ${hours} hours and you get 12 months of AppASO Pro ($288 value) instead of the usual 3 months.

It's $500, one payment.

Here's your link: ${link}

The goal is simple: find what's holding your app back, show you what you're missing, and give you a plan to get more users and grow your revenue.

This bonus is only for our call, so the link stops working after that. Any questions, just ask me here.`
    : null;

  const bonusBy = hours ? `within the next ${hours} hours` : result && "token" in result ? `by ${result.deadlineLabel}` : "";
  const bonusEnds = hours ? `in ${hours} hours` : result && "token" in result ? `after ${result.deadlineLabel}` : "";

  const email = !isCall && result && "token" in result && link
    ? `Thanks for your time today and for sharing more about your app and your current growth efforts.

${INCLUDED}

Your bonus: get the Growth Starter ${bonusBy} and you get 12 months of AppASO Pro ($288 value) instead of the usual 3 months.

It's $500, one payment.

Here's your link: ${link}

The goal is simple: find what's holding your app back, show you what you're missing, and give you a plan to get more users and grow your revenue.

The bonus ends ${bonusEnds}. Any questions, just reply to this email.`
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
              A link that includes 12 months of Pro with the Growth Starter, until the end of the deadline day, for 24 hours with a follow-up email, or for 2 hours when offered on the call only.
            </p>
          </div>
        </div>

        <BonusLinkForm
          key={`${hoursParam ?? ""}|${deadline ?? ""}`}
          initialMode={hours === 24 ? "24" : deadline ? "date" : "2"}
          initialDeadline={deadline ?? defaultDeadline()}
          showReset={Boolean(hoursParam || deadline)}
        />

        {result && "error" in result && (
          <p className="mt-4 text-sm text-amber-400 light:text-amber-700">{result.error}</p>
        )}

        {link && email && result && "token" in result && (
          <div className="mt-6 space-y-5">
            <CopyField label={hours ? `Bonus link, valid for ${hours} hours (until ${phTime} PH time)` : `Bonus link, valid through ${result.deadlineLabel}`} value={link} />
            <CopyField label="Follow-up email" value={email} multiline />
          </div>
        )}

        {link && callMessage && result && "token" in result && (
          <div className="mt-6 space-y-5">
            <CopyField label={`Call-only bonus link, valid for ${hours} hours (until ${phTime} PH time)`} value={link} />
            <CopyField label="Message for the call chat" value={callMessage} multiline />
          </div>
        )}

        <ExtendStarterProForm />
      </div>
    </div>
  );
}

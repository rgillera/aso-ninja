import { PLANS } from "@/features/subscription/plans";
import { BUNDLES, type BundlePlan } from "@/libs/stripe/bundles";

// The follow-up email for a bundle link, made on Admin → Bundle Links and
// pasted into the user's own email. Edit the wording here. Prices come from
// BUNDLES and PLANS so they never drift from what checkout charges.

const HIGHLIGHTS: Record<BundlePlan, string> = {
  pro: "1,000 keywords with relevancy and opportunity scoring, unlimited apps and countries, 5 competitors per app, the Keyword Inspector with estimated searches, impressions and downloads, AI keyword suggestions, and 6 months of history",
  pro_plus: "everything in Pro, plus 5,000 keywords, 4 workspaces with 6 seats each, the keyword simulator, ranked keywords, 8 competitors per app, and a full year of history",
};

function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US")}`;
}

export function bundleEmailSubject(plan: BundlePlan): string {
  return `Your AppASO ${BUNDLES[plan].label} Annual + Growth Strategy link`;
}

export function bundleEmailBody({ plan, url, firstName, email }: { plan: BundlePlan; url: string; firstName: string; email: string }): string {
  const bundle = BUNDLES[plan];
  const monthly = PLANS.find((p) => p.id === plan)?.priceMonthlyCents ?? 0;
  const yearValue = dollars(monthly * 12);
  const name = firstName.trim();

  const account = email
    ? `Pay with ${email} and your account is ready right away: you'll get an email to set your password and log in. Already have an AppASO account with that email? It goes straight onto it.`
    : `Your account is ready right after you pay: you'll get an email at the address you use at checkout to set your password and log in. Already have an AppASO account? Use the same email and it goes straight onto it.`;

  return `Hi ${name || "there"},

Thanks for your time today and for walking me through your app.

As we discussed, here's your AppASO ${bundle.label} Annual + Growth Strategy:

12 months of AppASO ${bundle.label} (${yearValue} value): ${HIGHLIGHTS[plan]}.

1 month of 1:1 growth strategy support: a specialist reviews your app and works with you on what to fix first. Your specialist will email you within 1 working day of your purchase to get started.

It's ${dollars(bundle.amountCents)}, one payment. No subscription, nothing renews.

Here's your link: ${url}

${account}

The link works for 24 hours. Any questions, just reply to this email.

Best,`;
}

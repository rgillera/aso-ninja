import { greetingHtml, greetingText } from "./greeting";

// Sent to the buyer from the Stripe webhook right after a Growth Starter
// purchase. The strategy call isn't self-booked: their specialist emails them to
// schedule it, so this sets that expectation and gives a fallback contact.
// proDays: days of Pro the purchase granted (365, 90 for older purchases, or
// 0 when the buyer is already on a paid plan and has Pro anyway). planName:
// "Pro", or "Pro+" when bought through a bonus link.

// How the buyer's account came about, which decides how they get in.
export type GrowthStarterAccount =
  | { kind: "signed_in" }
  | { kind: "existing" }
  | { kind: "new"; setupUrl: string };

const loginUrl = () => `${process.env.NEXT_PUBLIC_SITE_URL}/login`;
const forgotUrl = () => `${process.env.NEXT_PUBLIC_SITE_URL}/forgot-password`;

function accountHtml(account: GrowthStarterAccount): string {
  if (account.kind === "new") {
    return `<p>We made your AppASO account with this email. <a href="${account.setupUrl}" style="color: #4f46e5; font-weight: 600;">Set your password</a> to get in. Link expired? <a href="${forgotUrl()}" style="color: #4f46e5;">Reset your password</a> with this email instead.</p>`;
  }
  if (account.kind === "existing") {
    return `<p>It's on your existing AppASO account for this email. <a href="${loginUrl()}" style="color: #4f46e5;">Log in</a> as usual.</p>`;
  }
  return "";
}

function accountText(account: GrowthStarterAccount): string {
  if (account.kind === "new") {
    return `\nWe made your AppASO account with this email. Set your password to get in: ${account.setupUrl}\nLink expired? Reset your password with this email instead: ${forgotUrl()}\n`;
  }
  if (account.kind === "existing") {
    return `\nIt's on your existing AppASO account for this email. Log in as usual: ${loginUrl()}\n`;
  }
  return "";
}

export const growthStarterWelcomeSubject = "You're in! Welcome to the Growth Starter";

function proLength(proDays: number): string | null {
  if (proDays === 365) return "12 months";
  if (proDays === 90) return "3 months";
  if (proDays === 60) return "2 months";
  if (proDays > 0) return `${proDays} days`;
  return null;
}

export function renderGrowthStarterWelcomeHtml(fullName?: string | null, proDays = 0, account: GrowthStarterAccount = { kind: "signed_in" }, planName = "Pro") {
  const length = proLength(proDays);
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>${greetingHtml(fullName)}</p>
  <p>Thanks for getting the Growth Starter! &#127881;${length ? ` Your <strong>AppASO ${planName}</strong> access is active now and runs for ${length}.` : ""}</p>
  ${accountHtml(account)}
  <p>Your assigned growth specialist will <strong>email you within 1 working day</strong> with a few questions about your app, your goals, and your numbers, and to book your strategy call.</p>
  <p><strong>What happens next</strong></p>
  <ol style="padding-left: 20px;">
    <li>Answer a few questions about your app, goals, users, and numbers, so your plan fits your app.</li>
    <li>About 3 working days after you send your answers: your 30-minute call, where we roast your app and build your growth strategy. Record it if you like. Either way, within 2 working days we send you a one-page action plan with every fix ranked by impact.</li>
    <li>For 1 month after the call: email your specialist any question about your plan.</li>
  </ol>
  <p>To get a head start, reply to this email with your App Store or Google Play link.</p>
  <p>If you haven't heard from your specialist within 2 working days, email us at <a href="mailto:hello@appaso.io" style="color: #4f46e5;">hello@appaso.io</a>.</p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

export function renderGrowthStarterWelcomeText(fullName?: string | null, proDays = 0, account: GrowthStarterAccount = { kind: "signed_in" }, planName = "Pro") {
  const length = proLength(proDays);
  return `${greetingText(fullName)}

Thanks for getting the Growth Starter!${length ? ` Your AppASO ${planName} access is active now and runs for ${length}.` : ""}
${accountText(account)}
Your assigned growth specialist will email you within 1 working day with a few questions about your app, your goals, and your numbers, and to book your strategy call.

What happens next:
1. Answer a few questions about your app, goals, users, and numbers, so your plan fits your app.
2. About 3 working days after you send your answers: your 30-minute call, where we roast your app and build your growth strategy. Record it if you like. Either way, within 2 working days we send you a one-page action plan with every fix ranked by impact.
3. For 1 month after the call: email your specialist any question about your plan.

To get a head start, reply to this email with your App Store or Google Play link.

If you haven't heard from your specialist within 2 working days, email us at hello@appaso.io.

Best,
The AppASO Team`;
}

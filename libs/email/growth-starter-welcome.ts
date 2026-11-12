import { greetingHtml, greetingText } from "./greeting";

// Sent to the buyer from the Stripe webhook right after a Growth Starter
// purchase. Onboarding isn't self-booked: their specialist emails them to
// schedule it, so this sets that expectation and gives a fallback contact.
// proDays: Pro the purchase granted (365 bonus link, 90, or 0 when the buyer
// is already on a paid plan and has Pro anyway).

export const growthStarterWelcomeSubject = "You're in! Welcome to the Growth Starter";

function proLength(proDays: number): string | null {
  if (proDays === 365) return "12 months";
  if (proDays === 90) return "3 months";
  if (proDays === 60) return "2 months";
  if (proDays > 0) return `${proDays} days`;
  return null;
}

export function renderGrowthStarterWelcomeHtml(fullName?: string | null, proDays = 0) {
  const length = proLength(proDays);
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>${greetingHtml(fullName)}</p>
  <p>Thanks for getting the Growth Starter! &#127881;${length ? ` Your <strong>AppASO Pro</strong> access is active now and runs for ${length}.` : ""}</p>
  <p>Your assigned growth specialist will <strong>email you to schedule your 30-minute deep-dive call</strong>, where we learn about your app, your goals, and your numbers.</p>
  <p><strong>What happens next</strong></p>
  <ol style="padding-left: 20px;">
    <li>Deep-dive call: your app, goals, users, and numbers, so your plan fits your app.</li>
    <li>Within 7 working days: your 60-minute call, where we roast your app and build your growth strategy. Record it if you like. Either way, within 2 working days we send you a one-page action plan with every fix ranked by impact.</li>
    <li>At month 1: a 30-minute check-in call to review what moved.</li>
    <li>For 30 days: send us any listing change before you publish it, and we review it.</li>
  </ol>
  <p>To get a head start, reply to this email with your App Store or Google Play link.</p>
  <p>If you haven't heard from your specialist within 3 days, email us at <a href="mailto:hello@appaso.io" style="color: #4f46e5;">hello@appaso.io</a>.</p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

export function renderGrowthStarterWelcomeText(fullName?: string | null, proDays = 0) {
  const length = proLength(proDays);
  return `${greetingText(fullName)}

Thanks for getting the Growth Starter!${length ? ` Your AppASO Pro access is active now and runs for ${length}.` : ""}

Your assigned growth specialist will email you to schedule your 30-minute deep-dive call, where we learn about your app, your goals, and your numbers.

What happens next:
1. Deep-dive call: your app, goals, users, and numbers, so your plan fits your app.
2. Within 7 working days: your 60-minute call, where we roast your app and build your growth strategy. Record it if you like. Either way, within 2 working days we send you a one-page action plan with every fix ranked by impact.
3. At month 1: a 30-minute check-in call to review what moved.
4. For 30 days: send us any listing change before you publish it, and we review it.

To get a head start, reply to this email with your App Store or Google Play link.

If you haven't heard from your specialist within 3 days, email us at hello@appaso.io.

Best,
The AppASO Team`;
}

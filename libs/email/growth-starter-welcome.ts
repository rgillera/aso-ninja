import { greetingHtml, greetingText } from "./greeting";

// Sent to the buyer from the Stripe webhook right after a Growth Starter
// purchase. Onboarding isn't self-booked: their specialist emails them to
// schedule it, so this sets that expectation and gives a fallback contact.

export const growthStarterWelcomeSubject = "You're in! Welcome to the Growth Starter";

export function renderGrowthStarterWelcomeHtml(fullName?: string | null) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>${greetingHtml(fullName)}</p>
  <p>Thanks for getting the Growth Starter! &#127881; Your <strong>AppASO Pro</strong> access is active now and runs for 12 months.</p>
  <p>Your assigned growth specialist will <strong>email you to schedule your 30-minute onboarding call</strong>, where we cover ASO basics and show you how to use AppASO Pro.</p>
  <p><strong>What happens next</strong></p>
  <ol style="padding-left: 20px;">
    <li>Onboarding call: ASO basics and a guided tour of AppASO Pro.</li>
    <li>Within 7 working days: your 60-minute call, where we roast your app and build your growth strategy. Feel free to record it.</li>
    <li>60 days of email support while you put the plan to work and see the results.</li>
  </ol>
  <p>To get a head start, reply to this email with your App Store or Google Play link.</p>
  <p>If you haven't heard from your specialist within 3 days, email us at <a href="mailto:hello@appaso.io" style="color: #4f46e5;">hello@appaso.io</a>.</p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

export function renderGrowthStarterWelcomeText(fullName?: string | null) {
  return `${greetingText(fullName)}

Thanks for getting the Growth Starter! Your AppASO Pro access is active now and runs for 12 months.

Your assigned growth specialist will email you to schedule your 30-minute onboarding call, where we cover ASO basics and show you how to use AppASO Pro.

What happens next:
1. Onboarding call: ASO basics and a guided tour of AppASO Pro.
2. Within 7 working days: your 60-minute call, where we roast your app and build your growth strategy. Feel free to record it.
3. 60 days of email support while you put the plan to work and see the results.

To get a head start, reply to this email with your App Store or Google Play link.

If you haven't heard from your specialist within 3 days, email us at hello@appaso.io.

Best,
The AppASO Team`;
}

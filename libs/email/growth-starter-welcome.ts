import { growthStarterBookingUrl } from "@/features/subscription/growthStarterBooking";
import { greetingHtml, greetingText } from "./greeting";

// Sent to the buyer from the Stripe webhook right after a Growth Starter
// purchase. The success page shows the same booking link, but this is the
// copy they keep once that tab is closed.

const bookingUrl = growthStarterBookingUrl ?? "mailto:hello@appaso.io?subject=Growth%20Starter%20onboarding";

export const growthStarterWelcomeSubject = "You're in! Book your Growth Starter onboarding call";

export function renderGrowthStarterWelcomeHtml(fullName?: string | null) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>${greetingHtml(fullName)}</p>
  <p>Thanks for getting the Growth Starter! &#127881; Your <strong>AppASO Pro</strong> access is active now and runs for 12 months.</p>
  <p>The first step is your 30-minute onboarding call, where we show you how to use AppASO Pro.</p>
  <p>
    <a href="${bookingUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
      Book my onboarding call
    </a>
  </p>
  <p><strong>What happens next</strong></p>
  <ol style="padding-left: 20px;">
    <li>Onboarding call: a guided tour of AppASO Pro and how to use it.</li>
    <li>Within 7 working days: your 60-minute call, where we roast your app and build your growth strategy. Feel free to record it.</li>
    <li>30 days of email support while you put the plan to work.</li>
  </ol>
  <p>Before the call, reply to this email with your App Store or Google Play link so we can take a look first.</p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

export function renderGrowthStarterWelcomeText(fullName?: string | null) {
  return `${greetingText(fullName)}

Thanks for getting the Growth Starter! Your AppASO Pro access is active now and runs for 12 months.

The first step is your 30-minute onboarding call, where we show you how to use AppASO Pro. Book it here: ${bookingUrl}

What happens next:
1. Onboarding call: a guided tour of AppASO Pro and how to use it.
2. Within 7 working days: your 60-minute call, where we roast your app and build your growth strategy. Feel free to record it.
3. 30 days of email support while you put the plan to work.

Before the call, reply to this email with your App Store or Google Play link so we can take a look first.

Best,
The AppASO Team`;
}

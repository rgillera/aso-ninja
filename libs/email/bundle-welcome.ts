import { greetingHtml, greetingText } from "./greeting";

// Sent to the buyer from the Stripe webhook right after a bundle purchase
// (12 months of Pro or Pro+ plus 1 month of service, sold on a call through a
// Stripe Payment Link). The buyer never signed up first, so this is also how
// a new buyer gets into their account.

// How the buyer's account came about, which decides how they get in.
export type BundleAccount =
  | { kind: "existing" }
  | { kind: "new"; setupUrl: string };

const loginUrl = () => `${process.env.NEXT_PUBLIC_SITE_URL}/login`;
const forgotUrl = () => `${process.env.NEXT_PUBLIC_SITE_URL}/forgot-password`;

function accountHtml(account: BundleAccount): string {
  if (account.kind === "new") {
    return `<p>We made your AppASO account with this email. <a href="${account.setupUrl}" style="color: #4f46e5; font-weight: 600;">Set your password</a> to get in. Link expired? <a href="${forgotUrl()}" style="color: #4f46e5;">Reset your password</a> with this email instead.</p>`;
  }
  return `<p>It's on your existing AppASO account for this email. <a href="${loginUrl()}" style="color: #4f46e5;">Log in</a> as usual.</p>`;
}

function accountText(account: BundleAccount): string {
  if (account.kind === "new") {
    return `We made your AppASO account with this email. Set your password to get in: ${account.setupUrl}\nLink expired? Reset your password with this email instead: ${forgotUrl()}`;
  }
  return `It's on your existing AppASO account for this email. Log in as usual: ${loginUrl()}`;
}

export const bundleWelcomeSubject = "You're in! Welcome to AppASO";

// planGranted: false when the buyer already pays for a plan, so the 12
// months weren't switched on automatically and the team sets them up by hand.
export function renderBundleWelcomeHtml(fullName: string | null, planName: string, planGranted: boolean, account: BundleAccount) {
  const access = planGranted
    ? `Your <strong>AppASO ${planName}</strong> is active now and runs for 12 months.`
    : `You already have a paid AppASO plan, so we'll move your 12 months of <strong>${planName}</strong> onto it by hand and email you when it's done.`;
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>${greetingHtml(fullName)}</p>
  <p>Thanks for your purchase! &#127881; ${access}</p>
  ${accountHtml(account)}
  <p>Your 1 month of service starts now: your growth specialist will <strong>email you within 1 working day</strong> to get started.</p>
  <p>To get a head start, reply to this email with your App Store or Google Play link.</p>
  <p>If you haven't heard from us within 2 working days, email us at <a href="mailto:hello@appaso.io" style="color: #4f46e5;">hello@appaso.io</a>.</p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

export function renderBundleWelcomeText(fullName: string | null, planName: string, planGranted: boolean, account: BundleAccount) {
  const access = planGranted
    ? `Your AppASO ${planName} is active now and runs for 12 months.`
    : `You already have a paid AppASO plan, so we'll move your 12 months of ${planName} onto it by hand and email you when it's done.`;
  return `${greetingText(fullName)}

Thanks for your purchase! ${access}

${accountText(account)}

Your 1 month of service starts now: your growth specialist will email you within 1 working day to get started.

To get a head start, reply to this email with your App Store or Google Play link.

If you haven't heard from us within 2 working days, email us at hello@appaso.io.

Best,
The AppASO Team`;
}

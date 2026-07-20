const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://appaso.io";
const demoUrl = "https://calendly.com/erik-baring-appaso/15min";

export const WELCOME_EMAIL_SUBJECT = "Welcome to AppASO! Let's Get Your Keywords Growing";

export function renderWelcomeEmailHtml() {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>Hi there,</p>
  <p>Welcome to AppASO! &#127881; We're excited to have you on board.</p>
  <p>You're all set to start tracking and monitoring your app keywords. Getting started is simple&mdash;just follow the steps in the guide below:</p>
  <p>
    <img src="${siteUrl}/how-it-works.png" alt="How AppASO works" width="560" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" />
  </p>
  <p>With AppASO, you can:</p>
  <ul>
    <li>Research long tail keywords</li>
    <li>Track your keyword rankings</li>
    <li>Monitor keyword performance over time</li>
    <li>Discover opportunities to improve your app's visibility</li>
  </ul>
  <p>If you'd like a personalized walkthrough, we're here to help.</p>
  <p>
    <a href="${demoUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
      Book a free 15-minute demo
    </a>
  </p>
  <p>We're excited to help you make the most of your app's keyword strategy and grow your visibility.</p>
  <p>Happy optimizing!</p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

// One-time "try Pro free" email for users who can still start the opt-in
// trial, sent by /api/cron/send-trial-offer-emails. The button lands on
// /dashboard/start-trial, which starts the trial in one click (after login).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://appaso.io";
const startUrl = `${siteUrl}/dashboard/start-trial`;

export const TRIAL_OFFER_EMAIL_SUBJECT = "Try AppASO Pro free for 7 days, no card needed";

const PRO_FEATURES = [
  "Keyword Inspector: volume, difficulty and the apps ranking for any keyword, in any country",
  "Long Tail Keywords: easier keywords to rank for, built from your seed keywords",
  "AI keyword suggestions and estimated downloads per keyword",
  "5 competitors per app and 6 months of ranking history",
];

const INTRO = "You can now try every Pro feature free for 7 days. No credit card, nothing to cancel: your account moves back to the Free Plan on its own when the week is up.";
const OUTRO = "Your keywords and rankings stay either way. Start whenever you're ready, the 7 days begin when you click.";

export function renderTrialOfferEmailHtml() {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>Hi there,</p>
  <p>${INTRO}</p>
  <p>Here's what Pro unlocks:</p>
  <ul>
    ${PRO_FEATURES.map((f) => `<li>${f}</li>`).join("\n    ")}
  </ul>
  <p>${OUTRO}</p>
  <p>
    <a href="${startUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
      Start my free Pro trial
    </a>
  </p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

export function renderTrialOfferEmailText() {
  return `Hi there,

${INTRO}

Here's what Pro unlocks:

${PRO_FEATURES.map((f) => `- ${f}`).join("\n")}

${OUTRO}

Start my free Pro trial: ${startUrl}

Best,
The AppASO Team`;
}

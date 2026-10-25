// Signup Pro trial emails, sent by /api/cron/pro-trial: one with 2 days
// left, one on the last day.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://appaso.io";
const upgradeUrl = `${siteUrl}/dashboard/subscription`;

export type TrialEmail = "reminder" | "last_day";

export const TRIAL_EMAIL_SUBJECT: Record<TrialEmail, string> = {
  reminder: "2 days left on your AppASO Pro trial",
  last_day: "Your AppASO Pro trial ends today",
};

const INTRO: Record<TrialEmail, string> = {
  reminder: "Your free Pro trial ends in 2 days. Here's what you've had access to that the Free Plan doesn't include:",
  last_day: "Your free Pro trial ends today. After that your account moves to the Free Plan, and these go away:",
};

const PRO_FEATURES = [
  "Keyword Inspector: volume, difficulty and the apps ranking for any keyword, in any country",
  "Long Tail Keywords: easier keywords to rank for, built from your seed keywords",
  "AI keyword suggestions and estimated downloads per keyword",
  "5 competitors per app and 6 months of ranking history",
];

const OUTRO: Record<TrialEmail, string> = {
  reminder: "Haven't tried Long Tail Keywords yet? It's the quickest way to find keywords you can actually rank for this month.",
  last_day: "Your keywords and rankings stay. Anything over the Free Plan's limits is paused, not deleted, and comes back as soon as you upgrade.",
};

export function renderTrialEmailHtml(kind: TrialEmail) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>Hi there,</p>
  <p>${INTRO[kind]}</p>
  <ul>
    ${PRO_FEATURES.map((f) => `<li>${f}</li>`).join("\n    ")}
  </ul>
  <p>${OUTRO[kind]}</p>
  <p>
    <a href="${upgradeUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
      Keep Pro
    </a>
  </p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

export function renderTrialEmailText(kind: TrialEmail) {
  return `Hi there,

${INTRO[kind]}

${PRO_FEATURES.map((f) => `- ${f}`).join("\n")}

${OUTRO[kind]}

Keep Pro: ${upgradeUrl}

Best,
The AppASO Team`;
}

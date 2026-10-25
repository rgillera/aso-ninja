import { freeAuditLink } from "@/features/subscription/freeAudit";
import { TRUSTPILOT_REVIEW_URL } from "@/features/review/constants";

const auditUrl = freeAuditLink("welcome_email").href;

export const WELCOME_EMAIL_SUBJECT = "Welcome to AppASO! Your 7-day Pro trial is on";

export function renderWelcomeEmailHtml() {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>Hi there,</p>
  <p>Welcome to AppASO! &#127881; We're excited to have you on board.</p>
  <p>Your account is on a <strong>free 7-day Pro trial</strong>, no card needed. You have full access to every Pro feature, including the Keyword Inspector, Long Tail Keywords and AI keyword suggestions.</p>
  <p>Want some help getting started? One of our ASO specialists will audit your app for free and show you where the quick wins are.</p>
  <p>
    <a href="${auditUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
      Book my free ASO audit
    </a>
  </p>
  <p>And if you find AppASO useful, please consider leaving us a review on <a href="${TRUSTPILOT_REVIEW_URL}" style="color: #4f46e5;">Trustpilot</a>. It really helps us grow.</p>
  <p>Happy optimizing!</p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

export function renderWelcomeEmailText() {
  return `Hi there,

Welcome to AppASO! We're excited to have you on board.

Your account is on a free 7-day Pro trial, no card needed. You have full access to every Pro feature, including the Keyword Inspector, Long Tail Keywords and AI keyword suggestions.

Want some help getting started? One of our ASO specialists will audit your app for free and show you where the quick wins are. Book your free audit: ${auditUrl}

And if you find AppASO useful, please consider leaving us a review on Trustpilot. It really helps us grow: ${TRUSTPILOT_REVIEW_URL}

Happy optimizing!

Best,
The AppASO Team`;
}

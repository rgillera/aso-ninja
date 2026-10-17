import { TRUSTPILOT_REVIEW_URL } from "@/features/review/constants";

export const REVIEW_EMAIL_SUBJECT = "Quick favor? Tell others what you think of AppASO";

export function renderReviewEmailHtml() {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
  <p>Hi there,</p>
  <p>Thanks for tracking your keywords with AppASO. We hope it's helping you understand where your app ranks and where to grow.</p>
  <p>Could you take a minute to share your experience on Trustpilot? Honest reviews, good or bad, help other app developers decide if AppASO is right for them, and they help us know what to improve.</p>
  <p>
    <a href="${TRUSTPILOT_REVIEW_URL}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
      Review us on Trustpilot
    </a>
  </p>
  <p>Thank you for your support!</p>
  <p>Best,<br/>The AppASO Team</p>
</div>`.trim();
}

export function renderReviewEmailText() {
  return `Hi there,

Thanks for tracking your keywords with AppASO. We hope it's helping you understand where your app ranks and where to grow.

Could you take a minute to share your experience on Trustpilot? Honest reviews, good or bad, help other app developers decide if AppASO is right for them, and they help us know what to improve.

Review us on Trustpilot: ${TRUSTPILOT_REVIEW_URL}

Thank you for your support!

Best,
The AppASO Team`;
}

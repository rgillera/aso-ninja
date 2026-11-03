// Internal alert sent to the AppASO inbox when someone buys the Growth
// Starter (from the Stripe webhook), so the onboarding call can be set up by
// hand. Not sent to the buyer.

export type GrowthStarterPurchase = {
  email: string | null;
  name: string | null;
  amountCents: number | null;
  currency: string | null;
  sessionId: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAmount(p: GrowthStarterPurchase): string {
  if (p.amountCents === null) return "unknown";
  return `${(p.amountCents / 100).toFixed(2)} ${(p.currency ?? "usd").toUpperCase()}`;
}

export function growthStarterAlertSubject(p: GrowthStarterPurchase): string {
  return `New Growth Starter purchase: ${p.name ?? p.email ?? "unknown buyer"}`;
}

export function renderGrowthStarterAlertHtml(p: GrowthStarterPurchase): string {
  const email = p.email ? escapeHtml(p.email) : null;
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #111827;">
  <p>Someone just bought the Growth Starter. Send them a link to book their onboarding call.</p>
  <ul>
    <li><strong>Name:</strong> ${p.name ? escapeHtml(p.name) : "not given"}</li>
    <li><strong>Email:</strong> ${email ? `<a href="mailto:${email}">${email}</a>` : "not given"}</li>
    <li><strong>Paid:</strong> ${formatAmount(p)}</li>
    <li><strong>Checkout session:</strong> ${escapeHtml(p.sessionId)}</li>
  </ul>
</div>`;
}

export function renderGrowthStarterAlertText(p: GrowthStarterPurchase): string {
  return `Someone just bought the Growth Starter. Send them a link to book their onboarding call.

Name: ${p.name ?? "not given"}
Email: ${p.email ?? "not given"}
Paid: ${formatAmount(p)}
Checkout session: ${p.sessionId}`;
}

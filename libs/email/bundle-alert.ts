import type { BundleAccount } from "./bundle-welcome";

// Internal alert sent to the AppASO inbox when someone buys a bundle through
// a Stripe Payment Link (from the Stripe webhook), so the month of service
// can be started by hand. Not sent to the buyer.

export type BundlePurchase = {
  email: string;
  name: string | null;
  amountCents: number | null;
  currency: string | null;
  sessionId: string;
  // "Pro" or "Pro+".
  planName: string;
  // false when the buyer already pays for a plan: the 12 months weren't
  // granted and need setting up by hand.
  planGranted: boolean;
  account: BundleAccount;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAmount(p: BundlePurchase): string {
  if (p.amountCents === null) return "unknown";
  return `${(p.amountCents / 100).toFixed(2)} ${(p.currency ?? "usd").toUpperCase()}`;
}

function planLabel(p: BundlePurchase): string {
  return p.planGranted
    ? `${p.planName}, 12 months`
    : `none: already on a paid plan, set up ${p.planName} for 12 months by hand`;
}

function accountLabel(p: BundlePurchase): string {
  return p.account.kind === "new" ? "new, created at checkout (setup link sent)" : "existing account for this email";
}

export function bundleAlertSubject(p: BundlePurchase): string {
  return `New ${p.planName} bundle purchase: ${p.name ?? p.email}`;
}

export function renderBundleAlertHtml(p: BundlePurchase): string {
  const email = escapeHtml(p.email);
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #111827;">
  <p>Someone just bought a ${escapeHtml(p.planName)} bundle. Start their month of service: they were told to expect your email within 1 working day.</p>
  <ul>
    <li><strong>Name:</strong> ${p.name ? escapeHtml(p.name) : "not given"}</li>
    <li><strong>Email:</strong> <a href="mailto:${email}">${email}</a></li>
    <li><strong>Paid:</strong> ${formatAmount(p)}</li>
    <li><strong>Plan granted:</strong> ${p.planGranted ? planLabel(p) : `<strong>${planLabel(p)}</strong>`}</li>
    <li><strong>Account:</strong> ${accountLabel(p)}</li>
    <li><strong>Checkout session:</strong> ${escapeHtml(p.sessionId)}</li>
  </ul>
</div>`;
}

export function renderBundleAlertText(p: BundlePurchase): string {
  return `Someone just bought a ${p.planName} bundle. Start their month of service: they were told to expect your email within 1 working day.

Name: ${p.name ?? "not given"}
Email: ${p.email}
Paid: ${formatAmount(p)}
Plan granted: ${planLabel(p)}
Account: ${accountLabel(p)}
Checkout session: ${p.sessionId}`;
}

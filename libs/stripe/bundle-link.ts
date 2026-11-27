import { createHmac, timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";
import { bundlePriceId, isBundlePlan, type BundlePlan } from "@/libs/stripe/bundles";

// Bundle links: appaso.io/buy/<token>, made on Admin → Bundle Links and sent
// to one buyer. Stripe checkout sessions last 24 hours at most, so the link
// is ours instead: each visit makes a fresh checkout session, until the
// link's own deadline (24 hours or 7 days). The token carries the plan, the
// buyer's email (optional) and the deadline, signed so none can be edited.
// The key is derived from the Stripe secret key, so there's no extra secret
// to set up; rotating that key ends links already sent.

export const BUNDLE_LINK_DURATIONS = { "24h": 24 * 60 * 60, "7d": 7 * 24 * 60 * 60 } as const;
export type BundleLinkDuration = keyof typeof BUNDLE_LINK_DURATIONS;
const UTC_MINUS_12 = 12 * 60 * 60;

export type BundleLink = { plan: BundlePlan; email: string; expiresAt: number };

function sign(payload: string): string {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY is not set");
  const key = createHmac("sha256", secret).update("appaso-bundle-link").digest();
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createBundleLinkToken(plan: BundlePlan, email: string, duration: BundleLinkDuration): { token: string; expiresAt: number } {
  let expiresAt = Math.floor(Date.now() / 1000) + BUNDLE_LINK_DURATIONS[duration];
  // A 7-day link names a date, so it lasts until that date ends in the last
  // time zone on Earth (UTC-12): the date holds wherever the buyer is.
  if (duration === "7d") {
    const day = new Date((expiresAt - UTC_MINUS_12) * 1000);
    expiresAt = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1) / 1000 + UTC_MINUS_12;
  }
  const payload = Buffer.from(JSON.stringify({ p: plan, e: email, x: expiresAt })).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

export function readBundleLinkToken(token: string): { status: "valid"; link: BundleLink } | { status: "invalid" | "expired" } {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return { status: "invalid" };
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { status: "invalid" };

  let data: { p?: unknown; e?: unknown; x?: unknown };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { status: "invalid" };
  }
  if (!isBundlePlan(data.p) || typeof data.e !== "string" || typeof data.x !== "number") return { status: "invalid" };
  if (data.x <= Math.floor(Date.now() / 1000)) return { status: "expired" };
  return { status: "valid", link: { plan: data.p, email: data.e, expiresAt: data.x } };
}

// A Stripe checkout for a bundle. The webhook makes or finds the buyer's
// account by the checkout email (metadata offer "bundle"); with an email,
// checkout is locked to it. The session ends with the link where it can:
// Stripe needs at least 30 minutes and allows at most 24 hours.
export async function createBundleCheckoutSession(stripe: Stripe, link: BundleLink): Promise<Stripe.Checkout.Session> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Math.min(now + 24 * 60 * 60 - 60, Math.max(now + 31 * 60, link.expiresAt));
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: await bundlePriceId(stripe, link.plan), quantity: 1 }],
    customer_email: link.email || undefined,
    customer_creation: "always",
    invoice_creation: { enabled: true },
    metadata: { offer: "bundle", plan: link.plan },
    expires_at: expiresAt,
    success_url: `${site}/purchased`,
    cancel_url: `${site}/`,
  });
}

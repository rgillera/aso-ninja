import type Stripe from "stripe";

// Bundles: 12 months of Pro or Pro+ plus 1 month of service, paid once and
// sold on a call. The admin Bundle Links page makes a checkout link per
// buyer; the Stripe webhook turns the payment into an account and plan.
export type BundlePlan = "pro" | "pro_plus";

export const BUNDLES: Record<BundlePlan, { label: string; name: string; amountCents: number }> = {
  pro: { label: "Pro", name: "AppASO Pro Bundle", amountCents: 49000 },
  pro_plus: { label: "Pro+", name: "AppASO Pro+ Bundle", amountCents: 149000 },
};

export function isBundlePlan(value: unknown): value is BundlePlan {
  return value === "pro" || value === "pro_plus";
}

// The Stripe price for a bundle, found by lookup key or made the first time
// it's needed, so neither test nor live mode needs setting up by hand. The
// amount is part of the key: changing it in BUNDLES makes a new price
// instead of changing what earlier links charge.
export async function bundlePriceId(stripe: Stripe, plan: BundlePlan): Promise<string> {
  const bundle = BUNDLES[plan];
  const lookupKey = `bundle_${plan}_${bundle.amountCents}`;
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (found.data[0]) return found.data[0].id;

  const price = await stripe.prices.create(
    {
      currency: "usd",
      unit_amount: bundle.amountCents,
      lookup_key: lookupKey,
      product_data: { name: bundle.name, metadata: { plan } },
      metadata: { plan },
    },
    { idempotencyKey: `bundle-price-${lookupKey}` }
  );
  return price.id;
}

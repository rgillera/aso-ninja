import type Stripe from "stripe";

// Bundles: 12 months of Pro or Pro+ plus 1 month of service, paid once and
// sold on a call. The admin Bundle Links page makes a checkout link per
// buyer; the Stripe webhook turns the payment into an account and plan.
export type BundlePlan = "pro" | "pro_plus";

// name and description are what the buyer sees at checkout and on the
// receipt; changing them here renames the Stripe product on the next link.
export const BUNDLES: Record<BundlePlan, { label: string; name: string; description: string; amountCents: number }> = {
  pro: {
    label: "Pro",
    name: "AppASO Pro Annual + Growth Strategy",
    description: "12 months of AppASO Pro, plus a full review of your app, a 1:1 strategy call within 7 days, and 1 month of support from your growth specialist.",
    amountCents: 49000,
  },
  pro_plus: {
    label: "Pro+",
    name: "AppASO Pro+ Annual + Growth Strategy",
    description: "12 months of AppASO Pro+, plus a full review of your app, a 1:1 strategy call within 7 days, and 1 month of support from your growth specialist.",
    amountCents: 149000,
  },
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
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1, expand: ["data.product"] });
  const existing = found.data[0];
  if (existing) {
    const product = existing.product as Stripe.Product;
    if (product.name !== bundle.name || product.description !== bundle.description) {
      await stripe.products.update(product.id, { name: bundle.name, description: bundle.description });
    }
    return existing.id;
  }

  // Product first: a price's inline product_data can't carry a description.
  const product = await stripe.products.create(
    { name: bundle.name, description: bundle.description, metadata: { plan } },
    { idempotencyKey: `bundle-product-${lookupKey}` }
  );
  const price = await stripe.prices.create(
    { product: product.id, currency: "usd", unit_amount: bundle.amountCents, lookup_key: lookupKey, metadata: { plan } },
    { idempotencyKey: `bundle-price-${lookupKey}` }
  );
  return price.id;
}

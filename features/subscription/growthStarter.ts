"use server";

import { after } from "next/server";
import { createClient, isImpersonating } from "@/libs/supabase/server";
import { VIEW_ONLY_ERROR } from "@/libs/admin/impersonation";
import { createStripeClient } from "@/libs/stripe/server";
import { recordUserEvent } from "@/libs/analytics/events";

// The Growth Starter ($500, 12 months of Pro plus onboarding and a strategy
// session) is a one-time payment, so checkout shows no "billed annually".
// After payment the webhook gives the buyer a Pro subscription in a 12-month
// trial that cancels at its end. That keeps plan expiry on the usual webhook
// path instead of a separate end date.
// Errors "signed_out" and "subscribed" are codes the checkout route redirects on.
export async function createGrowthStarterCheckoutAction(): Promise<{ url: string } | { error: string }> {
  if (await isImpersonating()) return { error: VIEW_ONLY_ERROR };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "signed_out" };

  const priceId = process.env.STRIPE_GROWTH_STARTER_PRICE_ID;
  if (!priceId) return { error: "unavailable" };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  // A second Stripe subscription would overwrite this one's row while it
  // keeps billing, so paid subscribers are handled by hand for now.
  if (subscription?.stripe_subscription_id && subscription.status !== "canceled") {
    return { error: "subscribed" };
  }

  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: subscription?.stripe_customer_id ?? undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : user.email,
    // The webhook needs a customer to put the Pro subscription on.
    customer_creation: subscription?.stripe_customer_id ? undefined : "always",
    invoice_creation: { enabled: true },
    client_reference_id: user.id,
    // No promo code box: the Starter is sold on a call, and Pro's codes
    // would otherwise apply to it too.
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { user_id: user.id, offer: "growth_starter" },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/growth-starter?purchased=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/growth-starter`,
  });

  if (!session.url) return { error: "Failed to create checkout session." };
  after(() => recordUserEvent(user.id, "checkout_started", { props: { plan: "pro", offer: "growth_starter" }, ref: session.id }));
  return { url: session.url };
}

"use server";

import { after } from "next/server";
import { createClient, isImpersonating } from "@/libs/supabase/server";
import { VIEW_ONLY_ERROR } from "@/libs/admin/impersonation";
import { createStripeClient } from "@/libs/stripe/server";
import { recordUserEvent } from "@/libs/analytics/events";
import { checkGrowthStarterOfferToken } from "@/libs/stripe/growth-starter-offer";

// The Growth Starter ($500, onboarding plus a strategy session) is a
// one-time payment, so checkout shows no "billed annually". It comes with
// 3 months of Pro, or 12 months when bought through a Pro bonus link before
// its deadline (libs/stripe/growth-starter-offer.ts). The webhook gives the
// buyer a Pro subscription in a trial of that length that cancels at its
// end, which keeps plan expiry on the usual webhook path instead of a
// separate end date. pro_days in the session metadata says how long.
// Signed-out visitors go straight to Stripe as guests: Stripe collects the
// email, and the webhook finds or creates the account for it
// (resolveGrowthStarterBuyer). Errors "subscribed" and "offer_expired" are
// codes the checkout route redirects on.
export async function createGrowthStarterCheckoutAction(
  offerToken?: string | null
): Promise<{ url: string } | { error: string }> {
  if (await isImpersonating()) return { error: VIEW_ONLY_ERROR };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A link that came with a token but no longer grants Pro sends the buyer
  // back to the page rather than charging them for less than they were shown.
  let proBonus = false;
  if (offerToken) {
    const check = checkGrowthStarterOfferToken(offerToken);
    if (check.status !== "valid") return { error: "offer_expired" };
    proBonus = true;
  }

  const priceId = process.env.STRIPE_GROWTH_STARTER_PRICE_ID;
  if (!priceId) return { error: "unavailable" };

  const { data: subscription } = user
    ? await supabase
        .from("subscriptions")
        .select("stripe_customer_id, stripe_subscription_id, status")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  // A granted Pro subscription would overwrite a paid one's row while that
  // keeps billing. Paid subscribers already have Pro, so they buy the calls
  // alone, and get the bonus year by hand for now.
  const isPaid = !!subscription?.stripe_subscription_id && subscription.status !== "canceled";
  if (proBonus && isPaid) return { error: "subscribed" };
  const proDays = proBonus ? 365 : isPaid ? 0 : 90;

  const stripe = createStripeClient();
  // A Stripe error (say, a test-mode price under the live key) would
  // otherwise surface as a bare 500 from the checkout route.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: subscription?.stripe_customer_id ?? undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : user?.email,
    // The webhook needs a customer to put the Pro subscription on.
    customer_creation: subscription?.stripe_customer_id ? undefined : "always",
    invoice_creation: { enabled: true },
    client_reference_id: user?.id,
    // No promo code box: the Starter is sold on a call, and Pro's codes
    // would otherwise apply to it too.
    line_items: [{ price: priceId, quantity: 1 }],
    // pro_days is always set, so the webhook can tell these from sessions
    // created before it existed (those were sold with 12 months).
    // No user_id for a guest: the webhook keys the account on the email.
    metadata: {
      ...(user ? { user_id: user.id } : { guest: "1" }),
      offer: "growth_starter",
      pro_bonus: proBonus ? "1" : "0",
      pro_days: String(proDays),
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/growth-starter?purchased=1${proDays ? "&pro=1" : ""}${user ? "" : "&guest=1"}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/growth-starter${proBonus ? `?offer=${encodeURIComponent(offerToken!)}` : ""}`,
  }).catch((err: unknown) => {
    console.error("Growth Starter checkout failed:", err);
    return null;
  });

  if (!session?.url) return { error: "Failed to create checkout session." };
  if (user) after(() => recordUserEvent(user.id, "checkout_started", { props: { plan: "pro", offer: "growth_starter", pro_bonus: proBonus, pro_days: proDays }, ref: session.id }));
  return { url: session.url };
}

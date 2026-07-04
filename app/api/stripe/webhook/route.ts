import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createStripeClient } from "@/libs/stripe/server";
import { createAdminClient } from "@/libs/supabase/admin";

const RELEVANT_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
]);

async function upsertFromStripeSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  userId?: string
) {
  const priceId = subscription.items.data[0]?.price.id;
  const periodEnd = subscription.items.data[0]?.current_period_end;

  let planId: string | undefined;
  if (priceId) {
    const { data: plan } = await admin
      .from("plans")
      .select("id")
      .or(`stripe_price_id.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
      .maybeSingle();
    planId = plan?.id;
  }

  const status =
    subscription.status === "unpaid" ? "past_due" : subscription.status;

  const row: Record<string, unknown> = {
    stripe_customer_id:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
  if (planId) row.plan_id = planId;
  if (userId) row.user_id = userId;

  if (userId) {
    await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
  } else {
    await admin
      .from("subscriptions")
      .update(row)
      .eq("stripe_subscription_id", subscription.id);
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const stripe = createStripeClient();
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (!RELEVANT_EVENTS.has(event.type)) return NextResponse.json({ received: true });

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id ?? undefined;
      if (session.subscription && userId) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id
        );
        await upsertFromStripeSubscription(admin, subscription, userId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertFromStripeSubscription(admin, subscription);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      if (subscriptionId) {
        await admin
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq(
            "stripe_subscription_id",
            typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id
          );
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

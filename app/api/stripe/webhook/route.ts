import { NextRequest, NextResponse, after } from "next/server";
import Stripe from "stripe";
import { createStripeClient } from "@/libs/stripe/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { recordUserEvent } from "@/libs/analytics/events";
import { getResendClient } from "@/libs/resend";
import {
  growthStarterAlertSubject,
  renderGrowthStarterAlertHtml,
  renderGrowthStarterAlertText,
  type GrowthStarterPurchase,
} from "@/libs/email/growth-starter-alert";
import {
  growthStarterWelcomeSubject,
  renderGrowthStarterWelcomeHtml,
  renderGrowthStarterWelcomeText,
} from "@/libs/email/growth-starter-welcome";

const FROM = "AppASO <hello@appaso.io>";
const ALERT_TO = "hello@appaso.io";

const YEAR_SECONDS = 365 * 24 * 60 * 60;

// The Growth Starter is paid once, so its year of Pro is a Pro yearly
// subscription in a 12-month trial that cancels when the trial ends: no card
// on file, nothing ever charged, and expiry comes through the usual
// customer.subscription.deleted. Keyed on the session so a webhook retry
// returns the same subscription instead of creating a second one.
async function grantGrowthStarterPro(
  stripe: Stripe,
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) throw new Error(`Growth Starter session ${session.id} has no customer`);

  const { data: pro } = await admin.from("plans").select("stripe_price_id_yearly").eq("slug", "pro").single();
  if (!pro?.stripe_price_id_yearly) throw new Error("Pro plan has no yearly Stripe price");

  return stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: pro.stripe_price_id_yearly }],
      trial_end: session.created + YEAR_SECONDS,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      cancel_at_period_end: true,
      metadata: { offer: "growth_starter", checkout_session: session.id },
    },
    { idempotencyKey: `growth-starter-${session.id}` }
  );
}

// After a Growth Starter purchase: the buyer gets the onboarding booking
// link, and the team gets an alert. Runs in after(); a failed send is
// logged, never fails the webhook.
async function sendGrowthStarterEmails(purchase: GrowthStarterPurchase) {
  const resend = getResendClient();
  const sends = [
    resend.emails.send({
      from: FROM,
      to: ALERT_TO,
      replyTo: purchase.email ?? undefined,
      subject: growthStarterAlertSubject(purchase),
      html: renderGrowthStarterAlertHtml(purchase),
      text: renderGrowthStarterAlertText(purchase),
    }),
  ];
  if (purchase.email) {
    sends.push(
      resend.emails.send({
        from: FROM,
        to: purchase.email,
        subject: growthStarterWelcomeSubject,
        html: renderGrowthStarterWelcomeHtml(purchase.name),
        text: renderGrowthStarterWelcomeText(purchase.name),
      })
    );
  }

  for (const result of await Promise.allSettled(sends)) {
    if (result.status === "rejected") console.error("Growth Starter email failed:", result.reason);
    else if (result.value.error) console.error("Growth Starter email failed:", result.value.error);
  }
}

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
  // Only ever set this to true, never back to false — it marks that a trial
  // was used at all, ever, not the state of the current subscription.
  if (subscription.trial_start) row.has_used_trial = true;

  let effectiveUserId = userId;
  if (userId) {
    await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
  } else {
    await admin
      .from("subscriptions")
      .update(row)
      .eq("stripe_subscription_id", subscription.id);

    const { data: existing } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();
    effectiveUserId = existing?.user_id;
  }

  if (effectiveUserId) {
    await admin.rpc("reconcile_plan_limits", { p_user_id: effectiveUserId });
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
      if (session.mode === "payment" && session.metadata?.offer === "growth_starter" && userId) {
        if (session.payment_status !== "paid") break;
        const subscription = await grantGrowthStarterPro(stripe, admin, session);
        await upsertFromStripeSubscription(admin, subscription, userId);
        after(() =>
          sendGrowthStarterEmails({
            email: session.customer_details?.email ?? session.customer_email ?? null,
            name: session.customer_details?.name ?? null,
            amountCents: session.amount_total,
            currency: session.currency,
            sessionId: session.id,
          })
        );
        after(() =>
          recordUserEvent(userId, "checkout_completed", {
            props: { plan_id: null, billing: null, offer: "growth_starter" },
            ref: session.id,
          })
        );
      } else if (session.subscription && userId) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id
        );
        await upsertFromStripeSubscription(admin, subscription, userId);
        after(() =>
          recordUserEvent(userId, "checkout_completed", {
            props: { plan_id: session.metadata?.plan_id ?? null, billing: session.metadata?.billing ?? null },
            ref: session.id,
          })
        );
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
        const stripeSubscriptionId =
          typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id;

        await admin
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", stripeSubscriptionId);

        const { data: existing } = await admin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", stripeSubscriptionId)
          .maybeSingle();

        if (existing?.user_id) {
          await admin.rpc("reconcile_plan_limits", { p_user_id: existing.user_id });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

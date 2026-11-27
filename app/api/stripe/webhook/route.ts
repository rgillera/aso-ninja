import { NextRequest, NextResponse, after } from "next/server";
import Stripe from "stripe";
import { createStripeClient } from "@/libs/stripe/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { recordUserEvent } from "@/libs/analytics/events";
import { getResendClient } from "@/libs/resend";
import {
  bundleAlertSubject,
  renderBundleAlertHtml,
  renderBundleAlertText,
  type BundlePurchase,
} from "@/libs/email/bundle-alert";
import {
  bundleWelcomeSubject,
  renderBundleWelcomeHtml,
  renderBundleWelcomeText,
  type BundleAccount,
} from "@/libs/email/bundle-welcome";
import { BUNDLES, isBundlePlan, type BundlePlan } from "@/libs/stripe/bundles";

const FROM = "AppASO <hello@appaso.io>";
const ALERT_TO = "hello@appaso.io";

const DAY_SECONDS = 24 * 60 * 60;
const BUNDLE_DAYS = 365;

// Bundles (12 months of Pro or Pro+ plus 1 month of service) are paid once
// without signing up first, through a checkout link from the admin Bundle
// Links page (session metadata offer "bundle" and plan), or a Stripe Payment
// Link whose metadata has plan = "pro" or "pro_plus" (Stripe copies it onto
// the session; the link itself is read too, in case it didn't). Payment
// Links without that metadata aren't bundles and are left alone.
async function bundlePlan(stripe: Stripe, session: Stripe.Checkout.Session): Promise<BundlePlan | null> {
  if (session.mode !== "payment") return null;
  if (session.metadata?.offer === "bundle") return isBundlePlan(session.metadata.plan) ? session.metadata.plan : null;
  if (!session.payment_link) return null;
  let plan = session.metadata?.plan;
  if (!plan) {
    const linkId = typeof session.payment_link === "string" ? session.payment_link : session.payment_link.id;
    plan = (await stripe.paymentLinks.retrieve(linkId)).metadata?.plan;
  }
  return isBundlePlan(plan) ? plan : null;
}

// A Payment Link only makes a customer when set to, so one is made here if
// the session has none; the plan's subscription needs it. Keyed on the
// session so a webhook retry reuses it.
async function bundleCustomer(stripe: Stripe, session: Stripe.Checkout.Session, email: string): Promise<string> {
  const id = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (id) return id;
  const customer = await stripe.customers.create(
    { email, name: session.customer_details?.name ?? undefined, metadata: { checkout_session: session.id } },
    { idempotencyKey: `bundle-customer-${session.id}` }
  );
  return customer.id;
}

// The bundle is paid once, so its plan is a yearly subscription on that plan
// in a 12-month trial that cancels when the trial ends: no card on file,
// nothing ever charged, and expiry comes through the usual
// customer.subscription.deleted. Keyed on the session so a webhook retry
// returns the same subscription instead of creating a second one.
async function grantBundlePlan(
  stripe: Stripe,
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
  customerId: string,
  plan: BundlePlan
) {
  const { data: row } = await admin.from("plans").select("stripe_price_id_yearly").eq("slug", plan).single();
  if (!row?.stripe_price_id_yearly) throw new Error(`${plan} plan has no yearly Stripe price`);

  return stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: row.stripe_price_id_yearly }],
      trial_end: session.created + BUNDLE_DAYS * DAY_SECONDS,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      cancel_at_period_end: true,
      metadata: { offer: "bundle", checkout_session: session.id },
    },
    { idempotencyKey: `bundle-${session.id}` }
  );
}

// The buyer has only the email typed into Stripe. A new email gets an
// account through an invite link (not emailed by Supabase: the link goes in
// our welcome email, and lands on /auth/invite to set a name and password).
// A known email reuses its account; generating a magic link is just how to
// read its id, and that link is thrown away. Webhook retries land on the
// "already registered" path, so they never create a second account.
async function resolveBuyer(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  name: string | null
): Promise<{ userId: string; account: BundleAccount }> {
  const invite = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/invite`,
      data: { invite_pending: true, ...(name ? { full_name: name } : {}) },
    },
  });
  if (!invite.error && invite.data.user) {
    return { userId: invite.data.user.id, account: { kind: "new", setupUrl: invite.data.properties.action_link } };
  }

  const existing = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (existing.error || !existing.data.user) {
    throw new Error(`Bundle buyer ${email}: ${invite.error?.message ?? ""} / ${existing.error?.message ?? "no user"}`);
  }
  return { userId: existing.data.user.id, account: { kind: "existing" } };
}

// After a bundle purchase: the buyer gets the welcome email (with their
// account setup link if new), and the team gets an alert. Runs in after();
// a failed send is logged, never fails the webhook.
async function sendBundleEmails(purchase: BundlePurchase) {
  const resend = getResendClient();
  const results = await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: ALERT_TO,
      replyTo: purchase.email,
      subject: bundleAlertSubject(purchase),
      html: renderBundleAlertHtml(purchase),
      text: renderBundleAlertText(purchase),
    }),
    resend.emails.send({
      from: FROM,
      to: purchase.email,
      subject: bundleWelcomeSubject,
      html: renderBundleWelcomeHtml(purchase.name, purchase.planName, purchase.planGranted, purchase.account),
      text: renderBundleWelcomeText(purchase.name, purchase.planName, purchase.planGranted, purchase.account),
    }),
  ]);
  for (const result of results) {
    if (result.status === "rejected") console.error("Bundle email failed:", result.reason);
    else if (result.value.error) console.error("Bundle email failed:", result.value.error);
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
      const plan = await bundlePlan(stripe, session);
      if (plan) {
        const buyerEmail = session.customer_details?.email ?? session.customer_email ?? null;
        if (session.payment_status !== "paid") break;
        if (!buyerEmail) throw new Error(`Bundle session ${session.id} has no email`);
        const buyerName = session.customer_details?.name ?? null;
        const buyer = await resolveBuyer(admin, buyerEmail, buyerName);
        // A paying subscriber keeps their subscription: granting the bundle
        // would overwrite its row while it keeps billing, so the alert says
        // to set it up by hand. A trialing one is an earlier bundle or
        // Growth Starter (or this one, on a webhook retry), never billed, so
        // the new bundle replaces it.
        const { data: current } = await admin
          .from("subscriptions")
          .select("stripe_subscription_id, status")
          .eq("user_id", buyer.userId)
          .maybeSingle();
        const isPaid = !!current?.stripe_subscription_id && (current.status === "active" || current.status === "past_due");
        if (!isPaid) {
          const customerId = await bundleCustomer(stripe, session, buyerEmail);
          const subscription = await grantBundlePlan(stripe, admin, session, customerId, plan);
          await upsertFromStripeSubscription(admin, subscription, buyer.userId);
        }
        after(() =>
          sendBundleEmails({
            email: buyerEmail,
            name: buyerName,
            amountCents: session.amount_total,
            currency: session.currency,
            sessionId: session.id,
            planName: BUNDLES[plan].label,
            planGranted: !isPaid,
            account: buyer.account,
          })
        );
        after(() =>
          recordUserEvent(buyer.userId, "checkout_completed", {
            props: { plan_id: null, billing: null, offer: "bundle", pro_plan: plan, plan_granted: !isPaid },
            ref: session.id,
          })
        );
      } else if (session.subscription && userId) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id
        );
        const subscriberId = userId;
        await upsertFromStripeSubscription(admin, subscription, subscriberId);
        after(() =>
          recordUserEvent(subscriberId, "checkout_completed", {
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

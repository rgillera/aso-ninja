"use server";

import { createClient } from "@/libs/supabase/server";
import { createStripeClient } from "@/libs/stripe/server";
import type { Plan, WorkspaceUsage, PlanSlug } from "@/libs/contracts";

export type PendingCancellation = { currentPeriodEnd: string | null } | null;

export async function getWorkspacePlanState(
  workspaceId: string
): Promise<{ plan: Plan; usage: WorkspaceUsage; pendingCancellation: PendingCancellation } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plan, error: planError }, { data: usage, error: usageError }, { data: subscription }] =
    await Promise.all([
      supabase.rpc("get_workspace_plan", { p_workspace_id: workspaceId }).single(),
      supabase.rpc("get_workspace_usage", { p_workspace_id: workspaceId }).single(),
      user
        ? supabase
            .from("subscriptions")
            .select("cancel_at_period_end, current_period_end")
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  if (planError || !plan) return { error: planError?.message ?? "Failed to load plan." };
  if (usageError || !usage) return { error: usageError?.message ?? "Failed to load usage." };

  return {
    plan: plan as Plan,
    usage: usage as WorkspaceUsage,
    pendingCancellation: subscription?.cancel_at_period_end
      ? { currentPeriodEnd: subscription.current_period_end }
      : null,
  };
}

// Downgrading to Free doesn't cancel immediately — it schedules the existing
// Stripe subscription to cancel at the end of the current billing period.
// The subscriptions row itself is updated by the Stripe webhook, not here.
export async function cancelSubscriptionAction(
  reason: string,
  recommendation?: string
): Promise<{ currentPeriodEnd: string | null } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in to change your plan." };
  if (!reason.trim()) return { error: "Please tell us why you're leaving." };

  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("plan_id, stripe_subscription_id, cancel_at_period_end, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subError) return { error: subError.message };
  if (!subscription?.stripe_subscription_id) {
    return { error: "You don't have an active paid subscription to cancel." };
  }

  await supabase.from("cancellation_feedback").insert({
    user_id: user.id,
    plan_id: subscription.plan_id,
    reason,
    recommendation: recommendation?.trim() || null,
  });

  if (subscription.cancel_at_period_end) {
    return { currentPeriodEnd: subscription.current_period_end };
  }

  const stripe = createStripeClient();
  const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  const periodEnd = updated.items.data[0]?.current_period_end;
  return {
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : subscription.current_period_end,
  };
}

export async function createCheckoutSessionAction(
  planSlug: PlanSlug,
  workspaceId: string,
  billing: "monthly" | "yearly" = "monthly"
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in to upgrade." };

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, stripe_price_id, stripe_price_id_yearly, trial_period_days")
    .eq("slug", planSlug)
    .single();

  if (planError || !plan) return { error: planError?.message ?? "Plan not found." };

  const priceId = billing === "yearly" ? plan.stripe_price_id_yearly : plan.stripe_price_id;
  if (!priceId) return { error: "This plan isn't available for checkout yet." };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const stripe = createStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: subscription?.stripe_customer_id ?? undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : user.email,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { user_id: user.id, plan_id: plan.id, workspace_id: workspaceId, billing },
    subscription_data: plan.trial_period_days
      ? { trial_period_days: plan.trial_period_days }
      : undefined,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription?canceled=1`,
  });

  if (!session.url) return { error: "Failed to create checkout session." };
  return { url: session.url };
}

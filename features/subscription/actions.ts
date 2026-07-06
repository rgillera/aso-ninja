"use server";

import { createClient } from "@/libs/supabase/server";
import { createStripeClient } from "@/libs/stripe/server";
import type { Plan, WorkspaceUsage, PlanSlug } from "@/libs/contracts";

export async function getWorkspacePlanState(
  workspaceId: string
): Promise<{ plan: Plan; usage: WorkspaceUsage } | { error: string }> {
  const supabase = await createClient();

  const [{ data: plan, error: planError }, { data: usage, error: usageError }] =
    await Promise.all([
      supabase.rpc("get_workspace_plan", { p_workspace_id: workspaceId }).single(),
      supabase.rpc("get_workspace_usage", { p_workspace_id: workspaceId }).single(),
    ]);

  if (planError || !plan) return { error: planError?.message ?? "Failed to load plan." };
  if (usageError || !usage) return { error: usageError?.message ?? "Failed to load usage." };

  return { plan: plan as Plan, usage: usage as WorkspaceUsage };
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
    .select("id, stripe_price_id, stripe_price_id_yearly")
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
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription?canceled=1`,
  });

  if (!session.url) return { error: "Failed to create checkout session." };
  return { url: session.url };
}

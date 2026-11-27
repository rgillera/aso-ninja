import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { createStripeClient } from "@/libs/stripe/server";
import SubscriptionPage from "@/features/subscription/SubscriptionPage";
import { SubscriptionPageViewTracker } from "@/features/activity/SubscriptionPageViewTracker";
import type { Workspace } from "@/libs/contracts";

type PageProps = { searchParams: Promise<{ ws?: string }> };

// True when the user's Stripe subscription is on a price their plan no longer
// sells, i.e. they subscribed before the current prices went live and keep
// their old price. Anyone who subscribes or switches plans now gets the
// current price, so they don't see the new-pricing note.
async function isOnLegacyPrice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  planSlug: string
) {
  const [{ data: subscription }, { data: plan }] = await Promise.all([
    supabase.from("subscriptions").select("stripe_subscription_id").eq("user_id", userId).maybeSingle(),
    supabase.from("plans").select("stripe_price_id, stripe_price_id_yearly").eq("slug", planSlug).maybeSingle(),
  ]);
  if (!subscription?.stripe_subscription_id || !plan) return false;

  try {
    const stripeSubscription = await createStripeClient().subscriptions.retrieve(subscription.stripe_subscription_id);
    const priceId = stripeSubscription.items.data[0]?.price.id;
    return !!priceId && priceId !== plan.stripe_price_id && priceId !== plan.stripe_price_id_yearly;
  } catch (error) {
    console.error("Failed to load Stripe subscription for pricing note:", error);
    return false;
  }
}

export default async function Page({ searchParams }: PageProps) {
  const { ws: wsParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });
  const allWorkspaces = (workspaces ?? []) as Workspace[];
  const activeWorkspaceId = allWorkspaces.find((w) => w.id === wsParam)?.id ?? allWorkspaces[0]?.id;

  if (!activeWorkspaceId) {
    return (
      <>
        <SubscriptionPageViewTracker />
        <SubscriptionPage currentPlanId="free" workspaceId="" />
      </>
    );
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", activeWorkspaceId)
    .eq("user_id", user?.id ?? "")
    .single();

  if (membership?.role !== "owner") redirect("/dashboard");

  const state = await getWorkspacePlanState(activeWorkspaceId);
  const trialEndsAt = "error" in state ? null : state.trialEndsAt;
  const showPriceLockNote =
    !("error" in state) && !trialEndsAt && state.plan.slug !== "free" && !!user
      ? await isOnLegacyPrice(supabase, user.id, state.plan.slug)
      : false;

  return (
    <>
      <SubscriptionPageViewTracker />
      <SubscriptionPage
        // The trial reads as Pro everywhere else, but billing-wise they're
        // still on Free, so Pro's card has to offer the upgrade.
        currentPlanId={"error" in state || trialEndsAt ? "free" : state.plan.slug}
        trialEndsAt={trialEndsAt}
        canStartTrial={"error" in state ? false : state.canStartTrial}
        workspaceId={activeWorkspaceId}
        usage={"error" in state ? undefined : state.usage}
        pendingCancellation={"error" in state ? null : state.pendingCancellation}
        showPriceLockNote={showPriceLockNote}
      />
    </>
  );
}

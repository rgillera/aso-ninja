import { createAdminClient } from "@/libs/supabase/admin";
import { createStripeClient } from "@/libs/stripe/server";

// Server-only — never import this from client components.
//
// Permanently deletes a user and everything they own. Shared by the
// self-serve delete in Account Settings and the super admin Users page so
// both always remove exactly the same data. Order matters: stop billing
// first (so a failure never leaves a charged customer with no account), then
// drop owned workspaces (apps, keywords, rankings, credentials etc. all
// cascade from workspaces), then the auth user itself, which cascades
// profiles, subscriptions, memberships in other people's workspaces, push
// subscriptions, certifications and the rest.
export async function deleteUserAndData(userId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { data: subscription, error: subError } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (subError) return { error: subError.message };

  if (subscription?.stripe_subscription_id) {
    try {
      const stripe = createStripeClient();
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      if (stripeSub.status !== "canceled" && stripeSub.status !== "incomplete_expired") {
        await stripe.subscriptions.cancel(stripeSub.id);
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "resource_missing") {
        return { error: "Couldn't cancel the Stripe subscription, so the account was not deleted. Please try again or contact support." };
      }
    }
  }

  const { data: owned, error: ownedError } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("role", "owner");
  if (ownedError) return { error: ownedError.message };

  const ownedIds = (owned ?? []).map((row) => row.workspace_id as string);
  if (ownedIds.length > 0) {
    const { error } = await admin.from("workspaces").delete().in("id", ownedIds);
    if (error) return { error: error.message };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return { error: deleteError.message };

  return {};
}

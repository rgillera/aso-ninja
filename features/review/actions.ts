"use server";

import { createRealUserClient, isImpersonating } from "@/libs/supabase/server";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { PlanSlug } from "@/libs/contracts";

const MIN_TRACKED_KEYWORDS = 10;
const SNOOZE_DAYS = 30;
const MAX_DISMISSALS = 2;

export type ReviewPromptState = { eligible: false } | { eligible: true; signedUpAt: string };

// Eligibility for the Trustpilot review card, minus the "came back on a
// later day" check: that's done client-side against signedUpAt so it uses
// the viewer's own calendar day, not the server's.
export async function getReviewPromptStateAction(): Promise<ReviewPromptState> {
  if (await isImpersonating()) return { eligible: false };
  const supabase = await createRealUserClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { eligible: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("review_prompt_clicked_at, review_prompt_dismissed_at, review_prompt_dismiss_count")
    .eq("id", user.id)
    .single();
  if (!profile || profile.review_prompt_clicked_at) return { eligible: false };
  if (profile.review_prompt_dismiss_count >= MAX_DISMISSALS) return { eligible: false };
  if (
    profile.review_prompt_dismissed_at &&
    Date.now() - new Date(profile.review_prompt_dismissed_at).getTime() < SNOOZE_DAYS * 86_400_000
  ) {
    return { eligible: false };
  }

  // Only users who've seen the full product: Pro and up, signup trial
  // included (get_effective_plan reads as Pro during it). Not Free.
  const { data: plan } = await supabase.rpc("get_effective_plan", { p_user_id: user.id }).single<{ slug: PlanSlug }>();
  if (!plan || !isPlanAtLeast(plan.slug, "pro")) return { eligible: false };

  // RLS scopes this to apps in every workspace the user belongs to.
  const { count } = await supabase.from("app_keywords").select("id", { count: "exact", head: true });
  if ((count ?? 0) < MIN_TRACKED_KEYWORDS) return { eligible: false };

  return { eligible: true, signedUpAt: user.created_at };
}

// Called when the card actually renders. Only the first showing is kept;
// the follow-up email is timed from it.
export async function markReviewPromptShownAction(): Promise<void> {
  if (await isImpersonating()) return;
  const supabase = await createRealUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ review_prompt_shown_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("review_prompt_shown_at", null);
}

export async function markReviewPromptClickedAction(): Promise<void> {
  if (await isImpersonating()) return;
  const supabase = await createRealUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ review_prompt_clicked_at: new Date().toISOString() })
    .eq("id", user.id);
}

export async function dismissReviewPromptAction(): Promise<void> {
  if (await isImpersonating()) return;
  const supabase = await createRealUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("review_prompt_dismiss_count")
    .eq("id", user.id)
    .single();
  await supabase
    .from("profiles")
    .update({
      review_prompt_dismissed_at: new Date().toISOString(),
      review_prompt_dismiss_count: (profile?.review_prompt_dismiss_count ?? 0) + 1,
    })
    .eq("id", user.id);
}

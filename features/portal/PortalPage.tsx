import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import PortalNav from "./PortalNav";
import PortalHero from "./PortalHero";
import PortalHowItWorks from "./PortalHowItWorks";
import PortalFeature from "./PortalFeature";
import PortalCertification from "./PortalCertification";
import PortalPricing, { type ProTrialState } from "./PortalPricing";
import PortalTestimonials from "./PortalTestimonials";
import PortalGrowthAudit from "./PortalGrowthAudit";
import PortalFooter from "./PortalFooter";

// Drives the Pro card's trial pill: only offered to someone who can still
// claim it (signed out = signup trial, or eligible for the opt-in one).
async function getProTrialState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
): Promise<ProTrialState> {
  if (!userId) return { kind: "available" };
  const [{ data: canStart }, { data: sub }] = await Promise.all([
    supabase.rpc("can_start_pro_trial"),
    supabase.from("subscriptions").select("pro_trial_ends_at").eq("user_id", userId).maybeSingle(),
  ]);
  const endsAt = (sub?.pro_trial_ends_at as string | null | undefined) ?? null;
  if (endsAt && new Date(endsAt).getTime() > Date.now()) return { kind: "active", endsAt };
  return canStart === true ? { kind: "available" } : { kind: "none" };
}

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  const proTrial = await getProTrialState(supabase, user?.id ?? null);

  // Social proof: a 3,000 baseline plus every registered account. profiles is
  // RLS-scoped per user, so count through the service-role client.
  const { count: registeredUsers } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const trustedByCount = 3000 + (registeredUsers ?? 0);

  return (
    <div className="bg-white">
      <PortalNav isAuthenticated={isAuthenticated} />
      <PortalHero isAuthenticated={isAuthenticated} trustedByCount={trustedByCount} />
      <PortalHowItWorks />
      <PortalFeature />
      <PortalCertification isAuthenticated={isAuthenticated} />
      <PortalPricing isAuthenticated={isAuthenticated} proTrial={proTrial} />
      <PortalTestimonials />
      <PortalGrowthAudit />
      <PortalFooter />
    </div>
  );
}

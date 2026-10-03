"use server";

import { createClient, isImpersonating } from "@/libs/supabase/server";
import { VIEW_ONLY_ERROR } from "@/libs/admin/impersonation";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { Plan } from "@/libs/contracts";

export type CertificationRecord = {
  certificateId: string;
  score: number;
  total: number;
  issuedAt: string;
};

function generateCertificateId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

/**
 * Records a passed exam attempt for the current user. Scoring happens
 * client-side (see CertificationExam.tsx); this is a persistence record,
 * not a grading authority — see the certifications migration for that
 * tradeoff.
 */
export async function recordCertificationAction(input: {
  score: number;
  total: number;
}): Promise<{ record: CertificationRecord } | { error: string }> {
  if (await isImpersonating()) return { error: VIEW_ONLY_ERROR };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // The exam is a Pro feature. CertificationExam.tsx locks the button, but
  // that's client-side only — re-check here so a lower plan can't record a
  // pass by calling this action directly. A certification belongs to the
  // person, not a workspace, so any Pro-or-above workspace they can see counts.
  const { data: workspaces } = await supabase.from("workspaces").select("id");
  const plans = await Promise.all(
    (workspaces ?? []).map((w) => supabase.rpc("get_workspace_plan", { p_workspace_id: w.id }).single())
  );
  const hasPro = plans.some(({ data: plan }) => !!plan && isPlanAtLeast((plan as Plan).slug, "pro"));
  if (!hasPro) return { error: "The certification exam requires the Pro plan or above." };

  const { data, error } = await supabase
    .from("certifications")
    .insert({
      user_id: user.id,
      certificate_id: generateCertificateId(),
      score: input.score,
      total: input.total,
    })
    .select("certificate_id, score, total, issued_at")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not record certification." };

  return {
    record: {
      certificateId: data.certificate_id,
      score: data.score,
      total: data.total,
      issuedAt: data.issued_at,
    },
  };
}

/** The current user's most recent certification, or null if they've never passed. */
export async function getMyLatestCertificationAction(): Promise<CertificationRecord | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("certifications")
    .select("certificate_id, score, total, issued_at")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    certificateId: data.certificate_id,
    score: data.score,
    total: data.total,
    issuedAt: data.issued_at,
  };
}

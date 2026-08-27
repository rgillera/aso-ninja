"use server";

import { createClient } from "@/libs/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

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

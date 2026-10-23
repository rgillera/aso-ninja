import { createAdminClient } from "@/libs/supabase/admin";
import AdminCancellationsPage from "@/features/admin/AdminCancellationsPage";
import { shortPlanName, type AdminCancellationRow } from "@/features/admin/types";
import { fetchAllRows } from "@/libs/supabase/fetch-all";

export default async function Page() {
  const admin = createAdminClient();

  const [{ data: feedback, error: feedbackErr }, { data: plans, error: plansErr }] = await Promise.all([
    fetchAllRows<{ id: string; user_id: string; plan_id: string | null; reason: string; recommendation: string | null; created_at: string }>(
      (from, to) =>
        admin
          .from("cancellation_feedback")
          .select("id, user_id, plan_id, reason, recommendation, created_at")
          .order("created_at", { ascending: false })
          .range(from, to)
    ),
    admin.from("plans").select("id, name"),
  ]);
  if (feedbackErr) throw feedbackErr;
  if (plansErr) throw plansErr;

  const planNameById = new Map((plans ?? []).map((p) => [p.id, shortPlanName(p.name)]));

  // Cancellations are rare, so look up only the users who left feedback
  // rather than walking every page of auth.admin.listUsers().
  const userIds = [...new Set(feedback.map((f) => f.user_id))];
  const emails = await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      return [id, data.user?.email ?? "(no email)"] as const;
    })
  );
  const emailByUser = new Map(emails);

  const rows: AdminCancellationRow[] = feedback.map((f) => ({
    id: f.id,
    userId: f.user_id,
    email: emailByUser.get(f.user_id) ?? "(no email)",
    planName: f.plan_id ? planNameById.get(f.plan_id) ?? null : null,
    reason: f.reason,
    recommendation: f.recommendation,
    createdAt: f.created_at,
  }));

  return <AdminCancellationsPage rows={rows} />;
}

import { createAdminClient } from "@/libs/supabase/admin";
import AdminCertificationsPage from "@/features/admin/AdminCertificationsPage";
import type { AdminCertificationAttemptRow } from "@/features/admin/types";
import { fetchAllRows } from "@/libs/supabase/fetch-all";

export default async function Page() {
  const admin = createAdminClient();

  const { data: attempts, error } = await fetchAllRows<{
    id: string;
    user_id: string;
    started_at: string;
    finished_at: string | null;
    score: number | null;
    total: number;
    passed: boolean | null;
    timed_out: boolean;
  }>((from, to) =>
    admin
      .from("certification_attempts")
      .select("id, user_id, started_at, finished_at, score, total, passed, timed_out")
      .order("started_at", { ascending: false })
      .range(from, to)
  );
  if (error) throw error;

  // Same per-user lookup as the Cancellations page: only the people who
  // took the exam, not every page of auth.admin.listUsers().
  const userIds = [...new Set(attempts.map((a) => a.user_id))];
  const emails = await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      return [id, data.user?.email ?? "(no email)"] as const;
    })
  );
  const emailByUser = new Map(emails);

  const rows: AdminCertificationAttemptRow[] = attempts.map((a) => ({
    id: a.id,
    userId: a.user_id,
    email: emailByUser.get(a.user_id) ?? "(no email)",
    startedAt: a.started_at,
    finishedAt: a.finished_at,
    score: a.score,
    total: a.total,
    passed: a.passed,
    timedOut: a.timed_out,
  }));

  return <AdminCertificationsPage rows={rows} />;
}

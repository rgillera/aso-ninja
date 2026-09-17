import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { fetchAllRows } from "@/libs/supabase/fetch-all";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import AgentsCrmPage from "@/features/agents/AgentsCrmPage";
import { DAILY_ACTIVITY_STATUSES, fromRow, type AgentDailyMetrics, type CrmContactRow, type CrmStatus } from "@/features/agents/types";

export default async function Page() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  const agentEmail = user?.email ?? "";

  // UTC day boundary — matches todayIso() in AgentsCrmPage, which already
  // treats "today" the same way for the overdue/due-today follow-up styling.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const [{ data, error }, { count: callsToday }, { data: statusRows }] = await Promise.all([
    // A single bulk import inserts every row in one transaction, so they can
    // all share the exact same created_at (from now()) — order() needs the
    // id tiebreaker too, or range()'s page cursor isn't stable across calls.
    fetchAllRows<CrmContactRow>((from, to) =>
      admin
        .from("crm_contacts")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    admin.from("crm_call_log").select("id", { count: "exact", head: true }).eq("agent_email", agentEmail).gte("called_at", todayStartIso),
    // Proxy for "moved into this status today": currently in one of the
    // daily-activity statuses and this agent's most recent touch was today.
    // A contact nudged through two of these statuses in one day only counts
    // once, under whichever it currently sits in — good enough for a daily
    // activity glance, not an audit log.
    admin.from("crm_contacts").select("status").eq("updated_by", agentEmail).gte("updated_at", todayStartIso).in("status", DAILY_ACTIVITY_STATUSES),
  ]);

  if (error) throw error;

  const contacts = (data as CrmContactRow[]).map(fromRow);
  // The layout already gates this route on AGENT_EMAILS — bulk import and
  // delete need the agent to also be a super admin (see requireAgentAdmin
  // in features/agents/actions.ts, which enforces this server-side too).
  const canManage = isSuperAdminEmail(user?.email);

  const statusCounts: Partial<Record<CrmStatus, number>> = {};
  for (const row of statusRows ?? []) {
    const status = row.status as CrmStatus;
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }
  const dailyMetrics: AgentDailyMetrics = { callsToday: callsToday ?? 0, statusCounts };

  return <AgentsCrmPage contacts={contacts} canManage={canManage} dailyMetrics={dailyMetrics} />;
}

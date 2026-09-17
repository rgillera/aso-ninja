import { notFound } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { fetchAllRows } from "@/libs/supabase/fetch-all";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import { getAgentEmails } from "@/libs/agents/is-agent-email";
import AgentsSummaryPage from "@/features/agents/AgentsSummaryPage";
import { DAILY_ACTIVITY_STATUSES, fromRow, type AgentDailyMetrics, type CrmContactRow, type CrmStatus } from "@/features/agents/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type PageProps = { searchParams: Promise<{ date?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // The layout only hides the nav link for non-admins — this is the actual
  // gate (same belt-and-suspenders split as requireAgentAdmin in actions.ts).
  if (!isSuperAdminEmail(user?.email)) notFound();

  const { date } = await searchParams;
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayIso();

  const dateStartIso = `${selectedDate}T00:00:00.000Z`;
  const dateEndIso = new Date(new Date(dateStartIso).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const agentEmails = getAgentEmails();

  const [{ data: contactRows, error }, { data: callRows }, { data: statusRows }] = await Promise.all([
    // Unranged .select() truncates at PostgREST's max_rows (1000, see
    // supabase/config.toml) — same fix as app/agents/page.tsx.
    fetchAllRows<CrmContactRow>((from, to) =>
      admin.from("crm_contacts").select("*").order("id", { ascending: true }).range(from, to)
    ),
    admin.from("crm_call_log").select("agent_email").gte("called_at", dateStartIso).lt("called_at", dateEndIso),
    admin
      .from("crm_contacts")
      .select("status, updated_by")
      .gte("updated_at", dateStartIso)
      .lt("updated_at", dateEndIso)
      .in("status", DAILY_ACTIVITY_STATUSES),
  ]);

  if (error) throw error;

  const contacts = (contactRows as CrmContactRow[]).map(fromRow);

  const metricsByAgent: Record<string, AgentDailyMetrics> = {};
  for (const email of agentEmails) metricsByAgent[email] = { callsToday: 0, statusCounts: {} };

  for (const row of callRows ?? []) {
    const email = row.agent_email.toLowerCase();
    if (!metricsByAgent[email]) metricsByAgent[email] = { callsToday: 0, statusCounts: {} };
    metricsByAgent[email].callsToday += 1;
  }

  for (const row of statusRows ?? []) {
    const email = (row.updated_by ?? "").toLowerCase();
    if (!email) continue;
    if (!metricsByAgent[email]) metricsByAgent[email] = { callsToday: 0, statusCounts: {} };
    const status = row.status as CrmStatus;
    metricsByAgent[email].statusCounts[status] = (metricsByAgent[email].statusCounts[status] ?? 0) + 1;
  }

  return <AgentsSummaryPage contacts={contacts} agentEmails={Object.keys(metricsByAgent).sort()} metricsByAgent={metricsByAgent} selectedDate={selectedDate} />;
}

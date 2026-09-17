import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import { getDefaultTemplate } from "@/libs/email/contact-status-update";
import AgentsSettingsPage from "@/features/agents/AgentsSettingsPage";
import { EMAIL_TRIGGER_STATUSES, type CrmStatus } from "@/features/agents/types";

export default async function Page() {
  const supabase = await createClient();
  const admin = createAdminClient();

  // The /agents layout already redirects unauthenticated users and gates on
  // AGENT_EMAILS, so a user is guaranteed here.
  const { data: { user } } = await supabase.auth.getUser();
  const canManage = isSuperAdminEmail(user?.email);

  const [{ data: settingsRow }, templateRows] = await Promise.all([
    admin.from("agent_settings").select("reply_to_email").eq("user_id", user!.id).maybeSingle(),
    // Only admins can see/edit templates — no point fetching them otherwise.
    canManage
      ? admin.from("agent_email_templates").select("status, subject, body").in("status", EMAIL_TRIGGER_STATUSES)
      : Promise.resolve({ data: null }),
  ]);

  const templateByStatus = Object.fromEntries(
    EMAIL_TRIGGER_STATUSES.map((status) => {
      const row = templateRows.data?.find((r) => r.status === status);
      const fallback = getDefaultTemplate(status);
      return [status, { subject: row?.subject ?? fallback.subject, body: row?.body ?? fallback.body }];
    })
  ) as Record<CrmStatus, { subject: string; body: string }>;

  return (
    <AgentsSettingsPage
      loginEmail={user!.email ?? ""}
      replyToEmail={settingsRow?.reply_to_email ?? ""}
      canManage={canManage}
      templates={templateByStatus}
    />
  );
}

// Agent CRM allowlist, distinct from the platform SUPER_ADMIN_EMAILS list
// (see libs/admin/is-super-admin) — not every agent is a super admin.
// Configured via AGENT_EMAILS, a comma-separated list of emails.
export function getAgentEmails(): string[] {
  return (process.env.AGENT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAgentEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAgentEmails().includes(email.trim().toLowerCase());
}

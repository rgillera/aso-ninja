// Platform-level admin allowlist, distinct from per-workspace roles
// (see libs/contracts/workspace). Configured via SUPER_ADMIN_EMAILS,
// a comma-separated list of emails.
export function superAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return superAdminEmails().includes(email.trim().toLowerCase());
}

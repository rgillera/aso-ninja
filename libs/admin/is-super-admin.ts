// Platform-level admin allowlist, distinct from per-workspace roles
// (see libs/contracts/workspace). Configured via SUPER_ADMIN_EMAILS,
// a comma-separated list of emails.
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowlist = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.trim().toLowerCase());
}

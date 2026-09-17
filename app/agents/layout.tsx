import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/libs/supabase/server";
import { isAgentEmail } from "@/libs/agents/is-agent-email";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import { AgentsShell } from "@/features/agents/AgentsShell";
import { ThemeProvider, type Theme } from "@/features/dashboard/ThemeContext";

export default async function AgentsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAgentEmail(user.email)) notFound();

  // Only super admins get the Summary tab — see app/agents/summary/page.tsx,
  // which enforces this server-side too, not just by hiding the nav link.
  const canManage = isSuperAdminEmail(user.email);

  // Same account-level preference the dashboard/admin panels read — see
  // app/admin/layout.tsx for why this reads its own cookie rather than
  // inheriting from another layout tree.
  const cookieStore = await cookies();
  const initialTheme: Theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <>
      {initialTheme === "light" && (
        <script
          dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-theme','light')` }}
        />
      )}
      <ThemeProvider initialTheme={initialTheme}>
        <AgentsShell canManage={canManage}>{children}</AgentsShell>
      </ThemeProvider>
    </>
  );
}

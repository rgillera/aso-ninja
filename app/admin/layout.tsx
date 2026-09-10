import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/libs/supabase/server";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import { AdminShell } from "@/features/admin/AdminShell";
import { ThemeProvider, type Theme } from "@/features/dashboard/ThemeContext";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) notFound();

  // Same account-level preference the dashboard reads (features/dashboard/ThemeContext.tsx)
  // — the admin panel is a separate layout tree, so it needs its own read of
  // the cookie rather than inheriting whatever DashboardShell set up.
  const cookieStore = await cookies();
  const initialTheme: Theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <>
      {/* Sets <html data-theme> before first paint so a light-theme account doesn't flash the dark styling on load — see app/dashboard/layout.tsx for the same pattern. */}
      {initialTheme === "light" && (
        <script
          dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-theme','light')` }}
        />
      )}
      <ThemeProvider initialTheme={initialTheme}>
        <AdminShell>{children}</AdminShell>
      </ThemeProvider>
    </>
  );
}

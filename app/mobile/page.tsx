import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { getEligibleWorkspaces } from "@/libs/mobile-nav";
import { WorkspacePicker } from "@/features/mobile/WorkspacePicker";

// Entry point for the mobile rankings monitor. Skips straight to a
// remembered workspace (or the only one, if there's just one) — the picker
// only shows up when there's an actual choice to make, or when explicitly
// requested via ?switch=1 (the "Switch workspace" link inside MobileMonitor
// — without this bypass, that link would just immediately redirect back to
// the same workspace via the same logic it's trying to escape).
export default async function MobilePage({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string }>;
}) {
  const { switch: forceSwitch } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const eligible = await getEligibleWorkspaces(supabase, user.id);

  if (!eligible.length) {
    return (
      <main className="mx-auto max-w-md p-6 text-center text-sm text-neutral-500">
        No workspace with ASO Intelligence access yet — open the full dashboard on the web to
        get started.
      </main>
    );
  }

  if (!forceSwitch) {
    const cookieStore = await cookies();
    const lastWorkspaceId = cookieStore.get("lastWorkspaceId")?.value;
    const remembered = eligible.find((w) => w.id === lastWorkspaceId);
    if (remembered) redirect(`/mobile/${remembered.id}`);
    if (eligible.length === 1) redirect(`/mobile/${eligible[0].id}`);
  }

  return <WorkspacePicker workspaces={eligible} />;
}

import type { Workspace } from "@/libs/contracts";

// Server-side mirror of DashboardShell's client-side fallback chain
// (explicit ?ws= switch > lastWorkspaceId cookie > oldest workspace).
// Used by every /dashboard/* server route that needs "the current workspace"
// so they can't independently drift from what the sidebar/header show as
// selected.
export function resolveActiveWorkspaceId(
  workspaces: Pick<Workspace, "id">[],
  wsParam: string | undefined,
  lastWorkspaceId: string | undefined
): string | undefined {
  return (
    workspaces.find((w) => w.id === wsParam)?.id ??
    workspaces.find((w) => w.id === lastWorkspaceId)?.id ??
    workspaces[0]?.id
  );
}

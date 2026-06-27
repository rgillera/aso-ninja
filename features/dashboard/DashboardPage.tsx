import DashboardSidebar from "./DashboardSidebar";
import MyApps from "./MyApps";
import type { App, Workspace } from "@/libs/contracts";

type Props = {
  currentPath?: string;
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  apps: App[];
};

export default function DashboardPage({ currentPath, workspaces, activeWorkspaceId, apps }: Props) {
  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <DashboardSidebar
        currentPath={currentPath}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
      />
      <main className="flex-1 overflow-y-auto">
        <MyApps apps={apps} />
      </main>
    </div>
  );
}

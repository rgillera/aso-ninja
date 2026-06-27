import MyApps from "./MyApps";
import type { App } from "@/libs/contracts";

type Props = {
  activeWorkspaceId?: string;
  apps: App[];
};

export default function DashboardPage({ activeWorkspaceId, apps }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <MyApps apps={apps} workspaceId={activeWorkspaceId ?? ""} />
    </div>
  );
}

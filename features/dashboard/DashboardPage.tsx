import MyApps from "./MyApps";
import { RecentlyViewedApps } from "./RecentlyViewedApps";
import { UpgradeBanner } from "./UpgradeBanner";
import type { App } from "@/libs/contracts";

type Props = {
  activeWorkspaceId?: string;
  apps: App[];
  connectedAppIds?: string[];
};

export default function DashboardPage({ activeWorkspaceId, apps, connectedAppIds }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      {activeWorkspaceId && <UpgradeBanner workspaceId={activeWorkspaceId} />}
      <RecentlyViewedApps apps={apps} />
      <MyApps apps={apps} workspaceId={activeWorkspaceId ?? ""} connectedAppIds={connectedAppIds ?? []} />
    </div>
  );
}

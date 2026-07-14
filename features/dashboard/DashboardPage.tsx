import MyApps from "./MyApps";
import { RecentlyViewedApps } from "./RecentlyViewedApps";
import { TrialBanner } from "./TrialBanner";
import { PLANS } from "@/features/subscription/plans";
import type { App, PlanSlug } from "@/libs/contracts";

type Props = {
  activeWorkspaceId?: string;
  apps: App[];
  planSlug?: PlanSlug;
  hasUsedTrial?: boolean;
};

export default function DashboardPage({ activeWorkspaceId, apps, planSlug, hasUsedTrial }: Props) {
  const trialDays = PLANS.find((p) => p.id === "pro")?.trialDays;

  return (
    <div className="h-full overflow-y-auto">
      {activeWorkspaceId && planSlug === "free" && !hasUsedTrial && trialDays && (
        <TrialBanner workspaceId={activeWorkspaceId} trialDays={trialDays} />
      )}
      <RecentlyViewedApps apps={apps} />
      <MyApps apps={apps} workspaceId={activeWorkspaceId ?? ""} />
    </div>
  );
}

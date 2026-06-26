import DashboardSidebar from "./DashboardSidebar";
import MyApps from "./MyApps";
import type { App } from "@/libs/contracts";

type Props = {
  currentPath?: string;
  apps: App[];
};

export default function DashboardPage({ currentPath, apps }: Props) {
  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <DashboardSidebar currentPath={currentPath} />
      <main className="flex-1 overflow-y-auto">
        <MyApps apps={apps} />
      </main>
    </div>
  );
}

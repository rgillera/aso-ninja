import type { App } from "@/libs/contracts";

type Props = { app: App; allApps: App[] };

export default function UpdateFrequency({ }: Props) {
  return (
    <main className="h-full flex items-center justify-center">
      <p className="text-sm text-gray-600">Update Frequency — coming soon</p>
    </main>
  );
}

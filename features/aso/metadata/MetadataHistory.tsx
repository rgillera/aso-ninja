import type { App } from "@/libs/contracts";

type Props = { app: App; allApps: App[] };

export default function MetadataHistory({ }: Props) {
  return (
    <main className="h-full flex items-center justify-center">
      <p className="text-sm text-gray-600">Metadata History — coming soon</p>
    </main>
  );
}

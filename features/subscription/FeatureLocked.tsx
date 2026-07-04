import Link from "next/link";
import { LockClosedIcon } from "@heroicons/react/24/outline";

export function FeatureLocked({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-6 mt-6 rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-16 text-center">
      <LockClosedIcon className="size-8 text-amber-400/70 mb-3" />
      <p className="text-sm font-medium text-gray-300">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-600">{description}</p>
      <Link
        href="/dashboard/subscription"
        className="mt-4 rounded-lg bg-amber-400/10 px-4 py-2 text-xs font-medium text-amber-400 hover:bg-amber-400/20"
      >
        Upgrade to Enterprise
      </Link>
    </div>
  );
}

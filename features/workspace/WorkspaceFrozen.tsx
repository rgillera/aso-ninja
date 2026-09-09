import Link from "next/link";
import { LockClosedIcon, RectangleStackIcon } from "@heroicons/react/24/outline";

export function WorkspaceFrozen({ workspaceName }: { workspaceName: string }) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="max-w-sm w-full rounded-2xl bg-[#1a1d24] light:bg-white flex flex-col items-center py-14 px-6 text-center">
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-amber-400/10">
          <RectangleStackIcon className="size-8 text-amber-400 light:text-amber-700" />
          <span className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-[#1a1d24] light:bg-white">
            <LockClosedIcon className="size-3 text-amber-400 light:text-amber-700" />
          </span>
        </div>

        <p className="mt-4 text-base font-semibold text-white light:text-gray-900">&quot;{workspaceName}&quot; is paused</p>
        <p className="mt-1 max-w-xs text-sm text-gray-500">
          This workspace is over your plan&apos;s workspace limit, so its apps and keywords are paused.
          Upgrade or switch to another workspace to keep using it — nothing here has been deleted.
        </p>

        <Link
          href="/dashboard/subscription"
          className="mt-6 rounded-lg bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-400 light:text-amber-700 transition-colors hover:bg-amber-400/20"
        >
          Upgrade plan
        </Link>
      </div>
    </div>
  );
}

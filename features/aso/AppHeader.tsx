"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { InformationCircleIcon, DevicePhoneMobileIcon, PlusIcon, CheckIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { countryFlag } from "@/libs/countries";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { useAllApps } from "@/features/dashboard/AllAppsContext";
import { useSelectApp } from "@/features/dashboard/SelectAppContext";
import { followAppAction, deleteAppAction } from "@/features/app/actions";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { CountrySwitcher } from "@/features/aso/CountrySwitcher";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { App } from "@/libs/contracts";

type Props = {
  app: ActiveApp | null;
  title: string;
};


function ConfirmUnfollowDialog({
  name,
  onConfirm,
  onCancel,
  pending,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-2xl shadow-black/50 p-6">
        <p className="text-sm text-gray-300 mb-2">
          Unfollow <span className="font-semibold text-white">{name}</span>?
        </p>
        <p className="text-xs text-red-400/80 mb-6">
          All tracked keywords and metrics for this app will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/[0.10] hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 rounded-lg bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {pending ? "Unfollowing…" : "Unfollow"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FollowButton({ app }: { app: ActiveApp }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceId = useWorkspaceId();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFollowed = Boolean(app.id) && app.id !== "__preview__";

  function handleFollow() {
    if (!app.bundle_id || !app.store_id) return;
    setError(null);
    startTransition(async () => {
      const res = await followAppAction({
        workspaceId,
        name: app.name,
        store: app.store,
        bundleId: app.bundle_id!,
        storeId: app.store_id!,
        iconUrl: app.icon_url,
        country: app.country ?? null,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      // On the untracked-preview route the URL itself still encodes the
      // "__preview__" app — refresh() alone leaves it there until the page's
      // own redirect-if-tracked check re-runs, which isn't guaranteed to
      // happen promptly. Navigate explicitly to the now-tracked app so the
      // header updates immediately, preserving the current sub-page.
      if (pathname === "/dashboard/preview") {
        const subpage = searchParams.get("page");
        const target = subpage === "preview" || subpage === "timeline" || subpage === "benchmark"
          ? subpage
          : "report";
        router.push(`/dashboard/apps/${res.id}/${target}`);
        return;
      }
      router.refresh();
    });
  }

  function handleUnfollow() {
    if (!app.id) return;
    startTransition(async () => {
      await deleteAppAction(app.id!);
      setConfirmOpen(false);
      router.refresh();
    });
  }

  if (isFollowed) {
    return (
      <>
        <button
          onClick={() => setConfirmOpen(true)}
          title="Unfollow app"
          className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/25 hover:bg-red-500/15 hover:text-red-400 hover:ring-red-500/25 transition-colors shrink-0"
        >
          <CheckIcon className="size-3.5" />
          Unfollow
        </button>
        {confirmOpen && (
          <ConfirmUnfollowDialog
            name={app.name}
            pending={isPending}
            onConfirm={handleUnfollow}
            onCancel={() => setConfirmOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={handleFollow}
        disabled={isPending || !app.bundle_id || !app.store_id}
        title="Follow app"
        className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-gray-400 ring-1 ring-white/[0.08] hover:bg-indigo-500/15 hover:text-indigo-400 hover:ring-indigo-500/25 transition-colors disabled:opacity-50"
      >
        <PlusIcon className="size-3.5" />
        {isPending ? "Following…" : "Follow"}
      </button>
      {error && <span className="text-xs text-red-400/80"><PlanLimitMessage message={error} /></span>}
    </div>
  );
}

export function StoreLinkButton({ app }: { app: ActiveApp }) {
  if (!app.store_id) return null;

  const country = (app.country ?? "us").toLowerCase();
  const url =
    app.store === "ios"
      ? `https://apps.apple.com/${country}/app/id${app.store_id}`
      : `https://play.google.com/store/apps/details?id=${app.store_id}&hl=en&gl=${country}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={app.store === "ios" ? "View on App Store" : "View on Google Play"}
      className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-gray-400 ring-1 ring-white/[0.08] hover:bg-white/[0.10] hover:text-white transition-colors shrink-0"
    >
      {app.store === "ios" ? (
        <img src="/app-store.svg" alt="" className="size-3.5" />
      ) : (
        <img src="/google-play.svg" alt="" className="size-3.5" />
      )}
      {app.store === "ios" ? "App Store" : "Play Store"}
    </a>
  );
}

// Only shown for followed apps — settings (store connection, etc.) has
// nothing to attach to until the app has a real row (see FollowButton's
// isFollowed check above for the same "has a real id" rule). Static link,
// no status fetch: showing live connected/not-connected state here would
// mean a request on every dashboard page (AppHeader renders on all of
// them), not just Settings — not worth it for a badge.
function SettingsLinkButton({ app }: { app: ActiveApp }) {
  if (!app.id || app.id === "__preview__") return null;
  return (
    <Link
      href={`/dashboard/apps/${app.id}/settings`}
      title="App settings"
      className="flex items-center justify-center rounded-full bg-white/[0.06] p-1.5 text-gray-400 ring-1 ring-white/[0.08] hover:bg-white/[0.10] hover:text-white transition-colors shrink-0"
    >
      <Cog6ToothIcon className="size-3.5" />
    </Link>
  );
}

// Shown instead of the plain country label when the app is followed in more
// than one country — switches which country's data the rest of the page
// (report, keywords, reviews, ...) is scoped to.
function HeaderCountrySwitcher({ app, siblings }: { app: ActiveApp; siblings: App[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const selectApp = useSelectApp();

  function handleSelect(target: App) {
    // App-scoped routes (Report, Settings, ...) are keyed by app id in the
    // URL itself, so switch by navigating to the same sub-page for the
    // sibling. App-agnostic pages (Keywords, Reviews, ...) read the active
    // app from context/cookie instead — update that in place, no navigation.
    if (pathname.startsWith("/dashboard/apps/")) {
      const subpage = pathname.split("/")[4] ?? "report";
      router.push(`/dashboard/apps/${target.id}/${subpage}`);
    } else {
      selectApp({
        name: target.name,
        iconUrl: target.icon_url,
        store: target.store,
        bundleId: target.bundle_id,
        storeId: target.store_id,
        country: target.country ?? "US",
        href: `/dashboard/apps/${target.id}/report`,
        trackedId: target.id,
      });
    }
  }

  return (
    <CountrySwitcher
      currentId={app.id}
      currentCountry={app.country ?? ""}
      siblings={siblings}
      onSelect={handleSelect}
    />
  );
}

export function AppHeader({ app, title }: Props) {
  const allApps = useAllApps();
  const workspaceId = useWorkspaceId();
  const siblings = app?.id && app.bundle_id
    ? allApps.filter((a) => a.workspace_id === workspaceId && a.bundle_id === app.bundle_id && a.store === app.store)
    : [];

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
      <div className="flex items-center gap-3">
        {app ? (
          <>
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="size-8 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="size-8 rounded-xl bg-[#0d0f14] shrink-0 flex items-center justify-center">
                <DevicePhoneMobileIcon className="size-4 text-gray-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{app.name}</p>
              <div className="text-xs text-gray-500 leading-tight flex items-center gap-1">
                {app.store === "ios" ? (
                  <img src="/app-store.svg" alt="" className="size-3" />
                ) : (
                  <img src="/google-play.svg" alt="" className="size-3" />
                )}
                {app.store === "ios" ? "App Store" : "Google Play"}
                {app.country && (
                  siblings.length > 1
                    ? <HeaderCountrySwitcher app={app} siblings={siblings} />
                    : (
                      <span className="ml-1.5">
                        &middot; {countryFlag(app.country)} {app.country.toUpperCase()}
                      </span>
                    )
                )}
              </div>
            </div>
            <FollowButton app={app} />
            <StoreLinkButton app={app} />
            <SettingsLinkButton app={app} />
          </>
        ) : (
          <>
            <div className="size-8 rounded-xl bg-[#0d0f14] shrink-0 flex items-center justify-center">
              <DevicePhoneMobileIcon className="size-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 leading-tight">No app selected</p>
              <p className="text-xs text-gray-600 leading-tight">Select an app from My Apps</p>
            </div>
          </>
        )}
      </div>
      <div className="hidden items-center gap-1.5 sm:flex">
        <h1 className="text-sm font-semibold text-white">{title}</h1>
        <InformationCircleIcon className="size-4 text-gray-500" />
      </div>
    </div>
  );
}

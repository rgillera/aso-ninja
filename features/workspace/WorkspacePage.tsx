"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateWorkspaceAction,
  inviteMemberAction,
  removeMemberAction,
  deleteWorkspaceAction,
} from "./actions";
import {
  Cog6ToothIcon,
  CreditCardIcon,
  UsersIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { SettingsCard, SettingsHeader } from "@/features/dashboard/SettingsCard";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { PLAN_BADGE } from "@/features/subscription/planTiers";
import type { PlanSlug, Workspace, WorkspaceAccess, WorkspaceMember, WorkspaceRole } from "@/libs/contracts";

type MemberWithProfile = WorkspaceMember & {
  profiles: { full_name: string | null } | null;
  email?: string;
};

const ACCESS_LABELS: Record<WorkspaceAccess, string> = {
  aso_intelligence: "ASO Intelligence",
  market_intelligence: "Market Intelligence",
  asa_intelligence: "ASA Intelligence",
};

type Props = {
  workspace: Workspace;
  members: MemberWithProfile[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  allWorkspaces: Workspace[];
  canInviteMembers: boolean;
  planSlug: PlanSlug;
};

function Alert({ state }: { state: { error?: string; success?: string } | null }) {
  if (!state?.error && !state?.success) return null;
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ring-1 ${
      state.error
        ? "bg-red-500/10 text-red-400 light:text-red-600 ring-red-500/20"
        : "bg-green-500/10 text-green-400 ring-green-500/20"
    }`}>
      {state.error ? <PlanLimitMessage message={state.error} /> : state.success}
    </div>
  );
}

const labelClass = "block text-sm font-medium text-gray-300 light:text-gray-700 mb-1.5";

function inputClass(error?: boolean) {
  return `w-full rounded-lg bg-[#0d0f14] light:bg-gray-50 border px-3.5 py-2.5 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
    error ? "border-red-500/50" : "border-white/[0.07] light:border-black/[0.08]"
  }`;
}

export default function WorkspacePage({
  workspace,
  members,
  currentUserId,
  currentUserRole,
  allWorkspaces,
  canInviteMembers,
  planSlug,
}: Props) {
  const isOwner = currentUserRole === "owner";
  const isOnlyWorkspace = allWorkspaces.length <= 1;
  const planBadge = PLAN_BADGE[planSlug];

  const [generalState, generalAction, generalPending] = useActionState(updateWorkspaceAction, null);
  const [inviteState, inviteAction, invitePending] = useActionState(inviteMemberAction, null);
  const [localMembers, setLocalMembers] = useState(members);
  const [, startTransition] = useTransition();

  function handleRemove(member: MemberWithProfile) {
    const name = member.profiles?.full_name ?? member.email ?? "this member";
    if (!confirm(`Remove ${name} from this workspace?`)) return;

    setLocalMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    startTransition(() => removeMemberAction(workspace.id, member.user_id));
  }

  const memberCount = `${localMembers.length} member${localMembers.length !== 1 ? "s" : ""}`;

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[85rem] px-6 py-10">
        <SettingsHeader title="Workspace Settings" subtitle={workspace.name} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          {/* Members */}
          <SettingsCard
            className="lg:col-span-2"
            icon={UsersIcon}
            title="Members"
            description="People who can access this workspace and which products they can use."
            action={
              <span className="rounded-full bg-white/[0.06] light:bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-400 light:text-gray-600">
                {memberCount}
              </span>
            }
          >
            <ul className="-my-3 divide-y divide-white/[0.06] light:divide-black/[0.06]">
              {localMembers.map((m) => (
                <li key={m.user_id} className={`flex items-center justify-between gap-4 py-3 ${m.status === "frozen" ? "opacity-60" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-300 light:text-indigo-600">
                      {(m.profiles?.full_name ?? m.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white light:text-gray-900 flex items-center gap-1.5">
                        <span className="truncate">{m.profiles?.full_name ?? m.email ?? "Unknown"}</span>
                        {m.user_id === currentUserId && (
                          <span className="text-xs font-normal text-gray-500">(you)</span>
                        )}
                        {m.status === "frozen" && (
                          <span
                            className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] font-semibold text-amber-500 light:text-amber-700 shrink-0"
                            title="This member is over your plan's limit. Upgrade to restore their access."
                          >
                            Paused
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {m.access.length > 0
                          ? m.access.map((a) => ACCESS_LABELS[a]).join(" · ")
                          : "No features enabled"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-md bg-white/[0.06] light:bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-400 light:text-gray-600 capitalize">
                      {m.role}
                    </span>

                    {isOwner && m.user_id !== currentUserId && (
                      <button
                        onClick={() => handleRemove(m)}
                        className="text-xs text-gray-600 light:text-gray-400 hover:text-red-400 light:hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Invite */}
            {isOwner && !canInviteMembers && (
              <p className="mt-6 rounded-xl bg-white/[0.03] light:bg-gray-50 px-4 py-3 text-sm text-gray-500">
                Your current plan doesn&apos;t support adding members.{" "}
                <a href="/dashboard/subscription" className="text-indigo-400 light:text-indigo-600 hover:text-indigo-300 light:hover:text-indigo-500 transition-colors">
                  Upgrade to invite teammates.
                </a>
              </p>
            )}
            {isOwner && canInviteMembers && (
              <form action={inviteAction} className="mt-6 space-y-3 rounded-xl bg-white/[0.03] light:bg-gray-50 p-4">
                <input type="hidden" name="workspace_id" value={workspace.id} />
                <p className="text-sm font-medium text-gray-300 light:text-gray-700">Invite a teammate</p>
                <Alert state={inviteState} />
                <div className="flex gap-3">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    aria-label="Email address"
                    className={inputClass()}
                  />
                  <button
                    type="submit"
                    disabled={invitePending}
                    className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
                  >
                    {invitePending ? "Inviting…" : "Invite"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {(Object.keys(ACCESS_LABELS) as WorkspaceAccess[]).map((access) => (
                    <label key={access} className="flex items-center gap-2 text-sm text-gray-300 light:text-gray-700">
                      <input
                        type="checkbox"
                        name="access"
                        value={access}
                        defaultChecked
                        className="rounded border-white/[0.07] light:border-black/[0.08] bg-[#0d0f14] light:bg-white text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                      />
                      {ACCESS_LABELS[access]}
                    </label>
                  ))}
                </div>
              </form>
            )}
          </SettingsCard>

          <div className="space-y-6">
            {/* General */}
            <SettingsCard icon={Cog6ToothIcon} title="General" description="Name and URL for this workspace.">
              <form action={generalAction} className="space-y-4">
                <input type="hidden" name="id" value={workspace.id} />
                <Alert state={generalState} />

                <div>
                  <label htmlFor="ws-name" className={labelClass}>Workspace name</label>
                  <input
                    id="ws-name"
                    name="name"
                    defaultValue={workspace.name}
                    required
                    className={inputClass(!!generalState?.error)}
                    placeholder="Acme Inc"
                  />
                </div>

                <div>
                  <label htmlFor="ws-slug" className={labelClass}>Slug</label>
                  <div className="flex items-center rounded-lg bg-[#0d0f14] light:bg-gray-50 border border-white/[0.07] light:border-black/[0.08] overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
                    <span className="pl-3.5 pr-1 text-sm text-gray-600 light:text-gray-400 shrink-0">asoninja.com/</span>
                    <input
                      id="ws-slug"
                      name="slug"
                      defaultValue={workspace.slug}
                      required
                      className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 focus:outline-none"
                      placeholder="acme"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={generalPending || !isOwner}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generalPending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </SettingsCard>

            {/* Plan */}
            <SettingsCard
              id="plan"
              icon={CreditCardIcon}
              title="Plan"
              description={isOwner ? "Manage billing and see what's included." : "Only the workspace owner can manage billing."}
              action={
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${planBadge.className}`}>
                  {planBadge.label}
                </span>
              }
            >
              {isOwner && (
                <a
                  href="/dashboard/subscription"
                  className="block w-full rounded-lg bg-indigo-500 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
                >
                  Manage Plan
                </a>
              )}
            </SettingsCard>
          </div>

          {/* Danger zone */}
          {isOwner && !isOnlyWorkspace && (
            <SettingsCard
              className="lg:col-span-3"
              tone="danger"
              icon={ExclamationTriangleIcon}
              title="Delete workspace"
              description="Deleting this workspace permanently removes all apps, keywords, and data. This cannot be undone."
              action={
                <button
                  onClick={() => {
                    if (confirm(`Delete "${workspace.name}"? This cannot be undone.`)) {
                      startTransition(() => deleteWorkspaceAction(workspace.id));
                    }
                  }}
                  className="rounded-lg bg-red-500/10 light:bg-red-50 px-4 py-2 text-sm font-semibold text-red-400 light:text-red-600 ring-1 ring-red-500/30 hover:bg-red-500/20 light:hover:bg-red-100 transition-colors"
                >
                  Delete workspace
                </button>
              }
            />
          )}
        </div>
      </div>
    </main>
  );
}

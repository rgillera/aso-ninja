"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateWorkspaceAction,
  inviteMemberAction,
  removeMemberAction,
  deleteWorkspaceAction,
} from "./actions";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "@/libs/contracts";

type MemberWithProfile = WorkspaceMember & {
  profiles: { full_name: string | null } | null;
  email?: string;
};

type Props = {
  workspace: Workspace;
  members: MemberWithProfile[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  allWorkspaces: Workspace[];
  canInviteMembers: boolean;
};

function Alert({ state }: { state: { error?: string; success?: string } | null }) {
  if (!state?.error && !state?.success) return null;
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ring-1 ${
      state.error
        ? "bg-red-500/10 text-red-400 ring-red-500/20"
        : "bg-green-500/10 text-green-400 ring-green-500/20"
    }`}>
      {state.error ? <PlanLimitMessage message={state.error} /> : state.success}
    </div>
  );
}

function inputClass(error?: boolean) {
  return `w-full rounded-lg bg-[#0d0f14] border px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
    error ? "border-red-500/50" : "border-white/[0.07]"
  }`;
}

export default function WorkspacePage({
  workspace,
  members,
  currentUserId,
  currentUserRole,
  allWorkspaces,
  canInviteMembers,
}: Props) {
  const isOwner = currentUserRole === "owner";
  const isOnlyWorkspace = allWorkspaces.length <= 1;

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

  return (
    <main className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <a
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              ← Back to dashboard
            </a>
            <h1 className="mt-4 text-2xl font-semibold text-white">Workspace Settings</h1>
            <p className="mt-1 text-sm text-gray-400">{workspace.name}</p>
          </div>

          <div className="space-y-8">
            {/* General */}
            <section className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-lg shadow-black/20 p-6">
              <h2 className="text-base font-semibold text-white mb-5">General</h2>
              <form action={generalAction} className="space-y-4">
                <input type="hidden" name="id" value={workspace.id} />
                <Alert state={generalState} />

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Workspace name
                  </label>
                  <input
                    name="name"
                    defaultValue={workspace.name}
                    required
                    className={inputClass(!!generalState?.error)}
                    placeholder="Acme Inc"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Slug
                  </label>
                  <div className="flex items-center rounded-lg bg-[#0d0f14] border border-white/[0.07] overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                    <span className="pl-4 pr-1 text-sm text-gray-600 shrink-0">asoninja.com/</span>
                    <input
                      name="slug"
                      defaultValue={workspace.slug}
                      required
                      className="flex-1 bg-transparent py-2.5 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none"
                      placeholder="acme"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={generalPending || !isOwner}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generalPending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </section>

            {/* Members */}
            <section className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-lg shadow-black/20 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-white">Members</h2>
                <span className="text-xs text-gray-500">{localMembers.length} member{localMembers.length !== 1 ? "s" : ""}</span>
              </div>

              <ul className="divide-y divide-white/[0.07]">
                {localMembers.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
                        {(m.profiles?.full_name ?? m.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {m.profiles?.full_name ?? m.email ?? "Unknown"}
                          {m.user_id === currentUserId && (
                            <span className="ml-2 text-xs text-gray-500">(you)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-[#0d0f14] border border-white/[0.07] px-2.5 py-1 text-xs text-gray-400 capitalize">
                        {m.role}
                      </span>

                      {isOwner && m.user_id !== currentUserId && (
                        <button
                          onClick={() => handleRemove(m)}
                          className="text-xs text-gray-600 hover:text-red-400 transition-colors"
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
                <p className="mt-5 border-t border-white/[0.07] pt-5 text-sm text-gray-500">
                  Your current plan doesn't support adding members.{" "}
                  <a href="/dashboard/subscription" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    Upgrade to invite teammates.
                  </a>
                </p>
              )}
              {isOwner && canInviteMembers && (
                <form action={inviteAction} className="mt-5 space-y-3 border-t border-white/[0.07] pt-5">
                  <input type="hidden" name="workspace_id" value={workspace.id} />
                  <Alert state={inviteState} />
                  <div className="flex gap-3">
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder=""
                      className="flex-1 rounded-lg bg-[#0d0f14] border border-white/[0.07] px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    <button
                      type="submit"
                      disabled={invitePending}
                      className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
                    >
                      {invitePending ? "Inviting…" : "Invite"}
                    </button>
                  </div>
                  <div className="flex gap-5">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        name="access"
                        value="aso_intelligence"
                        defaultChecked
                        className="rounded border-white/[0.07] bg-[#0d0f14] text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                      />
                      ASO Intelligence
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        name="access"
                        value="market_intelligence"
                        defaultChecked
                        className="rounded border-white/[0.07] bg-[#0d0f14] text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                      />
                      Market Intelligence
                    </label>
                  </div>
                </form>
              )}
            </section>

            {/* Danger zone */}
            {isOwner && (
              <section className="rounded-2xl ring-1 ring-red-500/20 p-6">
                <h2 className="text-base font-semibold text-red-400 mb-2">Danger Zone</h2>
                <p className="text-sm text-gray-400 mb-5">
                  Deleting this workspace permanently removes all apps, keywords, and data. This cannot be undone.
                </p>
                {isOnlyWorkspace && (
                  <p className="text-sm text-amber-400 mb-3">
                    You can't delete your only workspace.
                  </p>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete "${workspace.name}"? This cannot be undone.`)) {
                      startTransition(() => deleteWorkspaceAction(workspace.id));
                    }
                  }}
                  disabled={isOnlyWorkspace}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                >
                  Delete workspace
                </button>
              </section>
            )}
          </div>
        </div>
    </main>
  );
}

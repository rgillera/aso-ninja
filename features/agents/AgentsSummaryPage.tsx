"use client";

import { useRouter } from "next/navigation";
import { ChartBarIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import {
  CRM_STATUSES,
  CRM_STATUS_LABELS,
  CRM_STATUS_ACCENT_TEXT,
  DAILY_ACTIVITY_STATUSES,
  type CrmContact,
  type CrmStatus,
  type AgentDailyMetrics,
} from "@/features/agents/types";

type Props = {
  contacts: CrmContact[];
  agentEmails: string[];
  metricsByAgent: Record<string, AgentDailyMetrics>;
  selectedDate: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AgentsSummaryPage({ contacts, agentEmails, metricsByAgent, selectedDate }: Props) {
  const router = useRouter();

  const statusCounts = Object.fromEntries(CRM_STATUSES.map((s) => [s, 0])) as Record<CrmStatus, number>;
  for (const c of contacts) statusCounts[c.status] += 1;

  const teamTotals: AgentDailyMetrics = { callsToday: 0, statusCounts: {} };
  for (const email of agentEmails) {
    const m = metricsByAgent[email];
    teamTotals.callsToday += m.callsToday;
    for (const s of DAILY_ACTIVITY_STATUSES) {
      teamTotals.statusCounts[s] = (teamTotals.statusCounts[s] ?? 0) + (m.statusCounts[s] ?? 0);
    }
  }

  function handleDateChange(next: string) {
    if (!next) return;
    router.push(`/agents/summary?date=${next}`);
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <ChartBarIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Summary</h1>
            <p className="text-xs text-gray-500">Cold Call CRM — snapshot across every contact</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="rounded-xl bg-indigo-500/10 light:bg-indigo-50 p-5">
            <p className="text-3xl font-bold leading-none text-indigo-400 light:text-indigo-600">{contacts.length.toLocaleString()}</p>
            <p className="mt-2 text-xs font-medium text-indigo-300/80 light:text-indigo-700">Total Contacts</p>
          </div>

          {CRM_STATUSES.map((s) => (
            <div key={s} className="rounded-xl bg-[#1a1d24] light:bg-white p-5">
              <p className={`text-3xl font-bold leading-none ${CRM_STATUS_ACCENT_TEXT[s]}`}>{statusCounts[s].toLocaleString()}</p>
              <p className="mt-2 text-xs font-medium text-gray-500">{CRM_STATUS_LABELS[s]}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-white light:text-gray-900">Agent activity</h2>
          <div className="flex items-center gap-2 rounded-lg bg-[#1a1d24] light:bg-white px-3 py-2">
            <CalendarDaysIcon className="size-3.5 text-gray-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              max={todayIso()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-xs text-white light:text-gray-900 outline-none"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-[#1a1d24] light:bg-white overflow-hidden shadow-lg shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] light:border-black/[0.08] text-left text-[10px] font-semibold tracking-widest text-gray-600 light:text-gray-400 uppercase">
                  <th className="px-5 py-3 font-semibold">Agent</th>
                  <th className="px-5 py-3 font-semibold text-right">Calls</th>
                  {DAILY_ACTIVITY_STATUSES.map((s) => (
                    <th key={s} className="px-5 py-3 font-semibold text-right whitespace-nowrap">{CRM_STATUS_LABELS[s]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07] light:divide-black/[0.08]">
                {agentEmails.map((email) => {
                  const m = metricsByAgent[email];
                  return (
                    <tr key={email} className="hover:bg-white/[0.03] light:hover:bg-black/[0.02] transition-colors">
                      <td className="px-5 py-3 text-white light:text-gray-900 truncate max-w-xs">{email}</td>
                      <td className="px-5 py-3 text-right font-medium text-indigo-400 light:text-indigo-600">{m.callsToday.toLocaleString()}</td>
                      {DAILY_ACTIVITY_STATUSES.map((s) => (
                        <td key={s} className={`px-5 py-3 text-right font-medium ${CRM_STATUS_ACCENT_TEXT[s]}`}>
                          {(m.statusCounts[s] ?? 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              {agentEmails.length > 0 && (
                <tfoot>
                  <tr className="border-t border-white/[0.07] light:border-black/[0.08] font-semibold">
                    <td className="px-5 py-3 text-white light:text-gray-900">Team total</td>
                    <td className="px-5 py-3 text-right text-indigo-400 light:text-indigo-600">{teamTotals.callsToday.toLocaleString()}</td>
                    {DAILY_ACTIVITY_STATUSES.map((s) => (
                      <td key={s} className={`px-5 py-3 text-right ${CRM_STATUS_ACCENT_TEXT[s]}`}>
                        {(teamTotals.statusCounts[s] ?? 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {agentEmails.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">
              No agents configured — add emails to AGENT_EMAILS.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

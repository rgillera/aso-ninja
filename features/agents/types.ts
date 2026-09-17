export const CRM_STATUSES = [
  "new",
  "attempted_no_answer",
  "left_voicemail",
  "spoke_interested",
  "spoke_not_interested",
  "follow_up_scheduled",
  "closed_won",
  "closed_lost",
  "do_not_call",
] as const;

export type CrmStatus = (typeof CRM_STATUSES)[number];

// The 4 statuses shown in the "today" activity row on the Contacts page —
// call-outcome statuses an agent racks up over the course of a day.
export const DAILY_ACTIVITY_STATUSES = [
  "attempted_no_answer",
  "left_voicemail",
  "spoke_interested",
  "spoke_not_interested",
] as const satisfies readonly CrmStatus[];

// Statuses worth telling the contact about by email — never "Do Not Call"
// (that status means the opposite: stop contacting them) and never the
// internal-only tracking states (New, Attempted - No Answer, etc.) that
// have nothing new to tell them. Each has its own admin-editable template
// (agent_email_templates table) — see features/agents/AgentsSettingsPage.
export const EMAIL_TRIGGER_STATUSES = [
  "left_voicemail",
  "spoke_interested",
  "follow_up_scheduled",
  "closed_won",
] as const satisfies readonly CrmStatus[];

export const CRM_STATUS_LABELS: Record<CrmStatus, string> = {
  new: "New",
  attempted_no_answer: "Attempted - No Answer",
  left_voicemail: "Left Voicemail",
  spoke_interested: "Spoke - Interested",
  spoke_not_interested: "Spoke - Not Interested",
  follow_up_scheduled: "Follow-up Scheduled",
  closed_won: "Closed - Won",
  closed_lost: "Closed - Lost",
  do_not_call: "Do Not Call",
};

// Tailwind classes for the status pill — mirrors the "New" / "Left Voicemail"
// highlighting from the spreadsheet this replaces.
export const CRM_STATUS_BADGE_CLASSES: Record<CrmStatus, string> = {
  new: "bg-white/[0.06] light:bg-black/[0.05] text-gray-300 light:text-gray-700",
  attempted_no_answer: "bg-amber-500/10 text-amber-400 light:text-amber-700",
  left_voicemail: "bg-amber-500/10 text-amber-400 light:text-amber-700",
  spoke_interested: "bg-emerald-500/10 text-emerald-400 light:text-emerald-700",
  spoke_not_interested: "bg-gray-500/10 text-gray-400 light:text-gray-600",
  follow_up_scheduled: "bg-sky-500/10 text-sky-400 light:text-sky-700",
  closed_won: "bg-emerald-500/15 text-emerald-400 light:text-emerald-700",
  closed_lost: "bg-red-500/10 text-red-400 light:text-red-600",
  do_not_call: "bg-red-500/10 text-red-400 light:text-red-600",
};

// Text-only variant of CRM_STATUS_BADGE_CLASSES for the summary dashboard's
// big stat-card numbers, where a pill background would be too heavy.
export const CRM_STATUS_ACCENT_TEXT: Record<CrmStatus, string> = {
  new: "text-gray-300 light:text-gray-700",
  attempted_no_answer: "text-amber-400 light:text-amber-700",
  left_voicemail: "text-amber-400 light:text-amber-700",
  spoke_interested: "text-emerald-400 light:text-emerald-700",
  spoke_not_interested: "text-gray-400 light:text-gray-600",
  follow_up_scheduled: "text-sky-400 light:text-sky-700",
  closed_won: "text-emerald-400 light:text-emerald-700",
  closed_lost: "text-red-400 light:text-red-600",
  do_not_call: "text-red-400 light:text-red-600",
};

export const CRM_PRIORITIES = ["low", "medium", "high"] as const;
export type CrmPriority = (typeof CRM_PRIORITIES)[number];

export const CRM_PRIORITY_LABELS: Record<CrmPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const CRM_PRIORITY_BADGE_CLASSES: Record<CrmPriority, string> = {
  low: "bg-white/[0.06] light:bg-black/[0.05] text-gray-400 light:text-gray-600",
  medium: "bg-sky-500/10 text-sky-400 light:text-sky-700",
  high: "bg-red-500/10 text-red-400 light:text-red-600",
};

export type CrmContact = {
  id: string;
  appName: string;
  phone: string | null;
  email: string | null;
  status: CrmStatus;
  priority: CrmPriority;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmContactRow = {
  id: string;
  app_name: string;
  phone: string | null;
  email: string | null;
  status: CrmStatus;
  priority: CrmPriority;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

// The current agent's "today" activity, shown above the search bar on the
// Contacts page — see app/agents/page.tsx for how it's computed.
export type AgentDailyMetrics = {
  callsToday: number;
  statusCounts: Partial<Record<CrmStatus, number>>;
};

export function fromRow(row: CrmContactRow): CrmContact {
  return {
    id: row.id,
    appName: row.app_name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    priority: row.priority,
    lastContactAt: row.last_contact_at,
    nextFollowUpAt: row.next_follow_up_at,
    notes: row.notes,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

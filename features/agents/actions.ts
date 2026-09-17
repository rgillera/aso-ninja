"use server";

import ExcelJS from "exceljs";
import { revalidatePath, refresh } from "next/cache";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { isAgentEmail } from "@/libs/agents/is-agent-email";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import { getResendClient } from "@/libs/resend";
import {
  getDefaultTemplate,
  applyAppName,
  renderTemplateHtml,
  renderTemplateText,
} from "@/libs/email/contact-status-update";
import {
  CRM_STATUSES,
  CRM_STATUS_LABELS,
  CRM_PRIORITIES,
  EMAIL_TRIGGER_STATUSES,
  fromRow,
  type CrmContact,
  type CrmContactRow,
  type CrmStatus,
  type CrmPriority,
} from "@/features/agents/types";

type Agent = { email: string; userId: string };

// Every exported action here is reachable directly as its own server
// endpoint regardless of which page rendered the button that calls it — the
// /agents/* layout's notFound() gate does not protect this file on its own
// (mirrors requireSuperAdmin in features/admin/actions.ts).
async function requireAgent(): Promise<Agent> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAgentEmail(user?.email)) throw new Error("Not authorized");
  return { email: user!.email!, userId: user!.id };
}

// Bulk import and delete are destructive/high-blast-radius enough that
// they're reserved for agents who are also super admins — a regular agent
// can work leads (add, edit, call) but not wipe or mass-load them.
async function requireAgentAdmin(): Promise<Agent> {
  const agent = await requireAgent();
  if (!isSuperAdminEmail(agent.email)) throw new Error("Not authorized");
  return agent;
}

function refreshAgentsPage() {
  revalidatePath("/agents");
  refresh();
}

export type ContactPatch = Partial<{
  appName: string;
  phone: string | null;
  email: string | null;
  status: CrmStatus;
  priority: CrmPriority;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
}>;

const PATCH_TO_COLUMN: Record<keyof ContactPatch, string> = {
  appName: "app_name",
  phone: "phone",
  email: "email",
  status: "status",
  priority: "priority",
  lastContactAt: "last_contact_at",
  nextFollowUpAt: "next_follow_up_at",
  notes: "notes",
};

const EMAIL_TRIGGER_STATUS_SET: ReadonlySet<CrmStatus> = new Set(EMAIL_TRIGGER_STATUSES);

// Best-effort: a failed notification email should never undo the status
// update that already succeeded and saved, so failures here are swallowed
// (emailSent just comes back false) rather than surfaced as an action error.
async function sendContactStatusEmail(agent: Agent, status: CrmStatus, appName: string, contactEmail: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const [{ data: settings }, { data: template }] = await Promise.all([
      admin.from("agent_settings").select("reply_to_email").eq("user_id", agent.userId).maybeSingle(),
      admin.from("agent_email_templates").select("subject, body").eq("status", status).maybeSingle(),
    ]);
    const { subject, body } = template ?? getDefaultTemplate(status);

    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: "AppASO Growth Team <hello@appaso.io>",
      to: contactEmail,
      ...(settings?.reply_to_email ? { replyTo: settings.reply_to_email } : {}),
      subject: applyAppName(subject, appName),
      html: renderTemplateHtml(body, appName),
      text: renderTemplateText(body, appName),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function updateContactAction(id: string, patch: ContactPatch): Promise<{ ok: true; emailSent: boolean } | { ok: false; error: string }> {
  const agent = await requireAgent();
  const admin = createAdminClient();

  const update: Record<string, unknown> = { updated_by: agent.email, updated_at: new Date().toISOString() };
  for (const key of Object.keys(patch) as (keyof ContactPatch)[]) {
    update[PATCH_TO_COLUMN[key]] = patch[key];
  }

  // maybeSingle (not single): if another agent deleted this contact in the
  // meantime, 0 rows match and .single() would throw a raw Postgres "cannot
  // coerce to a single JSON object" error instead of the friendly message
  // below — this is the only path that can hit that, since every other
  // agents/* mutation targets a row it just read or just inserted itself.
  const { data, error } = await admin.from("crm_contacts").update(update).eq("id", id).select("app_name, email").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) {
    refreshAgentsPage();
    return { ok: false, error: "This contact was removed — the list has been refreshed." };
  }

  refreshAgentsPage();

  let emailSent = false;
  if (patch.status && EMAIL_TRIGGER_STATUS_SET.has(patch.status) && data.email) {
    emailSent = await sendContactStatusEmail(agent, patch.status, data.app_name, data.email);
  }

  return { ok: true, emailSent };
}

export async function createContactAction(input: {
  appName: string;
  phone: string | null;
  email: string | null;
}): Promise<{ ok: true; contact: CrmContact } | { ok: false; error: string }> {
  const agent = await requireAgentAdmin();
  const appName = input.appName.trim();
  if (!appName) return { ok: false, error: "App / Company name is required." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_contacts")
    .insert({
      app_name: appName,
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      created_by: agent.email,
      updated_by: agent.email,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  refreshAgentsPage();
  return { ok: true, contact: fromRow(data as CrmContactRow) };
}

export async function deleteContactAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAgentAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("crm_contacts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  refreshAgentsPage();
  return { ok: true };
}

// Header aliases we recognize on import, matched case-insensitively after
// stripping everything but letters — keeps common variants ("App / Company",
// "Company Name", "Email Address") working without a strict header contract.
const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  appcompany: "appName",
  app: "appName",
  company: "appName",
  companyname: "appName",
  appname: "appName",
  phone: "phone",
  phonenumber: "phone",
  email: "email",
  emailaddress: "email",
  status: "status",
  priority: "priority",
  notes: "notes",
  note: "notes",
};

type ImportRow = {
  appName: string;
  phone: string;
  email: string;
  status: string;
  priority: string;
  notes: string;
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z]/g, "");
}

function parseStatus(raw: string): CrmStatus {
  const norm = raw.toLowerCase().replace(/[^a-z]/g, "");
  const match = CRM_STATUSES.find((s) => s.replace(/_/g, "") === norm)
    ?? (Object.entries(CRM_STATUS_LABELS).find(([, label]) => label.toLowerCase().replace(/[^a-z]/g, "") === norm)?.[0] as CrmStatus | undefined);
  return match ?? "new";
}

function parsePriority(raw: string): CrmPriority {
  const norm = raw.toLowerCase().trim();
  return (CRM_PRIORITIES as readonly string[]).includes(norm) ? (norm as CrmPriority) : "medium";
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

export type ImportSummary = { ok: true; created: number; skipped: number } | { ok: false; error: string };

// Existing contacts are matched by email OR app name (checked independently
// — not a single "email if present, else app name" key, which missed a
// contact that had no email on its first import but gained one on a later
// export of the same sheet, silently creating a duplicate row instead of
// recognizing it) and left completely untouched on a match — a re-import
// must never silently wipe out an agent's status, priority or notes on a
// lead they've already worked.
export async function importContactsAction(formData: FormData): Promise<ImportSummary> {
  const agent = await requireAgentAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return { ok: false, error: "Couldn't read that file — expected an .xlsx spreadsheet." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { ok: false, error: "The spreadsheet has no sheets." };

  const headerRow = sheet.getRow(1);
  const columnMap = new Map<number, keyof ImportRow>();
  headerRow.eachCell((cell, colNumber) => {
    const field = HEADER_ALIASES[normalizeHeader(cellText(cell.value))];
    if (field) columnMap.set(colNumber, field);
  });

  if (![...columnMap.values()].includes("appName")) {
    return { ok: false, error: 'Couldn\'t find an "App / Company" column in the first row.' };
  }

  const parsedRows: ImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const parsed: ImportRow = { appName: "", phone: "", email: "", status: "", priority: "", notes: "" };
    for (const [colNumber, field] of columnMap) {
      parsed[field] = cellText(row.getCell(colNumber).value);
    }
    if (parsed.appName.trim()) parsedRows.push(parsed);
  });

  if (parsedRows.length === 0) return { ok: false, error: "No rows with an App / Company name were found." };

  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin.from("crm_contacts").select("email, app_name");
  if (fetchError) return { ok: false, error: fetchError.message };

  const existingEmails = new Set((existing ?? []).filter((row) => row.email).map((row) => row.email!.toLowerCase()));
  const existingAppNames = new Set((existing ?? []).map((row) => row.app_name.toLowerCase().trim()));

  let skipped = 0;
  const toInsert: Record<string, unknown>[] = [];
  const seenEmails = new Set<string>();
  const seenAppNames = new Set<string>();

  for (const row of parsedRows) {
    const email = row.email.trim().toLowerCase() || null;
    const appName = row.appName.trim();
    const appNameKey = appName.toLowerCase();

    const isDuplicate =
      (email !== null && (existingEmails.has(email) || seenEmails.has(email))) ||
      existingAppNames.has(appNameKey) ||
      seenAppNames.has(appNameKey);

    if (isDuplicate) {
      skipped += 1;
      continue;
    }
    if (email) seenEmails.add(email);
    seenAppNames.add(appNameKey);

    toInsert.push({
      app_name: appName,
      phone: row.phone.trim() || null,
      email,
      status: row.status.trim() ? parseStatus(row.status) : "new",
      priority: row.priority.trim() ? parsePriority(row.priority) : "medium",
      notes: row.notes.trim() || null,
      created_by: agent.email,
      updated_by: agent.email,
    });
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await admin.from("crm_contacts").insert(toInsert);
    if (insertError) return { ok: false, error: insertError.message };
  }

  refreshAgentsPage();
  return { ok: true, created: toInsert.length, skipped };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateAgentEmailAction(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const agent = await requireAgent();
  const trimmed = email.trim();
  if (trimmed && !EMAIL_PATTERN.test(trimmed)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("agent_settings")
    .upsert(
      { user_id: agent.userId, reply_to_email: trimmed || null, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agents/settings");
  refresh();
  return { ok: true };
}

// Fire-and-forget from the Call button's onClick — logged so the "Calls
// Today" metric on the Contacts page has something to count. Deliberately
// no revalidatePath/refresh: the tel: link is already navigating away, and
// the metric only needs to be fresh on the next page load, not this instant.
export async function logCallAction(contactId: string): Promise<void> {
  const agent = await requireAgent();
  const admin = createAdminClient();
  await admin.from("crm_call_log").insert({ contact_id: contactId, agent_email: agent.email });
}

// Editing the automated contact-facing emails is admin-only, same tier as
// bulk import/delete — see requireAgentAdmin. Only ever writes a row for a
// status in EMAIL_TRIGGER_STATUSES, keeping agent_email_templates scoped to
// statuses that actually send anything.
export async function updateEmailTemplateAction(
  status: CrmStatus,
  subject: string,
  body: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const agent = await requireAgentAdmin();
  if (!EMAIL_TRIGGER_STATUS_SET.has(status)) return { ok: false, error: "That status doesn't send an email." };

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject) return { ok: false, error: "Subject can't be empty." };
  if (!trimmedBody) return { ok: false, error: "Message can't be empty." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("agent_email_templates")
    .upsert(
      { status, subject: trimmedSubject, body: trimmedBody, updated_by: agent.email, updated_at: new Date().toISOString() },
      { onConflict: "status" }
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agents/settings");
  refresh();
  return { ok: true };
}

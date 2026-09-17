// Renders the admin-editable per-status email template (agent_email_templates
// table, edited from the Settings page — see features/agents/AgentsSettingsPage
// and updateEmailTemplateAction in features/agents/actions.ts) sent to a CRM
// contact when an agent moves them to a status worth telling them about (see
// EMAIL_TRIGGER_STATUSES in features/agents/types.ts).

const APP_NAME_PLACEHOLDER = "{{appName}}";

type Template = { subject: string; body: string };

const GENERIC_TEMPLATE: Template = {
  subject: `Following up — ${APP_NAME_PLACEHOLDER}`,
  body: `Hi,

I wanted to follow up regarding ${APP_NAME_PLACEHOLDER} — thanks for the conversation so far.

Feel free to reply directly to this email if you have any questions or would like to continue the discussion.

Best regards,
The AppASO Team`,
};

// The starting template for every trigger status, seeded into the DB by its
// migration — also the fallback/"reset to default" target here, per status
// (not one shared constant: Left Voicemail's default deliberately
// references the voicemail rather than reusing the generic "conversation so
// far" line, which doesn't fit a call that went to voicemail).
export const DEFAULT_TEMPLATES: Record<string, Template> = {
  left_voicemail: {
    subject: `Following up — ${APP_NAME_PLACEHOLDER}`,
    body: `Hi,

I just left you a voicemail regarding ${APP_NAME_PLACEHOLDER} — wanted to follow up here as well in case email is easier to reach you.

Feel free to reply directly to this email if you have any questions or would like to continue the discussion.

Best regards,
The AppASO Team`,
  },
  spoke_interested: GENERIC_TEMPLATE,
  follow_up_scheduled: GENERIC_TEMPLATE,
  closed_won: GENERIC_TEMPLATE,
};

export function getDefaultTemplate(status: string): Template {
  return DEFAULT_TEMPLATES[status] ?? GENERIC_TEMPLATE;
}

// appName is free text (typed by an agent or pulled from an imported
// spreadsheet), so it must be escaped before landing in the HTML body.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function applyAppName(template: string, appName: string): string {
  return template.split(APP_NAME_PLACEHOLDER).join(appName);
}

export function renderTemplateHtml(body: string, appName: string): string {
  const merged = applyAppName(escapeHtml(body), escapeHtml(appName));
  const paragraphs = merged
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
${paragraphs}
</div>`.trim();
}

export function renderTemplateText(body: string, appName: string): string {
  return applyAppName(body, appName);
}

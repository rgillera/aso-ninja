import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getResendClient } from "@/libs/resend";
import {
  TRIAL_EMAIL_SUBJECT,
  renderTrialEmailHtml,
  renderTrialEmailText,
  type TrialEmail,
} from "@/libs/email/trial";

// Daily upkeep for the signup Pro trial (subscriptions.pro_trial_ends_at,
// see 20261025000001_signup_pro_trial.sql):
// - "2 days left" email once the end is 1 to 2 days away
// - "last day" email once it's under a day away
// - after it ends, reconcile_plan_limits, so whatever is over Free's limits
//   gets paused. Plan checks already read Free the moment it ends; this only
//   catches up the rows created during the trial.
// Each window is a day wide and the cron runs daily, so every trial passes
// through each one once. Only users still on the free plan get emails.
const DAY_MS = 86_400_000;
const BATCH = 100;
const FROM = "AppASO <hello@appaso.io>";

type Row = { user_id: string };

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = Date.now();
  const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  const onFreeWithTrial = () =>
    supabase
      .from("subscriptions")
      .select("user_id, plans!inner(slug)")
      .eq("plans.slug", "free")
      .not("pro_trial_ends_at", "is", null);

  const [reminder, lastDay, expired] = await Promise.all([
    onFreeWithTrial()
      .gt("pro_trial_ends_at", at(DAY_MS))
      .lte("pro_trial_ends_at", at(2 * DAY_MS))
      .is("pro_trial_reminder_sent_at", null)
      .limit(BATCH),
    onFreeWithTrial()
      .gt("pro_trial_ends_at", at(0))
      .lte("pro_trial_ends_at", at(DAY_MS))
      .is("pro_trial_last_day_sent_at", null)
      .limit(BATCH),
    // Not limited to the free plan: someone who paid and then cancelled
    // during the trial still needs the catch-up.
    supabase
      .from("subscriptions")
      .select("user_id")
      .lte("pro_trial_ends_at", at(0))
      .is("pro_trial_reconciled_at", null)
      .limit(BATCH),
  ]);

  const queryError = reminder.error ?? lastDay.error ?? expired.error;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });

  const resend = getResendClient();

  async function sendAll(rows: Row[], kind: TrialEmail, column: string) {
    let sent = 0;
    let failed = 0;
    for (const { user_id } of rows) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
      const email = userData?.user?.email;
      const fullName = userData?.user?.user_metadata?.full_name;
      if (userError || !email) {
        failed++;
        continue;
      }

      const { error: sendError } = await resend.emails.send({
        from: FROM,
        to: email,
        subject: TRIAL_EMAIL_SUBJECT[kind],
        html: renderTrialEmailHtml(kind, fullName),
        text: renderTrialEmailText(kind, fullName),
      });
      if (sendError) {
        failed++;
        continue;
      }

      await supabase
        .from("subscriptions")
        .update({ [column]: new Date().toISOString() })
        .eq("user_id", user_id);
      sent++;
    }
    return { sent, failed };
  }

  const reminders = await sendAll(reminder.data ?? [], "reminder", "pro_trial_reminder_sent_at");
  const lastDays = await sendAll(lastDay.data ?? [], "last_day", "pro_trial_last_day_sent_at");

  let reconciled = 0;
  for (const { user_id } of expired.data ?? []) {
    const { error } = await supabase.rpc("reconcile_plan_limits", { p_user_id: user_id });
    if (error) continue;
    await supabase
      .from("subscriptions")
      .update({ pro_trial_reconciled_at: new Date().toISOString() })
      .eq("user_id", user_id);
    reconciled++;
  }

  return NextResponse.json({ reminders, lastDays, reconciled });
}

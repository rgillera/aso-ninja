import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getResendClient } from "@/libs/resend";
import {
  REVIEW_EMAIL_SUBJECT,
  renderReviewEmailHtml,
  renderReviewEmailText,
} from "@/libs/email/review";

// Follow-up to the dashboard's Trustpilot card (features/review): one email,
// a week after the card was first shown, if they never clicked through.
// Users who hit "Maybe later" twice are left alone.
const DELAY_DAYS = 7;
const MAX_DISMISSALS = 2;
const FROM = "AppASO <hello@appaso.io>";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - DELAY_DAYS * 86_400_000).toISOString();

  const { data: pending, error } = await supabase
    .from("profiles")
    .select("id")
    .not("review_prompt_shown_at", "is", null)
    .lte("review_prompt_shown_at", cutoff)
    .is("review_prompt_clicked_at", null)
    .is("review_email_sent_at", null)
    .lt("review_prompt_dismiss_count", MAX_DISMISSALS)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending?.length) return NextResponse.json({ sent: 0, failed: 0, total: 0 });

  const resend = getResendClient();
  let sent = 0;
  let failed = 0;

  for (const { id } of pending) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(id);
    const email = userData?.user?.email;
    if (userError || !email) {
      failed++;
      continue;
    }

    const { error: sendError } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: REVIEW_EMAIL_SUBJECT,
      html: renderReviewEmailHtml(),
      text: renderReviewEmailText(),
    });

    if (sendError) {
      failed++;
      continue;
    }

    await supabase
      .from("profiles")
      .update({ review_email_sent_at: new Date().toISOString() })
      .eq("id", id);
    sent++;
  }

  return NextResponse.json({ sent, failed, total: pending.length });
}

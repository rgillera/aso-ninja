import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getResendClient } from "@/libs/resend";
import { WELCOME_EMAIL_SUBJECT, renderWelcomeEmailHtml } from "@/libs/email/welcome";

// Wait this long after email confirmation before sending, so it doesn't
// land in the same breath as Supabase's own confirmation email.
const DELAY_MINUTES = 10;
const FROM = "AppASO <hello@appaso.io>";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - DELAY_MINUTES * 60_000).toISOString();

  const { data: pending, error } = await supabase
    .from("profiles")
    .select("id")
    .not("email_confirmed_at", "is", null)
    .lte("email_confirmed_at", cutoff)
    .is("welcome_email_sent_at", null)
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
      subject: WELCOME_EMAIL_SUBJECT,
      html: renderWelcomeEmailHtml(),
    });

    if (sendError) {
      failed++;
      continue;
    }

    await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", id);
    sent++;
  }

  return NextResponse.json({ sent, failed, total: pending.length });
}

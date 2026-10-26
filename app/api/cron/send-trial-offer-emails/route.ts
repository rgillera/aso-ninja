import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getResendClient } from "@/libs/resend";
import {
  TRIAL_OFFER_EMAIL_SUBJECT,
  renderTrialOfferEmailHtml,
  renderTrialOfferEmailText,
} from "@/libs/email/trial-offer";

// One-time "try Pro free" email to everyone who can still start the opt-in
// Pro trial (pro_trial_offer_recipients, 20261026000004). Each run sends one
// batch; profiles.pro_trial_offer_sent_at keeps anyone from getting it twice.
// Not in vercel.json: it's a one-off campaign, triggered by hand.
const BATCH = 50;
const FROM = "AppASO <hello@appaso.io>";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: pending, error } = await supabase.rpc("pro_trial_offer_recipients", { p_limit: BATCH });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending?.length) return NextResponse.json({ sent: 0, failed: 0, total: 0 });

  const resend = getResendClient();
  let sent = 0;
  let failed = 0;

  for (const { user_id } of pending as { user_id: string }[]) {
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
      subject: TRIAL_OFFER_EMAIL_SUBJECT,
      html: renderTrialOfferEmailHtml(fullName),
      text: renderTrialOfferEmailText(fullName),
    });

    if (sendError) {
      failed++;
      continue;
    }

    await supabase
      .from("profiles")
      .update({ pro_trial_offer_sent_at: new Date().toISOString() })
      .eq("id", user_id);
    sent++;
  }

  return NextResponse.json({ sent, failed, total: pending.length });
}

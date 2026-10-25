import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { getResendClient } from "@/libs/resend";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { PlanSlug } from "@/libs/contracts";
import {
  REVIEW_EMAIL_SUBJECT,
  renderReviewEmailHtml,
  renderReviewEmailText,
} from "@/libs/email/review";

// Follow-up to the dashboard's Trustpilot card (features/review): one email,
// a week after the card was first shown, if they never clicked through.
// Users who hit "Maybe later" twice are left alone, and so is anyone below
// Pro by send time (e.g. the card showed during their signup trial, which
// has since ended); they stay pending in case they upgrade later.
const DELAY_DAYS = 7;
const MAX_DISMISSALS = 2;
const SEND_LIMIT = 50;
const PAGE_SIZE = 200;
const FROM = "AppASO <hello@appaso.io>";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - DELAY_DAYS * 86_400_000).toISOString();

  const resend = getResendClient();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Paged rather than a single limit(50): users below Pro stay pending, so
  // a fixed first page could fill up with them and starve everyone behind.
  for (let from = 0; sent + failed < SEND_LIMIT; from += PAGE_SIZE) {
    const { data: pending, error } = await supabase
      .from("profiles")
      .select("id")
      .not("review_prompt_shown_at", "is", null)
      .lte("review_prompt_shown_at", cutoff)
      .is("review_prompt_clicked_at", null)
      .is("review_email_sent_at", null)
      .lt("review_prompt_dismiss_count", MAX_DISMISSALS)
      .order("review_prompt_shown_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!pending?.length) break;

    for (const { id } of pending) {
      if (sent + failed >= SEND_LIMIT) break;

      const { data: plan } = await supabase.rpc("get_effective_plan", { p_user_id: id }).single<{ slug: PlanSlug }>();
      if (!plan || !isPlanAtLeast(plan.slug, "pro")) {
        skipped++;
        continue;
      }

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

    if (pending.length < PAGE_SIZE) break;
  }

  return NextResponse.json({ sent, failed, skipped });
}

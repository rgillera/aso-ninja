import { NextResponse } from "next/server";
import { startProTrialAction } from "@/features/subscription/actions";

// Landing for the trial offer email's button (libs/email/trial-offer.ts):
// starts the opt-in Pro trial and drops the user on the dashboard. Signed-out
// visitors are sent to /login by proxy.ts, which brings them back here.
// Anyone who can't have it (already had a trial, on a paid plan) gets plans.
export async function GET(req: Request) {
  const result = await startProTrialAction();
  const target = "error" in result ? "/dashboard/subscription" : "/dashboard";
  return NextResponse.redirect(new URL(target, req.url));
}

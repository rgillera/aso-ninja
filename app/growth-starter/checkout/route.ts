import { NextResponse } from "next/server";
import { createGrowthStarterCheckoutAction } from "@/features/subscription/growthStarter";

// The Growth Starter page's buy button. Sends the user to Stripe checkout;
// signed-out visitors sign up first and come back here via ?next.
export async function GET(req: Request) {
  const result = await createGrowthStarterCheckoutAction();
  if ("url" in result) return NextResponse.redirect(result.url, 303);

  const target =
    result.error === "signed_out"
      ? "/signup?next=/growth-starter/checkout"
      : result.error === "subscribed"
        ? "/growth-starter?error=subscribed"
        : "/growth-starter?error=checkout";
  return NextResponse.redirect(new URL(target, req.url), 303);
}

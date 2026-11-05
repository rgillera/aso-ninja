import { NextResponse } from "next/server";
import { createGrowthStarterCheckoutAction } from "@/features/subscription/growthStarter";

// The Growth Starter page's buy button. Sends the user to Stripe checkout;
// signed-out visitors sign up first and come back here via ?next. A Pro
// bonus link's ?offer token rides along the whole way.
export async function GET(req: Request) {
  const offer = new URL(req.url).searchParams.get("offer");
  const offerQuery = offer ? `?offer=${encodeURIComponent(offer)}` : "";

  const result = await createGrowthStarterCheckoutAction(offer);
  if ("url" in result) return NextResponse.redirect(result.url, 303);

  const target =
    result.error === "signed_out"
      ? `/signup?next=${encodeURIComponent(`/growth-starter/checkout${offerQuery}`)}`
      : result.error === "offer_expired"
        ? `/growth-starter${offerQuery}`
        : result.error === "subscribed"
          ? `/growth-starter?error=subscribed${offer ? `&offer=${encodeURIComponent(offer)}` : ""}`
          : `/growth-starter?error=checkout${offer ? `&offer=${encodeURIComponent(offer)}` : ""}`;
  return NextResponse.redirect(new URL(target, req.url), 303);
}

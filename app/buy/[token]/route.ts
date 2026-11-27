import { NextRequest, NextResponse } from "next/server";
import { createStripeClient } from "@/libs/stripe/server";
import { createBundleCheckoutSession, readBundleLinkToken } from "@/libs/stripe/bundle-link";

type Props = { params: Promise<{ token: string }> };

// A bundle link from Admin → Bundle Links (libs/stripe/bundle-link.ts):
// sends the buyer to a fresh Stripe checkout while the link lasts.
export async function GET(request: NextRequest, { params }: Props) {
  const { token } = await params;
  const read = readBundleLinkToken(token);
  if (read.status !== "valid") {
    return NextResponse.redirect(new URL(`/offer-expired${read.status === "invalid" ? "?invalid=1" : ""}`, request.url), 303);
  }

  const session = await createBundleCheckoutSession(createStripeClient(), read.link).catch((err: unknown) => {
    console.error("Bundle checkout failed:", err);
    return null;
  });
  if (!session?.url) {
    return new NextResponse("Checkout is unavailable right now. Please try again in a minute, or email hello@appaso.io.", { status: 503 });
  }
  return NextResponse.redirect(session.url, 303);
}

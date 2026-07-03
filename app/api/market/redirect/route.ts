import { NextRequest, NextResponse } from "next/server";
import { fetchIosPrivacyPolicyUrl } from "@/libs/store/appstore";
import { fetchAndroidPrivacyPolicyUrl } from "@/libs/store/googleplay";

// GET /api/market/redirect?store=ios|android&storeId=...&country=us&fallback=<url>
// Sends the growth team straight to the developer's privacy policy — useful
// for compliance/outreach vetting — instead of the store listing itself.
// iOS: scraped from the app's store page HTML (no API field for it).
// Android: Play's app() detail response has a real, structured field for it.
// Both fall back to the store listing (or the Play Store home page, if
// there's no storeId at all) when no privacy link is found.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get("store") === "android" ? "android" : "ios";
  const storeId = searchParams.get("storeId");
  const country = (searchParams.get("country") ?? "US").toLowerCase();
  const fallback = searchParams.get("fallback");

  if (store === "android") {
    const defaultFallback = fallback || (storeId ? `https://play.google.com/store/apps/details?id=${storeId}` : "https://play.google.com/store");
    if (!storeId) return NextResponse.redirect(defaultFallback);

    const privacyUrl = await fetchAndroidPrivacyPolicyUrl(storeId, country);
    return NextResponse.redirect(privacyUrl || defaultFallback);
  }

  const defaultFallback = fallback || (storeId ? `https://apps.apple.com/${country}/app/id${storeId}` : "https://apps.apple.com");
  if (!storeId) return NextResponse.redirect(defaultFallback);

  const privacyUrl = await fetchIosPrivacyPolicyUrl(storeId, country);
  return NextResponse.redirect(privacyUrl || defaultFallback);
}

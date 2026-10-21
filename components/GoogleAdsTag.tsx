import Script from "next/script";
import { GOOGLE_ADS_ID } from "@/libs/google-ads";

// Loaded site-wide, not just in the dashboard: the tag has to run on the ad's
// landing page to store the click ID (gclid) in a first-party cookie, which is
// what lets the conversions fired later in onboarding be credited to the ad.
export function GoogleAdsTag() {
  if (!GOOGLE_ADS_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} strategy="afterInteractive" />
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
      </Script>
    </>
  );
}

// Google Ads conversion tracking. Like libs/mixpanel.ts, every value here is
// unset in local dev and preview deployments, so the tag never loads and
// every helper below is a no-op there.
//
// NEXT_PUBLIC_GOOGLE_ADS_ID is the account's tag ID ("AW-123456789"). Each
// conversion action created in Google Ads gets its own label, the part after
// the slash in its "send_to" value.
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

export const ADS_CONVERSIONS = {
  // A new, app-less workspace reached the onboarding wizard: the account
  // exists and the email (if required) is verified.
  signup: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL,
  // The wizard finished with an app and at least one keyword saved. This is
  // the one to set as the campaign's primary conversion.
  activation: process.env.NEXT_PUBLIC_GOOGLE_ADS_ACTIVATION_LABEL,
};

type Gtag = (...args: unknown[]) => void;

// Longest we'll hold up a navigation waiting for gtag's callback. The hit
// itself is sent with a beacon, so it usually survives the page unloading
// even if the callback never arrives.
const CALLBACK_TIMEOUT_MS = 800;

// Resolves once Google has the hit, or after the timeout, so callers can
// await it right before a hard navigation. `transactionId` lets Google Ads
// drop repeats: firing the same conversion twice for one workspace (a
// reload, a second tab) still counts once.
export function trackAdsConversion(label: string | undefined, transactionId: string): Promise<void> {
  const gtag = (window as Window & { gtag?: Gtag }).gtag;
  if (!GOOGLE_ADS_ID || !label || !gtag) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(resolve, CALLBACK_TIMEOUT_MS);
    gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${label}`,
      transaction_id: transactionId,
      transport_type: "beacon",
      event_callback: () => {
        clearTimeout(timer);
        resolve();
      },
    });
  });
}

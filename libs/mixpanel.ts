import mixpanel from "mixpanel-browser";

// Unset in local dev and preview deployments, so every helper below is a
// no-op there and nothing is sent to the production Mixpanel project.
const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let initialized = false;

export function initMixpanel() {
  if (!token || initialized) return;
  mixpanel.init(token, {
    // With autocapture on, its own `pageview` option replaces the top-level
    // track_pageview. "url-with-path" fires on client-side (history API)
    // navigations too, but not on query-only changes like ?ws= switches.
    // Page views only: interaction events (clicks, inputs, submits) fired on
    // every keyword add and drowned out the navigation data.
    autocapture: {
      pageview: "url-with-path",
      click: false,
      dead_click: false,
      rage_click: false,
      input: false,
      submit: false,
      scroll: false,
    },
    persistence: "localStorage",
  });
  initialized = true;
}

export function identifyUser(userId: string, email: string | undefined) {
  if (!initialized) return;
  mixpanel.identify(userId);
  if (email) {
    mixpanel.people.set({ $email: email });
    // Super property: attached to every event sent after this, so event
    // lists can be filtered by email without joining to the user profile.
    mixpanel.register({ email });
  }
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  mixpanel.track(name, props);
}

// Called on sign-out so the next person on this browser isn't merged into
// the previous user's profile.
export function resetAnalytics() {
  if (!initialized) return;
  mixpanel.reset();
}

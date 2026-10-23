import { createAdminClient } from "@/libs/supabase/admin";
import { createRealUserClient, isImpersonating } from "@/libs/supabase/server";

// Server-side product events. Two destinations:
//   - Mixpanel, for every event here (libs/mixpanel.ts only sees page views
//     from the browser). Sent over Mixpanel's HTTP API with the user id as
//     distinct_id, which is the same id MixpanelIdentify identifies the
//     browser with, so both land on one profile.
//   - user_events, for the few events the super admin Engagement page needs
//     and that no other table records (see recordUserEvent).
// Call these inside after() from next/server so the response never waits
// on analytics, and never let them throw.

// Same token as the browser SDK; unset in local dev and previews, so
// nothing is sent to the production project from there.
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

export async function trackServerEvent(userId: string, name: string, props?: Record<string, unknown>) {
  if (!MIXPANEL_TOKEN) return;
  try {
    await fetch("https://api.mixpanel.com/track", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/plain" },
      // A slow Mixpanel shouldn't keep the serverless function alive.
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify([
        {
          event: name,
          properties: {
            ...props,
            token: MIXPANEL_TOKEN,
            distinct_id: userId,
            time: Math.floor(Date.now() / 1000),
            $insert_id: crypto.randomUUID(),
          },
        },
      ]),
    });
  } catch {
    // Analytics must never break the app.
  }
}

// For route handlers that don't otherwise look up the user. Skipped while a
// super admin is viewing as someone, like ActivityHeartbeat.
export async function trackCurrentUserEvent(name: string, props?: Record<string, unknown>) {
  try {
    if (await isImpersonating()) return;
    const supabase = await createRealUserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await trackServerEvent(user.id, name, props);
  } catch {
    // Analytics must never break the app.
  }
}

// Events stored in user_events (read by the admin_user_milestones RPC), with
// the name each one is sent to Mixpanel under.
const STORED_EVENTS = {
  tour_completed: "Tour Completed",
  checkout_started: "Checkout Started",
  checkout_completed: "Checkout Completed",
} as const;

export type StoredEventName = keyof typeof STORED_EVENTS;

// `ref` dedupes retries of the same occurrence (e.g. a Stripe webhook
// delivered twice for one checkout session).
export async function recordUserEvent(
  userId: string,
  name: StoredEventName,
  { props = {}, ref }: { props?: Record<string, unknown>; ref?: string } = {}
) {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("user_events")
      .upsert({ user_id: userId, name, props, ref: ref ?? null }, { onConflict: "name,ref", ignoreDuplicates: true })
      .select("id");
    // A duplicate ref is a retry; it was already sent to Mixpanel.
    if (!data?.length) return;
    await trackServerEvent(userId, STORED_EVENTS[name], props);
  } catch {
    // Analytics must never break the app.
  }
}

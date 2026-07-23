import webpush from "web-push";

let configured = false;

// web-push's setVapidDetails is a global, module-level call — guard so
// repeated imports across route handlers in the same process don't redo it.
export function getWebPushClient() {
  if (!configured) {
    webpush.setVapidDetails(
      "mailto:hello@appaso.io",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    configured = true;
  }
  return webpush;
}

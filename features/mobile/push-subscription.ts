// Shared by anywhere that needs to flip rank-change alerts for one app
// (currently NotificationSettingsList.tsx) — registers the device's single
// push endpoint on first use, then layers per-app opt-in on top of it.
// See push_app_subscriptions migration for why those are two separate tables.

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function ensureDeviceSubscription(): Promise<void> {
  const registration = await navigator.serviceWorker.register("/sw-mobile.js", {
    scope: "/mobile",
    updateViaCache: "none",
  });
  const existing = await registration.pushManager.getSubscription();
  if (existing) return;

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  });
}

export async function enableAppAlerts(appId: string): Promise<void> {
  await ensureDeviceSubscription();
  await fetch("/api/push/subscribe-app", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId }),
  });
}

export async function disableAppAlerts(appId: string): Promise<void> {
  await fetch("/api/push/unsubscribe-app", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId }),
  });
}

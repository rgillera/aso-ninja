"use client";

import { useEffect, useState } from "react";
import { isIosDevice, isStandaloneDisplay } from "@/features/mobile/pwa-install";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = "checking" | "unsupported" | "subscribed" | "unsubscribed";

export function NotificationToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  // iOS only exposes the Push API once the app's been added to the home
  // screen — distinguishes "not installed yet" from a genuinely unsupported
  // browser, so the message can actually tell you what to do about it.
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNeedsInstall(isIosDevice() && !isStandaloneDisplay());
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker
      .register("/sw-mobile.js", { scope: "/mobile", updateViaCache: "none" })
      .then(async (registration) => {
        const sub = await registration.pushManager.getSubscription();
        setStatus(sub ? "subscribed" : "unsubscribed");
      })
      .catch(() => setStatus("unsupported"));
  }, []);

  async function subscribe() {
    // Subscribing is account-wide, not scoped to whichever app/workspace
    // you're currently viewing (push_subscriptions has no app_id/workspace_id
    // — see supabase/migrations/20260723000001_push_subscriptions.sql), so
    // make that explicit before turning it on rather than let the button's
    // per-page placement imply it's just for this one app.
    if (!window.confirm("This turns on rank-change alerts for every app across every workspace you have access to, not just this one. Continue?")) {
      return;
    }
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
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
      setStatus("subscribed");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;
  if (status === "unsupported") {
    return (
      <p className="text-xs text-gray-600">
        {needsInstall
          ? "Add this app to your home screen to enable notifications."
          : "Push notifications aren’t supported in this browser."}
      </p>
    );
  }

  return (
    <button
      onClick={status === "subscribed" ? unsubscribe : subscribe}
      disabled={busy}
      className="rounded-md bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/[0.1] disabled:opacity-50"
    >
      {status === "subscribed" ? "Notifications on" : "Enable rank-change alerts"}
    </button>
  );
}

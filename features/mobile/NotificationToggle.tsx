"use client";

import { useEffect, useState } from "react";
import { isIosDevice, isStandaloneDisplay } from "@/features/mobile/pwa-install";
import { countryFlag } from "@/libs/countries";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = "checking" | "unsupported" | "subscribed" | "unsubscribed";

export function NotificationToggle({
  appId,
  appName,
  country,
}: {
  appId: string;
  appName: string;
  country: string | null;
}) {
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
    let cancelled = false;
    fetch(`/api/push/app-status?appId=${appId}`)
      .then((r) => r.json())
      .then(({ enabled }: { enabled: boolean }) => {
        if (!cancelled) setStatus(enabled ? "subscribed" : "unsubscribed");
      })
      .catch(() => {
        if (!cancelled) setStatus("unsubscribed");
      });
    return () => {
      cancelled = true;
    };
  }, [appId]);

  async function subscribe() {
    // Alerts are scoped to this one app+country row (see push_app_subscriptions
    // migration) — an app tracked in several countries needs a separate toggle
    // per country, so make that explicit before subscribing rather than let
    // people assume one toggle covers every country they track.
    const scope = country ? `${appName} (${country})` : appName;
    if (!window.confirm(`Enable rank-change alerts for ${scope}?\n\nYou'll only be notified for this country. If you track ${appName} in other countries, enable alerts separately for each one.`)) {
      return;
    }
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw-mobile.js", {
        scope: "/mobile",
        updateViaCache: "none",
      });
      // The device only needs one push registration total — reuse it if
      // some other app was already enabled, only create it the first time.
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
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
      await fetch("/api/push/subscribe-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });
      setStatus("subscribed");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      await fetch("/api/push/unsubscribe-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });
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
      {status === "subscribed"
        ? `Alerts on for ${appName}${country ? ` ${countryFlag(country)} ${country}` : ""}`
        : `Enable rank-change alerts for ${appName}${country ? ` ${countryFlag(country)} ${country}` : ""}`}
    </button>
  );
}

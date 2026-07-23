"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { isIosDevice, isStandaloneDisplay } from "@/features/mobile/pwa-install";

// Chrome/Android fires this before showing its own install UI — capturing
// it lets us trigger that same native prompt from our own button instead of
// just linking out to browser-menu instructions. Not part of any official
// TS lib yet, hence the manual type.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "aso:install-banner-dismissed";

export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneDisplay() || localStorage.getItem(DISMISS_KEY)) return;
    setIsIOS(isIosDevice());
    setVisible(true);

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 bg-indigo-500/15 px-4 py-2.5 text-xs text-indigo-200">
      <span className="flex-1">
        {isIOS ? (
          <>Install this app to get push notifications — tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.</>
        ) : (
          "Install this app to your home screen to get push notifications for rank changes."
        )}
      </span>
      {!isIOS && deferredPrompt && (
        <button
          onClick={install}
          className="shrink-0 rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-400"
        >
          Install
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-indigo-300 hover:text-white">
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { loadOnboarding, saveOnboarding } from "./onboarding-checklist";
import { AppSearchDemo, KeywordTableDemo, RankChartDemo, PushNotificationDemo } from "./demo";

type Props = {
  hasApp: boolean;
  workspaceId: string;
};

function WelcomePage() {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="flex items-center justify-center size-14 rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-500/20 mb-5">
        <RocketLaunchIcon className="size-7 text-indigo-400" />
      </div>
      <p className="text-sm text-gray-400 max-w-sm">
        Here&rsquo;s a quick look at how to track and monitor your app&rsquo;s keywords —
        it only takes a minute.
      </p>
    </div>
  );
}

function AddAppPage() {
  return (
    <div>
      <AppSearchDemo />
      <p className="mt-4 text-xs text-gray-500">
        Search for your app by name, bundle ID, or store URL to start tracking it.
      </p>
    </div>
  );
}

function AddKeywordsPage() {
  return (
    <div>
      <KeywordTableDemo />
      <p className="mt-4 text-xs text-gray-500">
        Every keyword you add is scored for Relevancy and Opportunity, so you can see which ones
        are worth chasing first.
      </p>
    </div>
  );
}

function MonitorPage() {
  return (
    <div>
      <RankChartDemo />
      <p className="mt-4 text-xs text-gray-500">
        This is sample data, not yours. Once you add your own app and keywords, we check rank
        daily and show your real numbers the same way.
      </p>
    </div>
  );
}

function NotifyPage() {
  return (
    <div>
      <PushNotificationDemo />
      <p className="mt-4 text-xs text-gray-500">
        Install the rankings monitor to your home screen and get a push notification the moment
        a keyword makes a big move — up or down.
      </p>
    </div>
  );
}

const PAGES = [WelcomePage, AddAppPage, AddKeywordsPage, MonitorPage, NotifyPage];
const PAGE_TITLES = [
  "Welcome to AppASO",
  "Add your app",
  "Add keywords to track",
  "Monitor rankings over time",
  "Get notified on your phone",
];

export function OnboardingWelcomeModal({ hasApp, workspaceId }: Props) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  // Shown once, the first time a brand-new (app-less) workspace loads the
  // dashboard. If the workspace already has an app on that first check,
  // it's an existing user who onboarded organically before this shipped —
  // mark it seen without ever showing anything.
  useEffect(() => {
    if (!workspaceId) return;
    const stored = loadOnboarding(workspaceId);
    if (stored) return;
    if (hasApp) {
      saveOnboarding(workspaceId, { seen: true });
      return;
    }
    setShow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Manual reopen from the sidebar's "Onboarding steps" link — independent
  // of the once-per-workspace auto-show above.
  useEffect(() => {
    function onOpen() {
      setStep(0);
      setShow(true);
    }
    window.addEventListener("aso:open-onboarding", onOpen);
    return () => window.removeEventListener("aso:open-onboarding", onOpen);
  }, []);

  function close() {
    saveOnboarding(workspaceId, { seen: true });
    setShow(false);
  }

  if (!show) return null;

  const isLast = step === PAGES.length - 1;
  const Page = PAGES[step];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <div className="relative z-10 w-full max-w-2xl bg-[#141417] rounded-2xl ring-1 ring-white/[0.1] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-medium text-gray-300">{PAGE_TITLES[step]}</h2>
          <button onClick={close} aria-label="Close" className="text-gray-600 hover:text-white transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <Page />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.07] shrink-0">
          <div className="flex items-center gap-1.5">
            {PAGES.map((_, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full transition-colors ${i === step ? "bg-indigo-400" : "bg-white/15"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? close() : setStep((s) => s + 1))}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import { useLayoutEffect, useState } from "react";
import { ADS_CONVERSIONS, trackAdsConversion } from "@/libs/google-ads";
import { loadOnboarding, saveOnboarding } from "./onboarding-checklist";
import { OnboardingWizard } from "./OnboardingWizard";

type Props = {
  hasApp: boolean;
  workspaceId: string;
  /** The dashboard layout's server-side call (no apps, no onboarded cookie). */
  initialShow: boolean;
};

// A brand-new (app-less) workspace gets one locked first-run wizard: search
// for an app, add its first keyword, then straight to Keywords Research —
// no spotlight tour afterward. See OnboardingWizard.tsx for why it's locked.
export function Onboarding({ hasApp, workspaceId, initialShow }: Props) {
  // Starts from the server's call, so a brand-new signup's very first HTML
  // is already covered (see `mounted` below) instead of showing the
  // dashboard home until the client decides. Starting from false and
  // deciding in the effect alone flashed the home page: the server HTML
  // paints before any client effect can run.
  const [show, setShow] = useState(initialShow);
  // The wizard portals into document.body, which doesn't exist during SSR,
  // so until mount a plain cover in the wizard's backdrop color stands in.
  const [mounted, setMounted] = useState(false);

  // Confirms (or corrects) the server's call once the client knows the real
  // active workspace and the localStorage flag. useLayoutEffect (not
  // useEffect) so it commits before the browser paints.
  useLayoutEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMounted(true);
    if (!workspaceId) return;
    const stored = loadOnboarding(workspaceId);
    if (stored?.seen) {
      // Re-saves to backfill the cookie for anyone who onboarded before it
      // existed, so the server stops guessing wrong for them.
      saveOnboarding(workspaceId, { seen: true });
      setShow(false);
      return;
    }
    if (hasApp) {
      // Existing user who onboarded organically before this shipped — mark
      // it seen without ever showing anything.
      saveOnboarding(workspaceId, { seen: true });
      setShow(false);
      return;
    }
    setShow(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Fires again on each reload until the wizard is finished; the workspace
    // ID as transaction ID keeps Google Ads counting it once.
    trackAdsConversion(ADS_CONVERSIONS.signup, `signup-${workspaceId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Deliberately does not setShow(false): OnboardingWizard's finish handler
  // always follows this with a hard page navigation (window.location.href —
  // see its handleFinish for why), so this whole component tree is about to
  // be torn down by the browser regardless. Unmounting the wizard here first
  // would reveal whatever page sits underneath it (My Apps, the default
  // dashboard landing page) for a frame before that navigation lands —
  // exactly the flicker this is avoiding.
  function handleDone() {
    saveOnboarding(workspaceId, { seen: true });
  }

  if (!show) return null;
  if (!mounted) return <div className="fixed inset-0 z-[9999] bg-[#08080a] light:bg-[#f7f7f8]" />;
  return <OnboardingWizard workspaceId={workspaceId} onDone={handleDone} />;
}

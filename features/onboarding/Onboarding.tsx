"use client";

import { useEffect, useState } from "react";
import { loadOnboarding, saveOnboarding } from "./onboarding-checklist";
import { OnboardingWizard } from "./OnboardingWizard";

type Props = {
  hasApp: boolean;
  workspaceId: string;
};

// A brand-new (app-less) workspace gets one locked first-run wizard: search
// for an app, add its first keyword, then straight to Keywords Research —
// no spotlight tour afterward. See OnboardingWizard.tsx for why it's locked.
export function Onboarding({ hasApp, workspaceId }: Props) {
  const [show, setShow] = useState(false);

  // Decide once, the first time this workspace loads, whether to show it.
  useEffect(() => {
    if (!workspaceId) return;
    const stored = loadOnboarding(workspaceId);
    if (stored?.seen) return;
    if (hasApp) {
      // Existing user who onboarded organically before this shipped — mark
      // it seen without ever showing anything.
      saveOnboarding(workspaceId, { seen: true });
      return;
    }
    // Deferred to an effect (rather than a lazy useState initializer) on
    // purpose: localStorage isn't available during SSR, so reading it during
    // render would produce a hydration mismatch between server and client.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setShow(true);
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
  return <OnboardingWizard workspaceId={workspaceId} onDone={handleDone} />;
}

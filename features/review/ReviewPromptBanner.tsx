"use client";

import { useEffect, useState } from "react";
import { StarIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  dismissReviewPromptAction,
  getReviewPromptStateAction,
  markReviewPromptClickedAction,
  markReviewPromptShownAction,
} from "./actions";
import { TRUSTPILOT_REVIEW_URL } from "./constants";

function localDay(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Trustpilot ask, shown to everyone who qualifies (Trustpilot forbids only
// asking happy users, so there's no "are you enjoying it?" screen first).
// Eligibility lives in getReviewPromptStateAction.
export function ReviewPromptBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReviewPromptStateAction()
      .then((state) => {
        if (cancelled || !state.eligible) return;
        // Only once they've come back on a later day than signup, so
        // onboarding's AI-suggested keywords alone don't trigger it.
        if (localDay(new Date(state.signedUpAt)) === localDay(new Date())) return;
        setVisible(true);
        markReviewPromptShownAction().catch(() => {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 ring-1 ring-emerald-500/20 px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
        <StarIcon className="size-5 text-emerald-400 light:text-emerald-600" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white light:text-gray-900">Has AppASO made your app journey a little easier?</p>
        <p className="text-xs text-gray-400 light:text-gray-600">We pour our hearts into helping app makers like you grow. If we've helped, a few kind words on Trustpilot would truly make our day.</p>
      </div>

      <a
        href={TRUSTPILOT_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          markReviewPromptClickedAction().catch(() => {});
          setVisible(false);
        }}
        className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-400"
      >
        Leave a review
      </a>

      <button
        type="button"
        onClick={() => {
          dismissReviewPromptAction().catch(() => {});
          setVisible(false);
        }}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:text-gray-300 light:hover:text-gray-700 hover:bg-white/[0.06] light:hover:bg-black/[0.05] transition-colors"
        title="Maybe later"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

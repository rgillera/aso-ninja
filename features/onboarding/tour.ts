// The order first-timers are walked through in the coach mark that runs
// right after onboarding hands off to Keywords Research — see TourTooltip.tsx
// for the shared bubble UI, OnboardingWizard's handleFinish for how it's
// kicked off (`?tip=tour`), and KeywordResearchPage's `tourStep` state for
// where most of the steps actually live. Centralized (rather than each
// component keeping its own list) so the "N of 6" label a step shows agrees
// no matter which component is rendering it, and so adding/reordering a step
// only means editing this one array.
//
// Deliberately doesn't have its own step for every column — e.g. Volume was
// considered and dropped: it's fairly self-evident (a bar + a number) and
// already has its own hover `ColumnTooltip` on the header, so a forced,
// no-skip tour step for it would mostly just be one more click before a
// first-timer reaches the useful part of the page. Opportunity earns its
// step because it's the tool's actual differentiator (a blend of volume,
// difficulty, and relevancy the UI doesn't otherwise explain) and answers
// the one question the page exists to answer. Default to this same bar —
// self-evident + already has a hover tooltip — before adding another
// column as its own step.
//
// Spans three pages. "suggestions" (KeywordSuggestionsPanel) and
// "opportunity"/"inspect" (KeywordTable) live on Keywords Research, which
// owns the step state. "inspect" points at the top row's Inspect link; it
// has no Next button, because the click is the step: it carries `tip=tour`
// to the Keyword Inspector, which picks the tour back up on its own state
// for "inspectorSearches" (the stat cards) and "inspectorRank" (your app's
// rank + beatable spots). The Inspector is Pro, which new accounts have
// during the signup trial; if it's locked anyway (e.g. an invitee to a
// Free workspace) it skips straight to "sidebar". The Inspector is the payoff: how many people search
// the keyword and whether this app can rank for it, which is the question
// a first-timer came with.
//
// "sidebar" is last and lights up the Long Tail Keywords link in
// DashboardSidebar (a sibling of the page, reached via SidebarTourContext)
// with a Done button, not a forced click. It follows from the Inspector: if
// the keyword looks hard to rank for, long-tail variants are the next move.
// It used to point at Keyword Performance, which is mostly empty on day one
// (no rank history yet); that's still the fallback when Long Tail is locked.
// Whichever page is showing when the tour reaches it drives it: the
// Inspector normally, or Keywords Research if "inspect" was dismissed.
//
// Table and Opportunity used to be separate steps, and there was a forced
// "add a keyword" step (the wizard already had them add some) and an
// "export report" step on Keyword Performance. Folded or cut to keep the
// tour at six steps with the Inspector in it.
export const TOUR_STEPS = ["suggestions", "opportunity", "inspect", "inspectorSearches", "inspectorRank", "sidebar"] as const;
export type TourStep = typeof TOUR_STEPS[number];

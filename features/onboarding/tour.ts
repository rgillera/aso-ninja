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
// Driven by Keywords Research, which owns the step state. "suggestions"
// (KeywordSuggestionsPanel) and "opportunity"/"details" (KeywordTable) are
// on the page itself. "details" points at the top row's Details button and
// has no Next button, because the click is the step: it opens the side pane
// (InspectorSplit) on that keyword, and dismissing the step opens it the
// same way, so the rest of the tour always has its targets. The pane then
// carries the last three: "inspectorSearches" (the docked Inspector's stat
// strip) and "inspectorRank" (beatable spots + your app's rank), the payoff,
// since how many people search the keyword and whether this app can rank
// for it is the question a first-timer came with. The Inspector is Pro,
// which new accounts have during the signup trial; if it's locked anyway
// (e.g. an invitee to a Free workspace) "details" skips to "sidebar".
//
// "sidebar" is last and lights up the Keyword Performance link in
// DashboardSidebar (a sibling of the page, reached via SidebarTourContext)
// with a Done button, not a forced click: where the keywords they just
// researched get tracked from here on. Long Tail, which it used to point at,
// is a tab in the side pane now.
//
// It used to cross pages (the Inspect link carried `tip=tour` to the
// Inspector page); the side pane brought the rest onto one page. Table and
// Opportunity used to be separate steps, and there was a forced "add a
// keyword" step (the wizard already had them add some) and an "export
// report" step on Keyword Performance. Folded or cut to keep the tour at
// six steps with the Inspector in it.
export const TOUR_STEPS = ["suggestions", "opportunity", "details", "inspectorSearches", "inspectorRank", "sidebar"] as const;
export type TourStep = typeof TOUR_STEPS[number];

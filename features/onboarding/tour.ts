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
// The route answers a first-timer's questions in order: which keyword is
// best ("opportunity", where sorting puts it on top), how big and how hard
// is it ("inspectorSearches"), can I win it ("inspectorRank"), and if not,
// what instead ("longTail": most new apps can't take their head terms, and
// the Inspector step usually just showed that). It ends where they'll come
// back to day to day ("sidebar": Keyword Performance).
//
// Driven by Keywords Research, which owns the step state. "opportunity" and
// "details" (KeywordTable) are on the page itself. "details" points at the
// top row's Details button and has no Next button, because the click is the
// step: it opens the side pane (InspectorSplit) on that keyword, and
// dismissing the step opens it the same way, so the next steps always have
// their targets. The pane carries "inspectorSearches" (the docked
// Inspector's stat strip), "inspectorRank" (beatable spots + your app's
// rank) and "longTail" (its Long Tail tab; clicking it, or leaving the step
// any other way, opens the tab so they see the list). The Inspector and
// Long Tail are Pro, which new accounts have during the signup trial; if
// they're locked anyway (e.g. an invitee to a Free workspace) "details"
// skips to "sidebar".
//
// "sidebar" is last and lights up the Keyword Performance link in
// DashboardSidebar (a sibling of the page, reached via SidebarTourContext)
// with a Done button, not a forced click. Mostly empty on day one (no rank
// history yet), so it's a pointer, not a stop.
//
// Cut along the way: a Keyword Suggestions step (the wizard had just had
// them pick keywords, so it repeated it, and the panel's "+" chips explain
// themselves), a forced "add a keyword" step, and an "export report" step.
// It used to cross pages (the Inspect link carried `tip=tour` to the
// Inspector page); the side pane brought the rest onto one page.
export const TOUR_STEPS = ["opportunity", "details", "inspectorSearches", "inspectorRank", "longTail", "sidebar"] as const;
export type TourStep = typeof TOUR_STEPS[number];

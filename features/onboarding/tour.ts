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
// Spans four components across two pages because the tour points at things
// that live in different places: "suggestions" (KeywordSuggestionsPanel) and
// "table"/"addKeyword"/"opportunity" (KeywordTable) are all children of the
// Keywords Research page itself; "sidebar" points at DashboardSidebar — a
// sibling of that page under DashboardShell, reached via SidebarTourContext
// since it isn't a descendant the page can hand a prop to directly — and
// doubles as the handoff to the last step, since clicking the highlighted
// Keyword Performance link (while this step is active) is what carries the
// `tip=tour-export` continuation into the next page load. "exportReport"
// then lands on the Keyword Performance page (a full navigation, not a
// client-side route change — see DashboardSidebar's Keyword Performance
// link — so this step's state is re-derived from that query param rather
// than carried over in memory) and points at PerformanceFilters' Export
// Keyword Report button, reached via KeywordPerformancePage's own
// `tourStep` state, the same pattern as the Research page's.
export const TOUR_STEPS = ["suggestions", "table", "addKeyword", "opportunity", "sidebar", "exportReport"] as const;
export type TourStep = typeof TOUR_STEPS[number];

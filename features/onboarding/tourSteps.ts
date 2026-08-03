export type TourStep = {
  /** Matches a `data-tour` attribute on the element to spotlight. */
  target: string;
  title: string;
  body: string;
  /** True when the target lives inside the (collapsible-on-mobile) sidebar. */
  inSidebar?: boolean;
};

export const TOUR_STEPS: TourStep[] = [
  {
    target: "workspace-switcher",
    title: "Welcome to AppASO",
    body: "This is your workspace, where every app, keyword, and report you track lives. You can create more workspaces anytime.",
    inSidebar: true,
  },
  {
    target: "app-search",
    title: "Add your first app",
    body: "Search by name, bundle ID, or store URL to start tracking an app's keywords and rankings.",
  },
  {
    target: "nav-reports",
    title: "Reports",
    body: "Once you've added an app, this is where you'll see how it's performing at a glance.",
    inSidebar: true,
  },
  {
    target: "nav-keywords",
    title: "Keywords",
    body: "Research, track, and score keywords by Relevancy and Opportunity. This is the heart of ASO.",
    inSidebar: true,
  },
  {
    target: "learning-center",
    title: "Need a hand?",
    body: "The Learning Center has guides for everything, and you can restart this tour anytime from here.",
    inSidebar: true,
  },
];

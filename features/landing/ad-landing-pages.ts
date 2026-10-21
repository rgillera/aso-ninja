import { PLANS } from "@/features/subscription/plans";

// Landing pages for paid search, served at /try/<slug>. Each one matches a
// single ad group's keywords so the headline repeats what the person just
// searched for. Kept out of search results (noindex, no sitemap entry): the
// blog's comparison posts are the pages meant to rank organically.
//
// Competitor figures come from features/blog/comparison-posts.ts, checked
// against each company's pricing page on 2026-10-03. Update both together.
// Only competitors AppASO is clearly cheaper than get a page here: Sonar
// costs the same as Pro and Astro costs less, so a "cheaper alternative"
// pitch would be misleading for them.

const pro = PLANS.find((plan) => plan.id === "pro")!;
const proMonthly = `$${pro.priceMonthlyCents / 100}/mo`;
const proYearlyPerMonth = `$${Math.round(pro.priceYearlyCents / 1200)}/mo`;
export const PRO_PRICE = `${proMonthly}, or ${proYearlyPerMonth} billed yearly`;

export type AdLandingPage = {
  slug: string;
  metaTitle: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  subhead: string;
  comparison?: {
    competitor: string;
    competitorPlan: string;
    rows: [label: string, competitor: string, appaso: string][];
    // Shown under the table. Being upfront about where the other tool wins
    // makes the rest of the table believable.
    theyWin: string;
  };
};

const FREE_PLAN = "Yes: 100 keywords, 2 apps, free forever";

export const AD_LANDING_PAGES: AdLandingPage[] = [
  {
    slug: "aso-tool",
    metaTitle: "ASO Tool for App Store & Google Play",
    eyebrow: "Built for App Store & Google Play",
    headline: "The ASO tool for indie developers,",
    headlineAccent: "free to start.",
    subhead:
      "Find the keywords worth ranking for, track them on both stores, and see which ones bring in downloads. Add your app and get your first keyword report in about 2 minutes.",
  },
  {
    slug: "apptweak-alternative",
    metaTitle: "AppTweak Alternative, Free to Start",
    eyebrow: "AppTweak alternative",
    headline: "Everything you use AppTweak for,",
    headlineAccent: "without the $249/mo plan.",
    subhead:
      "Relevancy scoring, downloads per keyword, and unlimited tracked keywords on both stores. Start free, then upgrade to Pro from " +
      proYearlyPerMonth +
      " when you need more.",
    comparison: {
      competitor: "AppTweak",
      competitorPlan: "AppTweak Grow",
      rows: [
        ["Price", "$249/mo", PRO_PRICE],
        ["Free plan", "No", FREE_PLAN],
        ["Tracked keywords", "1,500", "Unlimited"],
        ["Apps", "10", "Unlimited"],
        ["Relevancy scoring", "Yes", "Yes, 1,000 keywords"],
        ["Downloads per keyword", "Yes", "Yes, from your own store totals"],
        ["History", "12 months", "6 months (1 year on Pro+)"],
      ],
      theyWin:
        "AppTweak has a far larger dataset, daily rankings, and market-wide intelligence. If you report long-term trends across a big portfolio, it's worth the price. AppASO's tracked rankings refresh at least weekly.",
    },
  },
  {
    slug: "mobileaction-alternative",
    metaTitle: "MobileAction Alternative, Free to Start",
    eyebrow: "MobileAction alternative",
    headline: "Downloads per keyword",
    headlineAccent: "without paying $239/mo.",
    subhead:
      "MobileAction keeps downloads per keyword on its Pro plan. AppASO Pro includes it, plus unlimited keywords and apps, from " +
      proYearlyPerMonth +
      ". Or start on the free plan.",
    comparison: {
      competitor: "MobileAction",
      competitorPlan: "MobileAction Pro",
      rows: [
        ["Price", "$239/mo ($199 billed yearly)", PRO_PRICE],
        ["Free plan", "No, Lite starts at $15/mo", FREE_PLAN],
        ["Tracked keywords", "1,500", "Unlimited"],
        ["Apps", "10", "Unlimited"],
        ["Downloads per keyword", "Yes", "Yes, from your own store totals"],
        ["Competitors per app", "15", "5 (8 on Pro+)"],
      ],
      theyWin:
        "MobileAction goes much deeper on Apple Search Ads campaign management and tracks more competitors per app. If paid UA is central to your growth, it earns its price. AppASO focuses on organic ASO, and its tracked rankings refresh at least weekly.",
    },
  },
];

export function getAdLandingPage(slug: string): AdLandingPage | undefined {
  return AD_LANDING_PAGES.find((page) => page.slug === slug);
}

export type PlanId = "free" | "basic" | "pro" | "pro_plus" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthlyCents: number;
  // Already discounted, and picked so the per-month yearly price is a round
  // number ($29 / $79) — not derived at render time.
  priceYearlyCents: number;
  description: string;
  badge: string | null;
  features: string[];
  trialDays?: number;
  // No longer sold. Kept so existing subscribers still resolve to a plan
  // name/price, but hidden from every pricing grid.
  retired?: boolean;
  // Priced per deal: cards show "Custom" and the CTA books a call instead of
  // going to Stripe checkout.
  contactSales?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Plan",
    priceMonthlyCents: 0,
    priceYearlyCents: 0,
    description: "For trying it out on your own app. Free forever.",
    badge: "Always free",
    features: [
      "1 workspace",
      "1 seat",
      "Unlimited apps (iOS & Android)",
      "100 tracked keywords",
      "Keyword research & ranking tracking",
      "ASO reports & metadata optimization",
      "Relevancy & opportunity scoring (20 keywords)",
      "Keyword translations",
      "1 month of history",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    priceMonthlyCents: 1680,
    priceYearlyCents: 16800,
    description: "Unlimited keywords, keyword & ranking monitoring, and metadata optimization across unlimited apps.",
    badge: null,
    retired: true,
    features: [
      "Includes all in Free plan, plus:",
      "Unlimited keywords",
      "Relevancy & opportunity scoring (up to 100 keywords)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyCents: 3900,
    priceYearlyCents: 34800,
    description: "For indie developers and small teams growing their apps.",
    badge: null,
    features: [
      "Includes all in Free plan, plus:",
      "3 seats",
      "Unlimited keywords",
      "Relevancy & opportunity scoring (700 keywords)",
      "AI keyword suggestions",
      "Long tail keywords & intent grouping",
      "Est. downloads per keyword",
      "3 competitors per app",
      "ASA & Market Intelligence",
      "ASO certification exam",
      "6 months of history",
    ],
  },
  {
    id: "pro_plus",
    name: "Pro+",
    priceMonthlyCents: 9900,
    priceYearlyCents: 94800,
    description: "For studios managing a portfolio of apps.",
    badge: null,
    features: [
      "Includes all in Pro plan, plus:",
      "4 workspaces",
      "6 seats per workspace",
      "Relevancy & opportunity scoring (4,000 keywords)",
      "Ranked keywords & keyword simulator",
      "5 competitors per app",
      "1 year of history",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthlyCents: 179640,
    priceYearlyCents: 1796400,
    description: "For large publishers, global brands & agencies.",
    badge: null,
    contactSales: true,
    features: [
      "Includes all in Pro+ plan, plus:",
      "Custom number of keywords",
      "Custom relevancy & opportunity scoring",
      "Custom workspaces",
      "Custom seats",
      "Custom number of competitors",
      "Custom history",
    ],
  },
];

// What the pricing grids show: every plan still on sale.
export const SELLABLE_PLANS = PLANS.filter((plan) => !plan.retired);

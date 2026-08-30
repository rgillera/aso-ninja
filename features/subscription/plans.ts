export type PlanId = "free" | "basic" | "pro" | "pro_plus" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthlyCents: number;
  // Already discounted (10x monthly, i.e. 2 months free) — not derived at render time.
  priceYearlyCents: number;
  description: string;
  badge: string | null;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Plan",
    priceMonthlyCents: 0,
    priceYearlyCents: 0,
    description: "20 keywords, keyword research, and metadata optimization across unlimited apps — free forever.",
    badge: "Always free",
    features: [
      "1 workspace",
      "Unlimited apps (iOS & Android)",
      "1 competitor per app",
      "20 keywords",
      "Relevancy & opportunity scoring (up to 10 keywords)",
      "Metadata optimization",
      "Keyword research",
      "Keyword & ranking monitoring",
      "Keyword translations",
      "Installable mobile app (with keyword ranking push notifications)",
      "Live chat & email support",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    priceMonthlyCents: 1680,
    priceYearlyCents: 16800,
    description: "Unlimited keywords, keyword & ranking monitoring, and metadata optimization across unlimited apps.",
    badge: null,
    features: [
      "Includes all in Free plan, plus:",
      "Unlimited keywords",
      "Relevancy & opportunity scoring (up to 100 keywords)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyCents: 8040,
    priceYearlyCents: 80400,
    description: "Metadata timeline & benchmarking, AI keyword suggestions, review tracking, and relevancy & opportunity scoring (up to 700 keywords) across unlimited apps.",
    badge: null,
    features: [
      "Includes all in Basic plan, plus:",
      "3 competitors per app",
      "Est. downloads per keyword",
      "Relevancy & opportunity scoring (up to 700 keywords)",
      "AI keyword suggestions",
      "Long tail keyword tool",
      "Group by intent",
      "ASO Suggestions",
      "Metadata timeline & version history",
      "Metadata benchmark vs. category",
      "Reviews & ratings tracking",
      "ASA Intelligence",
      "Market Intelligence",
    ],
  },
  {
    id: "pro_plus",
    name: "Pro+",
    priceMonthlyCents: 23640,
    priceYearlyCents: 236400,
    description: "Everything in Pro, plus long tail keyword tools, ranked keywords, keyword simulator, and a bigger relevancy & opportunity scoring pool across unlimited apps.",
    badge: null,
    features: [
      "Includes all in Pro plan, plus:",
      "4 workspaces",
      "5 competitors per app",
      "Relevancy & opportunity scoring (up to 4,000 keywords)",
      "Ranked keywords view",
      "Keyword simulator",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthlyCents: 179640,
    priceYearlyCents: 1796400,
    description: "Everything in Pro+, plus a dedicated growth manager and ASO specialist to manage it all for you.",
    badge: null,
    features: [
      "Includes all in Pro+ plan, plus:",
      "1 dedicated growth manager",
      "1 dedicated ASO specialist",
      "Access to all features",
      "Live chat & email support",
    ],
  },
];

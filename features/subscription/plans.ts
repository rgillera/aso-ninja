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
  trialDays?: number;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Plan",
    priceMonthlyCents: 0,
    priceYearlyCents: 0,
    description: "20 keywords, keyword research, and metadata optimization for 1 app — free forever.",
    badge: "Always free",
    features: [
      "1 workspace",
      "20 keywords",
      "1 app & 1 competitor",
      "Metadata optimization",
      "Keyword research",
      "Installable mobile app (with keyword ranking push notifications)",
      "Live chat & email support",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    priceMonthlyCents: 840,
    priceYearlyCents: 8400,
    description: "Unlimited keywords, keyword & ranking monitoring, and metadata optimization across up to 5 apps.",
    badge: null,
    features: [
      "1 workspace",
      "Unlimited keywords",
      "5 apps & 1 competitor per app",
      "Metadata optimization",
      "Keyword research",
      "Keyword & ranking monitoring",
      "Keyword translations",
      "Installable mobile app (with keyword ranking push notifications)",
      "Live chat & email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyCents: 8040,
    priceYearlyCents: 80400,
    description: "Metadata timeline & benchmarking, AI keyword suggestions, review tracking, and relevancy & opportunity scoring (up to 500 keywords) across up to 10 apps.",
    badge: null,
    features: [
      "1 workspace",
      "Unlimited keywords",
      "Est. downloads per keyword",
      "Relevancy & opportunity scoring (up to 500 keywords)",
      "10 apps & 3 competitors per app",
      "Metadata optimization",
      "Keyword research",
      "Keyword & ranking monitoring",
      "Keyword translations",
      "Metadata timeline & version history",
      "Metadata benchmark vs. category",
      "Reviews & ratings tracking",
      "AI keyword suggestions",
      "Installable mobile app (with keyword ranking push notifications)",
      "Live chat & email support",
    ],
  },
  {
    id: "pro_plus",
    name: "Pro+",
    priceMonthlyCents: 23640,
    priceYearlyCents: 236400,
    description: "Everything in Pro, plus long tail keyword tools, ranked keywords, group by intent, and a bigger relevancy & opportunity scoring pool across up to 20 apps.",
    badge: null,
    features: [
      "4 workspaces",
      "Unlimited keywords",
      "Est. downloads per keyword",
      "Relevancy & opportunity scoring (up to 3,000 keywords)",
      "20 apps & 5 competitors per app",
      "Metadata optimization",
      "Advanced keyword research",
      "Keyword & ranking monitoring",
      "Keyword translations",
      "Metadata timeline & version history",
      "Metadata benchmark vs. category",
      "Reviews & ratings tracking",
      "AI keyword suggestions",
      "Long tail keyword tool",
      "Ranked keywords view",
      "Group by intent",
      "Installable mobile app (with keyword ranking push notifications)",
      "Live chat & email support",
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
      "All in Pro+ Plan",
      "1 dedicated growth manager",
      "1 dedicated ASO specialist",
      "Access to all features",
      "Live chat & email support",
    ],
  },
];

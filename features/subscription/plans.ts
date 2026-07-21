export type PlanId = "free" | "basic" | "pro" | "enterprise";

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
      "Live chat & email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyCents: 17640,
    priceYearlyCents: 176400,
    description: "Advanced keyword research with relevancy & opportunity scoring, AI keyword suggestions, metadata history & benchmarking, and review tracking across up to 10 apps.",
    badge: null,
    features: [
      "2 workspaces",
      "Unlimited keywords",
      "10 apps & 5 competitors per app",
      "Metadata optimization",
      "Advanced keyword research",
      "Relevancy & opportunity scoring",
      "Keyword & ranking monitoring",
      "Metadata timeline & version history",
      "Metadata benchmark vs. category",
      "Reviews & ratings tracking",
      "AI keyword suggestions",
      "Long tail keyword tool",
      "Ranked keywords view",
      "Group by intent",
      "Live chat & email support",
    ],
  },
  {
    id: "enterprise",
    name: "Managed ASO",
    priceMonthlyCents: 173640,
    priceYearlyCents: 1736400,
    description: "A dedicated growth manager and ASO specialist manage unlimited apps and keywords for you, with access to every feature.",
    badge: null,
    features: [
      "1 dedicated growth manager",
      "1 dedicated ASO specialist",
      "Unlimited workspaces & apps",
      "Unlimited keywords tracked",
      "Unlimited competitors per app",
      "Access to all features",
      "Live chat & email support",
    ],
  },
];

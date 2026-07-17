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
    description: "Track your first app with no cost and access essential app store metrics.",
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
    priceMonthlyCents: 1499,
    priceYearlyCents: 14990,
    description: "Solid keyword tracking and research for a handful of growing apps.",
    badge: "Free for 7 days",
    trialDays: 7,
    features: [
      "1 workspace",
      "400 keywords",
      "5 apps & 2 competitors per app",
      "Metadata optimization",
      "Keyword research",
      "Keyword & ranking monitoring",
      "Live chat & email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyCents: 8939,
    priceYearlyCents: 89390,
    description: "Advanced tracking and relevancy scoring for teams growing multiple apps.",
    badge: "Free for 7 days",
    trialDays: 7,
    features: [
      "1 workspace",
      "1,000 keywords",
      "10 apps & 5 competitors per app",
      "Metadata optimization",
      "Keyword research",
      "Keyword relevancy score",
      "Keyword opportunity score",
      "Keyword & ranking monitoring",
      "Live chat & email support",
    ],
  },
  {
    id: "pro_plus",
    name: "Pro+ Plan",
    priceMonthlyCents: 14900,
    priceYearlyCents: 149000,
    description: "Extra scale for product and marketing teams managing fast-growing portfolios.",
    badge: null,
    features: [
      "2 workspaces",
      "3,000 keywords",
      "20 apps & 10 competitors per app",
      "Advanced keyword research",
      "Keyword relevancy score",
      "Keyword opportunity score",
      "Keyword & ranking monitoring",
      "Live chat & email support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthlyCents: 149900,
    priceYearlyCents: 1499000,
    description: "Unlimited keyword tracking and scale for agencies managing large app portfolios.",
    badge: null,
    features: [
      "Unlimited workspaces & apps",
      "Unlimited keywords tracked",
      "Unlimited competitors per app",
      "Access to all features",
      "Live chat & email support",
    ],
  },
];

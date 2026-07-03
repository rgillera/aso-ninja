export type PlanId = "free" | "pro" | "pro_plus" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  description: string;
  badge: string | null;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Plan",
    price: "Free",
    cadence: "",
    description: "Track your first app with no cost and access essential app store metrics.",
    badge: "Always free",
    features: [
      "1 workspace",
      "20 keywords",
      "1 app & 1 competitor",
      "Metadata optimization",
      "Keyword research",
    ],
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: "$14.99",
    cadence: "/ mo",
    description: "Advanced tracking and collaboration for teams growing multiple apps.",
    badge: null,
    features: [
      "1 workspace",
      "500 keywords",
      "5 apps & 5 competitors per app",
      "Metadata optimization",
      "Keyword research",
    ],
  },
  {
    id: "pro_plus",
    name: "Pro+ Plan",
    price: "$149",
    cadence: "/ mo",
    description: "Extra scale for product and marketing teams managing fast-growing portfolios.",
    badge: "Most popular",
    features: [
      "2 workspaces",
      "2,500 keywords",
      "20 apps & 15 competitors per app",
      "Advanced keyword research",
      "Keyword & ranking monitoring",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$1,499",
    cadence: "/ mo",
    description: "Unlimited keyword tracking and scale for agencies managing large app portfolios.",
    badge: null,
    features: [
      "Unlimited workspaces & apps",
      "Unlimited keywords tracked",
      "Unlimited competitors per app",
      "Live chat & email support",
    ],
  },
];

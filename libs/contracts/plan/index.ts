export type PlanSlug = "free" | "pro" | "pro_plus" | "enterprise";

export type Plan = {
  id: string;
  slug: PlanSlug;
  name: string;
  price_monthly_cents: number;
  price_yearly_cents: number | null;
  keyword_limit: number | null;
  workspace_limit: number | null;
  member_limit: number | null;
  app_limit: number | null;
  competitor_limit: number | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  stripe_price_id_yearly: string | null;
  is_active: boolean;
  sort_order: number;
};

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export type WorkspaceUsage = {
  keyword_count: number;
  keyword_limit: number | null;
  app_count: number;
  app_limit: number | null;
  member_count: number;
  member_limit: number | null;
  workspace_count: number;
  workspace_limit: number | null;
};

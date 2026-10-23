import type Stripe from "stripe";
import { createStripeClient } from "@/libs/stripe/server";

export type StripeMrr = {
  // Whole MRR in the account's main currency (the one with the most revenue).
  cents: number;
  currency: string;
  // Other currencies, if any, which aren't converted into the main one.
  otherCurrencies: string[];
  subscriptions: number;
  testMode: boolean;
};

// Months per billing interval, to turn any recurring price into a monthly one.
const MONTHS_PER: Record<Stripe.Price.Recurring.Interval, number> = {
  day: 12 / 365,
  week: 12 / 52,
  month: 1,
  year: 12,
};

// Monthly recurring revenue straight from Stripe, the way its dashboard
// counts it: active and past_due subscriptions (not trials), every item's
// price normalized to a month, minus subscription-level coupons that are
// still running. One-off invoice items and usage-based prices without a unit
// amount aren't recurring list revenue and are skipped.
export async function fetchStripeMrr(): Promise<StripeMrr> {
  const stripe = createStripeClient();
  const now = Math.floor(Date.now() / 1000);
  const byCurrency = new Map<string, number>();
  let subscriptions = 0;

  for (const status of ["active", "past_due"] as const) {
    for await (const sub of stripe.subscriptions.list({
      status,
      limit: 100,
      expand: ["data.discounts.source.coupon"],
    })) {
      let monthly = 0;
      let months = 1;
      for (const item of sub.items.data) {
        const recurring = item.price.recurring;
        const unit = item.price.unit_amount ?? (item.price.unit_amount_decimal ? Number(item.price.unit_amount_decimal) : null);
        if (!recurring || unit === null) continue;
        months = MONTHS_PER[recurring.interval] * recurring.interval_count;
        monthly += (unit * (item.quantity ?? 1)) / months;
      }

      for (const d of sub.discounts) {
        if (typeof d === "string") continue;
        if (d.end && d.end < now) continue;
        const coupon = d.source.coupon;
        if (!coupon || typeof coupon === "string") continue;
        if (coupon.percent_off) monthly *= 1 - coupon.percent_off / 100;
        // amount_off comes off each invoice, so spread it over the
        // subscription's billing interval like the price.
        else if (coupon.amount_off) monthly -= coupon.amount_off / months;
      }

      if (monthly <= 0) continue;
      subscriptions += 1;
      byCurrency.set(sub.currency, (byCurrency.get(sub.currency) ?? 0) + monthly);
    }
  }

  const ranked = [...byCurrency].sort((a, b) => b[1] - a[1]);
  const [currency, cents] = ranked[0] ?? ["usd", 0];
  return {
    cents: Math.round(cents),
    currency,
    otherCurrencies: ranked.slice(1).map(([c]) => c),
    subscriptions,
    testMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false,
  };
}

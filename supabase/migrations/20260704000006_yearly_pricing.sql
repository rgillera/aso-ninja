-- Yearly billing option — 2 months free vs. paying monthly for 12 months
-- (yearly price = monthly price x 10).

alter table plans
  add column price_yearly_cents integer,
  add column stripe_price_id_yearly text;

update plans set price_yearly_cents = price_monthly_cents * 10;

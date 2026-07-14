-- Documentation only, no schema change.
--
-- stripe_price_id / stripe_price_id_yearly / stripe_product_id are
-- environment-specific: Stripe's Test and Live modes are entirely separate
-- object namespaces, so a price ID valid on one project (e.g. Staging,
-- which runs on a test-mode key) is never valid on another (e.g. Prod,
-- which runs live) — and vice versa.
--
-- Incident 2026-07-14: a migration set these columns to a hardcoded test-mode
-- price ID. It auto-synced to every environment including Prod, silently
-- overwriting Prod's correct live-mode ID and crashing checkout for real
-- users until caught.
--
-- Going forward: never hardcode stripe_price_id/stripe_price_id_yearly in a
-- migration's INSERT/UPDATE beyond initial scaffolding. Set the real value
-- per environment directly (Supabase Studio / `supabase db query --linked`
-- against that one project), the same way this table's own header comment
-- already says limits can be edited without a redeploy.

comment on column plans.stripe_product_id is
  'Stripe Product ID. Test/Live mode are separate namespaces — set per environment directly, never via a migration literal.';
comment on column plans.stripe_price_id is
  'Stripe Price ID (monthly). Test/Live mode are separate namespaces — set per environment directly, never via a migration literal.';
comment on column plans.stripe_price_id_yearly is
  'Stripe Price ID (yearly). Test/Live mode are separate namespaces — set per environment directly, never via a migration literal.';

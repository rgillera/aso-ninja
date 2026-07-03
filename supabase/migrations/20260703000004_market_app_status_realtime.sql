-- Enables live updates for the growth team's connected/unconnected toggle:
-- when one teammate flips a status, others viewing App Explorer see it
-- update immediately instead of only on next focus/reload.
--
-- Realtime's postgres_changes still enforces the table's existing RLS SELECT
-- policy per subscriber ("workspace members can read market app status"), so
-- a client only ever receives change events for workspaces they belong to —
-- same boundary already enforced for regular reads, not a new attack surface.
alter publication supabase_realtime add table market_app_status;

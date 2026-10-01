-- Pro goes from 1 seat to 3 seats per workspace, matching
-- features/subscription/plans.ts. member_limit counts non-owner members, so
-- 3 seats = owner + 2. Workspace limit stays at 1.

update plans set
  member_limit = 2,
  updated_at   = now()
where slug = 'pro';

-- Limit changes on the plans row don't trigger reconciliation on their own, so
-- unfreeze any members existing Pro subscribers had paused under the old
-- limit of 0.
select public.reconcile_plan_limits(s.user_id)
from subscriptions s
where s.plan_id = (select id from plans where slug = 'pro');

-- Roll ASA Intelligence out the same way aso_intelligence/market_intelligence
-- originally landed in 20260704000001_workspace_member_access.sql: default it
-- on for new members/invites, and backfill it onto everyone who already has
-- the other two areas so existing workspaces see the new section too.

alter table workspace_members
  alter column access set default array['aso_intelligence', 'market_intelligence', 'asa_intelligence']::workspace_access[];

alter table workspace_invites
  alter column access set default array['aso_intelligence', 'market_intelligence', 'asa_intelligence']::workspace_access[];

update workspace_members
  set access = access || 'asa_intelligence'::workspace_access
  where not (access @> array['asa_intelligence']::workspace_access[]);

update workspace_invites
  set access = access || 'asa_intelligence'::workspace_access
  where not (access @> array['asa_intelligence']::workspace_access[]);

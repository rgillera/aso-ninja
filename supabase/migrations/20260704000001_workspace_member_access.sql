-- Per-member product access scoping (ASO Intelligence / Market Intelligence)

create type workspace_access as enum ('aso_intelligence', 'market_intelligence');

alter table workspace_members
  add column access workspace_access[] not null default array['aso_intelligence', 'market_intelligence']::workspace_access[];

-- Account deletion removes the auth.users row. updated_by was the only FK to
-- auth.users without an on-delete rule, so it would block that delete when
-- the user had touched a market_app_status row in a workspace they don't own.

alter table market_app_status
  drop constraint market_app_status_updated_by_fkey,
  add constraint market_app_status_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;

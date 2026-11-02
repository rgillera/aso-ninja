-- keywords.term was only lowercased and trimmed, so "pet  reminder" or
-- "pet<nbsp>reminder" got past unique (workspace_id, term) as a second
-- keyword that renders identically to "pet reminder" (HTML collapses the
-- whitespace). Normalize like libs/keyword-term.ts, merge the existing
-- look-alikes into one keyword, and normalize every write from now on.

create or replace function public.normalize_keyword_term(t text)
returns text
language sql
immutable
set search_path to ''
as $$
  select lower(btrim(regexp_replace(
    regexp_replace(normalize(t, NFKC), '[\u200B-\u200D\u2060\uFEFF]', '', 'g'),
    '[[:space:]\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+', ' ', 'g'
  )))
$$;

-- Per (workspace, normalized term), keep the row already in normal form,
-- else the oldest.
create temp table keyword_merge as
with n as (
  select id, workspace_id, term, created_at, public.normalize_keyword_term(term) as nterm
  from public.keywords
), r as (
  select *, first_value(id) over (
    partition by workspace_id, nterm order by (term = nterm) desc, created_at, id
  ) as keeper
  from n
)
select id, keeper, term, nterm from r where id <> keeper or term <> nterm;

-- Move an app's link (and metrics row) onto the kept keyword unless it
-- already has one; when several look-alikes are linked to the same app, only
-- the first moves. Whatever doesn't move goes with its keyword below.
update public.app_keywords ak
set keyword_id = m.keeper
from keyword_merge m
where ak.keyword_id = m.id and m.id <> m.keeper
  and not exists (
    select 1 from public.app_keywords x where x.app_id = ak.app_id and x.keyword_id = m.keeper
  )
  and ak.id = (
    select ak2.id from public.app_keywords ak2
    join keyword_merge m2 on m2.id = ak2.keyword_id
    where ak2.app_id = ak.app_id and m2.keeper = m.keeper
    order by ak2.added_at, ak2.id
    limit 1
  );

update public.keyword_metrics km
set keyword_id = m.keeper
from keyword_merge m
where km.keyword_id = m.id and m.id <> m.keeper
  and not exists (
    select 1 from public.keyword_metrics x where x.app_id = km.app_id and x.keyword_id = m.keeper
  )
  and km.id = (
    select km2.id from public.keyword_metrics km2
    join keyword_merge m2 on m2.id = km2.keyword_id
    where km2.app_id = km.app_id and m2.keeper = m.keeper
    order by km2.updated_at desc, km2.id
    limit 1
  );

delete from public.keywords k
using keyword_merge m
where k.id = m.id and m.id <> m.keeper;

update public.keywords k
set term = m.nterm
from keyword_merge m
where k.id = m.id and m.id = m.keeper;

drop table keyword_merge;

-- A BEFORE trigger runs ahead of ON CONFLICT arbitration, so the save
-- route's upsert on (workspace_id, term) matches the normalized row.
create or replace function public.normalize_keyword_term_on_write()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.term := public.normalize_keyword_term(new.term);
  return new;
end;
$$;

create trigger trg_normalize_keyword_term
  before insert or update of term on public.keywords
  for each row execute function public.normalize_keyword_term_on_write();

-- Bug: once a keyword_metrics row aged past the 7-day cache TTL in
-- app/api/keywords/metrics/route.ts, it was refetched, and if it didn't get
-- re-scored (pool exhausted, fast mode, Gemini down) the client round-tripped
-- relevancy: null into /api/keywords/save, which upserted
-- relevancy_scored = false over a real score. Already-scored keywords
-- silently lost their score about a week later, and the freed pool slot then
-- went to some other keyword.
--
-- Fix: a row that was ever scored stays scored. An update that would unscore
-- it keeps the previous relevancy (and intent theme), and recomputes
-- opportunity from the new volume/chance with the same formula as
-- recomputeOpportunity in libs/keyword-volume.ts. A real re-score (new
-- relevancy_scored = true) still goes through untouched. Nothing writes
-- relevancy_scored = false on purpose to an already-scored row.
--
-- Named to fire after trg_enforce_relevancy_limit (BEFORE ROW triggers run
-- alphabetically); that trigger already lets updates of scored rows through.
create or replace function keep_relevancy_score()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.relevancy_scored and not new.relevancy_scored then
    new.relevancy_scored := true;
    new.relevancy        := old.relevancy;
    new.opportunity      := round(sqrt(new.volume::numeric * new.chance) * power(old.relevancy / 100.0, 2));
    new.intent_theme_id  := coalesce(new.intent_theme_id, old.intent_theme_id);
  end if;
  return new;
end;
$$;

create trigger trg_keep_relevancy_score
  before update on keyword_metrics
  for each row
  execute function keep_relevancy_score();

-- Unused: scaffolded for a keyword-categorization feature ('branded' /
-- 'competitor' / 'generic') that was never built. No app code reads or
-- writes it — confirmed via repo-wide search.
alter table app_keywords drop column tag;

-- Display name only -- slug stays 'enterprise' so nothing keyed on it
-- (PlanSlug type, isPlanAtLeast gates, FK references, etc.) needs to change.
update plans set name = 'Managed ASO', updated_at = now() where slug = 'enterprise';

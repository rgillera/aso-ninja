-- Follow-up answer to the chosen cancellation reason, e.g. which feature is
-- missing or which tool they're switching to (see DowngradeConfirmDialog).

alter table cancellation_feedback add column reason_detail text;

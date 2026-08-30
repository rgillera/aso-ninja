-- New product access area: ASA Intelligence (Apple Search Ads bid suggestions).
-- Split into its own migration because a new enum value must be committed
-- before it can be referenced (e.g. in a default array) elsewhere.

alter type workspace_access add value 'asa_intelligence';

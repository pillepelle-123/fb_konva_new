BEGIN;

-- Baseline marker migration.
-- This project already has the schema in existing environments.
-- We track this point in pgmigrations and add only incremental migrations afterwards.
SELECT 1;

COMMIT;

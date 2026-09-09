-- Tasks become engineering work items: every item now declares what kind of work it is.
-- Existing rows predate the distinction and are backfilled as FEATURE.
-- The DEFAULT is retained so raw inserts (e.g. the benchmark harness) stay valid.
ALTER TABLE tasks ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'FEATURE';

-- Phase 2 (D5): Cut change governance and approval workflow.
--
-- 1. Convert existing CHANGE work items to FEATURE and clear their risk
--    classification first. Verified pre-migration inventory on a freshly
--    seeded database: 4 CHANGE rows (all HIGH risk), 0 change_approvals
--    rows, no task types outside FEATURE/BUG/TECH_DEBT/CHANGE.
--    NOTE: this quantifies a freshly seeded environment only. Any database
--    holding real AgileTrack data must be inventoried before this migration
--    runs against it.
UPDATE tasks
SET type = 'FEATURE',
    risk_level = NULL
WHERE type = 'CHANGE';

-- 2. Drop dependent objects in dependency-safe order (no CASCADE:
--    change_approvals references tasks/users; nothing references
--    change_approvals).
DROP TABLE IF EXISTS change_approvals;

DROP INDEX IF EXISTS idx_tasks_risk_level;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_change_risk;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_risk_level;

ALTER TABLE tasks DROP COLUMN IF EXISTS risk_level;

-- 3. Enforce the in-scope work item types.
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_type CHECK (type IN ('FEATURE', 'BUG', 'TECH_DEBT'));

-- Phase 3 (D6): Cut the CANCELLED release state and the RELEASE_CANCELLED gate.
--
-- Approved data handling (Option B): convert historical cancelled releases
-- to PLANNED, preserving the release records and their task associations.
-- Verified pre-migration inventory on a freshly seeded database: exactly 1
-- CANCELLED release ('Native Mobile Shell', holding 1 task) and 0 releases
-- in unexpected lifecycle states.
-- Trade-off: the release survives with its scope intact, but its recorded
-- lifecycle history changes (CANCELLED -> PLANNED), making it editable and
-- deletable again.
-- NOTE: this quantifies a freshly seeded environment only. Any database
-- holding real AgileTrack data must be inventoried before this migration
-- runs against it.
UPDATE releases
SET lifecycle_state = 'PLANNED'
WHERE lifecycle_state = 'CANCELLED';

-- Enforce the supported v1 release lifecycle. Verified: no check constraint
-- exists on releases.lifecycle_state in V1..V16, so this is brand-new.
-- No CASCADE: no other object depends on the removed state value.
ALTER TABLE releases
ADD CONSTRAINT ck_releases_lifecycle_state
CHECK (
    lifecycle_state IN (
        'PLANNED',
        'IN_PROGRESS',
        'RELEASED'
    )
);

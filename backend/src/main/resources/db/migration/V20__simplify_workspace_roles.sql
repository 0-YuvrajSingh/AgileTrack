-- Phase 6 (D9): Simplify workspace roles to OWNER and MEMBER.
--
-- Approved data handling (dual decision gates, both explicitly approved):
-- Gate A (ADMIN -> MEMBER, least privilege): demote surviving ADMIN rows to
-- MEMBER. ADMIN -> OWNER is rejected: workspaces.owner_id already identifies
-- the single owner, so extra OWNER rows would violate that invariant.
-- Gate B (VIEWER revocation): delete VIEWER memberships. Promoting them to
-- MEMBER would silently expand read-only users to full write access;
-- workspace owners re-grant MEMBER deliberately instead.
-- Verified pre-migration inventory on a freshly seeded database: 0 ADMIN
-- rows, 0 VIEWER rows, 0 unexpected roles (1 OWNER + 1 MEMBER seeded).
-- NOTE: counts quantify a freshly seeded environment only. Any database
-- holding real ADMIN/VIEWER rows must apply these same approved mappings
-- (or a newly approved alternative) before this migration runs against it.
UPDATE workspace_members
SET role = 'MEMBER'
WHERE role = 'ADMIN';

DELETE FROM workspace_members
WHERE role = 'VIEWER';

-- Enforce the in-scope roles. Verified: no check constraint exists on
-- workspace_members.role in V1..V19, so this is brand-new.
-- No CASCADE: no other object depends on the removed role values.
ALTER TABLE workspace_members
ADD CONSTRAINT ck_workspace_members_role
CHECK (
    role IN (
        'OWNER',
        'MEMBER'
    )
);

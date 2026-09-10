-- Phase 5: Change Governance and Approval Workflow
--
-- 1. Add risk_level to tasks (work items).
--    Only work items of type 'CHANGE' are allowed to have a risk level.
ALTER TABLE tasks ADD COLUMN risk_level VARCHAR(50);

ALTER TABLE tasks ADD CONSTRAINT ck_tasks_risk_level
    CHECK (risk_level IS NULL OR risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

ALTER TABLE tasks ADD CONSTRAINT ck_tasks_change_risk
    CHECK (type = 'CHANGE' OR risk_level IS NULL);

-- Backfill existing CHANGE tasks with 'LOW' risk level so legacy data is consistent
UPDATE tasks SET risk_level = 'LOW' WHERE type = 'CHANGE' AND risk_level IS NULL;

CREATE INDEX idx_tasks_risk_level ON tasks(risk_level);

-- 2. Create change_approvals table for auditable, append-only governance decisions.
CREATE TABLE change_approvals (
    id UUID PRIMARY KEY,
    work_item_id UUID NOT NULL,
    approver_id UUID NOT NULL,
    decision VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_change_approval_task FOREIGN KEY (work_item_id)
        REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_change_approval_user FOREIGN KEY (approver_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_change_approval_decision CHECK (decision IN ('APPROVED', 'REJECTED'))
);

CREATE INDEX idx_change_approvals_work_item_id ON change_approvals(work_item_id, created_at DESC);


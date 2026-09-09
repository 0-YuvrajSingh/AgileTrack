-- Directional dependencies between work items.
--
-- Read an edge as: source BLOCKS target. The target cannot be completed while the
-- source is unresolved.
--
-- Both ends must live in the same project. That cannot be expressed as a foreign key,
-- so the service constrains its lookups by project instead of checking afterwards.
CREATE TABLE work_item_dependencies (
    id UUID PRIMARY KEY,
    source_work_item_id UUID NOT NULL,
    target_work_item_id UUID NOT NULL,
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'BLOCKS',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dependency_source FOREIGN KEY (source_work_item_id)
        REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_dependency_target FOREIGN KEY (target_work_item_id)
        REFERENCES tasks(id) ON DELETE CASCADE,
    -- Duplicate edges carry no extra meaning and would distort traversal.
    CONSTRAINT uq_dependency_edge UNIQUE (source_work_item_id, target_work_item_id, dependency_type),
    -- A work item cannot block itself. Enforced here as well as in the service, because a
    -- self-edge is the degenerate cycle and must never reach the table by any route.
    CONSTRAINT ck_dependency_not_self CHECK (source_work_item_id <> target_work_item_id)
);

-- Traversal walks outgoing edges (by source) and the blocked-completion check reads
-- incoming edges (by target), so both directions are indexed.
CREATE INDEX idx_dependencies_source ON work_item_dependencies(source_work_item_id);
CREATE INDEX idx_dependencies_target ON work_item_dependencies(target_work_item_id);

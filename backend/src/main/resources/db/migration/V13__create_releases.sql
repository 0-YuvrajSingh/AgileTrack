-- Releases: a versioned delivery scope inside a project.
--
-- "version" is the JPA optimistic-locking counter, consistent with tasks and projects.
-- The semantic release string (v2.4.0) is "release_version" to avoid colliding with it.
CREATE TABLE releases (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    release_version VARCHAR(50),
    lifecycle_state VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
    target_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_release_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT uq_release_name_per_project UNIQUE (project_id, name)
);

CREATE INDEX idx_releases_project_id ON releases(project_id);
CREATE INDEX idx_releases_lifecycle_state ON releases(lifecycle_state);

-- A work item may belong to at most one release, and only one in its own project.
-- That last rule cannot be expressed as a foreign key, so the service enforces it.
ALTER TABLE tasks ADD COLUMN release_id UUID;
ALTER TABLE tasks ADD CONSTRAINT fk_task_release
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_release_id ON tasks(release_id);

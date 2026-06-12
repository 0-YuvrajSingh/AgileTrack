package com.agiletrack.backend.task.repository;

import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByProjectId(UUID projectId);

    Optional<Task> findByIdAndProjectId(UUID id, UUID projectId);

    List<Task> findByProjectIdAndStatus(
            UUID projectId,
            TaskStatus status
    );

    List<Task> findByAssigneeId(UUID assigneeId);
}

package com.agiletrack.backend.task.repository;

import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    Page<Task> findByProjectId(UUID projectId, Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.project.id = :projectId AND (LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Task> findByProjectIdAndSearch(@Param("projectId") UUID projectId, @Param("search") String search, Pageable pageable);

    List<Task> findByProjectId(UUID projectId);

    Optional<Task> findByIdAndProjectId(UUID id, UUID projectId);

    List<Task> findByProjectIdAndStatus(
            UUID projectId,
            TaskStatus status
    );

    List<Task> findByAssigneeId(UUID assigneeId);
}

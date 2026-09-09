package com.agiletrack.backend.task.repository;

import com.agiletrack.backend.task.entity.TaskActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskActivityRepository extends JpaRepository<TaskActivity, UUID> {
    List<TaskActivity> findByTaskIdOrderByCreatedAtDesc(UUID taskId);
}

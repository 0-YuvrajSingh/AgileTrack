package com.agiletrack.backend.task.dto;

import com.agiletrack.backend.task.entity.TaskPriority;
import com.agiletrack.backend.task.entity.TaskStatus;
import com.agiletrack.backend.task.entity.WorkItemType;

import java.time.LocalDateTime;
import java.util.UUID;

public record TaskResponse (
        UUID id,
        String title,
        String description,
        TaskStatus status,
        WorkItemType type,
        TaskPriority priority,
        LocalDateTime deadline,
        UUID projectId,
        UUID releaseId,
        UUID assigneeId,
        String assigneeEmail,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Double position,
        Long version
) {
}

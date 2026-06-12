package com.agiletrack.backend.task.dto;

import com.agiletrack.backend.task.entity.TaskPriority;
import com.agiletrack.backend.task.entity.TaskStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record TaskResponse (
        UUID id,
        String title,
        String description,
        TaskStatus status,
        TaskPriority priority,
        LocalDateTime deadline,
        UUID projectId,
        UUID assigneeId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

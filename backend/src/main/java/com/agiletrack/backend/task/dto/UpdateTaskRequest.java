package com.agiletrack.backend.task.dto;

import com.agiletrack.backend.task.entity.RiskLevel;
import com.agiletrack.backend.task.entity.TaskPriority;
import com.agiletrack.backend.task.entity.WorkItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public record UpdateTaskRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 150, message = "Title must not exceed 150 characters")
        String title,

        @Size(max = 1000, message = "Description must not exceed 1000 characters")
        String description,

        @NotNull(message = "Type is required")
        WorkItemType type,

        @NotNull(message = "Priority is required")
        TaskPriority priority,

        RiskLevel riskLevel,

        LocalDateTime deadline,

        UUID assigneeId,

        /** The version the client read. Required: a full replace must be based on a real read. */
        @NotNull(message = "Version is required")
        Long version
) {
}

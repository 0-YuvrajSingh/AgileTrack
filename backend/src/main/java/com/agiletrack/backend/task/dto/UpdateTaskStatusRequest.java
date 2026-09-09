package com.agiletrack.backend.task.dto;

import com.agiletrack.backend.task.entity.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTaskStatusRequest(

        @NotNull(message = "Status is required")
        TaskStatus status,
        
        Double position
) {
}

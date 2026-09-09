package com.agiletrack.backend.task.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignTaskRequest(
        @NotNull(message = "AssigneeId is required")
        UUID assigneeId
) {}
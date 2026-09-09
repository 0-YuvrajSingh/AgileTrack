package com.agiletrack.backend.project.dto;

import com.agiletrack.backend.project.entity.ProjectStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateProjectStatusRequest(

        @NotNull(message = "Status is required")
        ProjectStatus status,

        /** Optional: when supplied, a stale transition is rejected instead of applied. */
        Long version
) {
}

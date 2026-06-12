package com.agiletrack.backend.project.dto;

import com.agiletrack.backend.project.entity.ProjectStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateProjectStatusRequest(

        @NotNull(message = "Status is required")
        ProjectStatus status
) {
}

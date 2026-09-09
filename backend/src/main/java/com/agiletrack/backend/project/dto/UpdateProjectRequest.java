package com.agiletrack.backend.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateProjectRequest (

        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must be 100 characters or fewer")
                String name,

        @Size(max = 500, message = "Description must be 500 characters or fewer")
        String description,

        /** The version the client read. Required: a full replace must be based on a real read. */
        @NotNull(message = "Version is required")
        Long version
) {
}

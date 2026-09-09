package com.agiletrack.backend.release.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateReleaseRequest(

        @NotBlank(message = "Name is required")
        @Size(max = 150, message = "Name must not exceed 150 characters")
        String name,

        @Size(max = 50, message = "Release version must not exceed 50 characters")
        String releaseVersion,

        LocalDate targetDate,

        /** The version the client read. Required: a full replace must be based on a real read. */
        @NotNull(message = "Version is required")
        Long version
) {
}

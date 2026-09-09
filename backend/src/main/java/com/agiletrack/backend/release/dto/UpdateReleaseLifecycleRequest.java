package com.agiletrack.backend.release.dto;

import com.agiletrack.backend.release.entity.ReleaseLifecycleState;
import jakarta.validation.constraints.NotNull;

public record UpdateReleaseLifecycleRequest(

        @NotNull(message = "Lifecycle state is required")
        ReleaseLifecycleState lifecycleState,

        /** Optional: when supplied, a stale transition is rejected instead of applied. */
        Long version
) {
}

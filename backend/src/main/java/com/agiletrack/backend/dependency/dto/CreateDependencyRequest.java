package com.agiletrack.backend.dependency.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Declares that the work item in the path is blocked by another one.
 *
 * <p>The endpoint is expressed from the blocked item's point of view because that is where the
 * consequence lands: it is the item that cannot be completed.
 */
public record CreateDependencyRequest(

        @NotNull(message = "blockedByWorkItemId is required")
        UUID blockedByWorkItemId
) {
}

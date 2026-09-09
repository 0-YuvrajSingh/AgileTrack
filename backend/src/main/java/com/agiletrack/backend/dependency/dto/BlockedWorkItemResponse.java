package com.agiletrack.backend.dependency.dto;

import java.util.List;
import java.util.UUID;

/** A work item that currently has at least one unresolved blocker, with those blockers. */
public record BlockedWorkItemResponse(
        UUID workItemId,
        String title,
        List<DependencyResponse> blockers
) {
}

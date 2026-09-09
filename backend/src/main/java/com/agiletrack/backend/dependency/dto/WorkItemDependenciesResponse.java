package com.agiletrack.backend.dependency.dto;

import java.util.List;

/**
 * Both directions for one work item.
 *
 * <p>{@code blocked} is computed from {@code blockedBy}, never stored. Resolving a blocker
 * therefore unblocks the dependent item with no second write.
 */
public record WorkItemDependenciesResponse(
        List<DependencyResponse> blockedBy,
        List<DependencyResponse> blocking,
        boolean blocked
) {
}

package com.agiletrack.backend.dependency.service;

import com.agiletrack.backend.common.exception.BusinessRuleException;
import com.agiletrack.backend.dependency.entity.WorkItemDependency;
import com.agiletrack.backend.dependency.repository.WorkItemDependencyRepository;
import com.agiletrack.backend.task.entity.Task;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Frozen business rule #3 — a work item cannot be DONE while an unresolved BLOCKS dependency
 * remains.
 *
 * <p>Blocked-ness is evaluated from committed state at the moment of the write rather than stored
 * on the work item. That is what makes the rule self-maintaining: completing a blocker unblocks
 * everything waiting on it with no second write, no background job, and no chance of a stored flag
 * drifting from the graph.
 *
 * <p>Lives beside the graph rather than inside {@code TaskService} so that every future path to
 * completion has to go through the same check.
 */
@Component
@RequiredArgsConstructor
public class BlockedCompletionGuard {

    private final WorkItemDependencyRepository dependencyRepository;

    /**
     * @throws BusinessRuleException naming the offending blockers, if any remain unresolved.
     */
    public void requireCompletable(Task task) {
        List<WorkItemDependency> blockers =
                dependencyRepository.findUnresolvedBlockersFor(List.of(task.getId()));

        if (blockers.isEmpty()) {
            return;
        }

        String named = blockers.stream()
                .map(d -> "\"" + d.getSource().getTitle() + "\" (" + d.getSource().getStatus() + ")")
                .collect(Collectors.joining(", "));

        throw new BusinessRuleException(
                "\"" + task.getTitle() + "\" cannot be completed while blocked by " + named);
    }
}

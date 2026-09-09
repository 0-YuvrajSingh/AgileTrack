package com.agiletrack.backend.readiness.service;

import com.agiletrack.backend.dependency.entity.WorkItemDependency;
import com.agiletrack.backend.dependency.repository.WorkItemDependencyRepository;
import com.agiletrack.backend.readiness.dto.ReadinessReason;
import com.agiletrack.backend.readiness.dto.ReadinessReasonCode;
import com.agiletrack.backend.readiness.dto.ReadinessStatus;
import com.agiletrack.backend.readiness.dto.ReleaseReadinessResponse;
import com.agiletrack.backend.release.entity.Release;
import com.agiletrack.backend.release.entity.ReleaseLifecycleState;
import com.agiletrack.backend.release.service.ReleaseService;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskStatus;
import com.agiletrack.backend.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Computes whether a release can ship, and explains every reason it cannot.
 *
 * <p><strong>Readiness is derived, never stored.</strong> There is no readiness column, no
 * readiness setter and no endpoint that writes one. Each call recomputes the verdict from
 * committed rows, which is what makes it impossible for the verdict to disagree with the work
 * items, dependencies and governance it summarises. It also means a blocker being resolved, or a
 * work item being completed, changes readiness with no second write anywhere.
 *
 * <p>The result is a pure function of committed database state: the same rows always produce the
 * same status and the same reasons in the same order. Reasons are sorted by code and then by
 * title, so ordering never depends on how the database happened to return rows.
 *
 * <p>Nothing is cached. Caching a derived verdict would create an invalidation problem — the
 * verdict depends on three tables that change independently — and there is no measurement saying
 * it is needed. The evaluation is a bounded number of queries regardless of release size.
 *
 * <p>The gates are finite and deliberately not configurable in v1.
 */
@Service
@RequiredArgsConstructor
public class ReadinessService {

    private final ReleaseService releaseService;
    private final TaskRepository taskRepository;
    private final WorkItemDependencyRepository dependencyRepository;

    /**
     * Reasons are ordered by code first, then by the work item's title, then by id. Title before id
     * keeps the list readable; id last makes the order total even when two items share a title.
     */
    private static final Comparator<ReadinessReason> DETERMINISTIC_ORDER =
            Comparator.comparing((ReadinessReason r) -> r.code().ordinal())
                    .thenComparing(r -> r.workItemTitle() == null ? "" : r.workItemTitle())
                    .thenComparing(r -> r.workItemId() == null ? "" : r.workItemId().toString())
                    .thenComparing(ReadinessReason::detail);

    @Transactional(readOnly = true)
    public ReleaseReadinessResponse evaluate(UUID workspaceId, UUID projectId, UUID releaseId) {
        // Authorization runs through the same parent chain as every other release read.
        Release release = releaseService.getRelease(workspaceId, projectId, releaseId);

        List<Task> workItems = taskRepository.findByReleaseId(releaseId);
        List<ReadinessReason> reasons = new ArrayList<>();

        reasons.addAll(releaseLevelGates(release, workItems));
        reasons.addAll(incompleteWorkGate(workItems));
        reasons.addAll(blockedWorkGate(workItems));

        reasons.sort(DETERMINISTIC_ORDER);

        long completed = workItems.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();

        return new ReleaseReadinessResponse(
                release.getId(),
                release.getName(),
                release.getLifecycleState(),
                reasons.isEmpty() ? ReadinessStatus.READY : ReadinessStatus.NOT_READY,
                List.copyOf(reasons),
                workItems.size(),
                (int) completed
        );
    }

    /** Gates about the release itself rather than its contents. */
    private List<ReadinessReason> releaseLevelGates(Release release, List<Task> workItems) {
        List<ReadinessReason> reasons = new ArrayList<>();

        // A cancelled release cannot ship whatever its contents look like. A RELEASED one is
        // evaluated normally: it already shipped, and its gates should still describe why.
        if (release.getLifecycleState() == ReleaseLifecycleState.CANCELLED) {
            reasons.add(new ReadinessReason(
                    ReadinessReasonCode.RELEASE_CANCELLED, null, null,
                    "Release " + release.getName() + " has been cancelled"));
        }

        // An empty release is not vacuously shippable; there is simply nothing in it.
        if (workItems.isEmpty()) {
            reasons.add(new ReadinessReason(
                    ReadinessReasonCode.EMPTY_RELEASE, null, null,
                    "Release " + release.getName() + " contains no work items"));
        }

        return reasons;
    }

    /**
     * Every work item in the release must be DONE.
     *
     * <p>v1 has no notion of an optional work item: being in the release scope is what makes an
     * item required. Adding optionality later means adding a field here, not reworking the gate.
     */
    private List<ReadinessReason> incompleteWorkGate(List<Task> workItems) {
        return workItems.stream()
                .filter(task -> task.getStatus() != TaskStatus.DONE)
                .map(task -> new ReadinessReason(
                        ReadinessReasonCode.INCOMPLETE_WORK,
                        task.getId(),
                        task.getTitle(),
                        "\"" + task.getTitle() + "\" is " + task.getStatus() + ", not DONE"))
                .toList();
    }

    /**
     * No work item in the release may be waiting on an unresolved blocker.
     *
     * <p>A blocker outside the release still counts. It would surface as INCOMPLETE_WORK anyway,
     * but only BLOCKED_WORK explains why the item cannot move, which is what a reviewer needs.
     *
     * <p>One batched query for the whole release rather than one per work item.
     */
    private List<ReadinessReason> blockedWorkGate(List<Task> workItems) {
        if (workItems.isEmpty()) {
            return List.of();
        }

        List<UUID> ids = workItems.stream().map(Task::getId).toList();
        List<WorkItemDependency> unresolved = dependencyRepository.findUnresolvedBlockersFor(ids);

        return unresolved.stream()
                .map(dependency -> {
                    Task blocked = dependency.getTarget();
                    Task blocker = dependency.getSource();
                    return new ReadinessReason(
                            ReadinessReasonCode.BLOCKED_WORK,
                            blocked.getId(),
                            blocked.getTitle(),
                            "\"" + blocked.getTitle() + "\" is blocked by \"" + blocker.getTitle()
                                    + "\" (" + blocker.getStatus() + ")");
                })
                .toList();
    }
}

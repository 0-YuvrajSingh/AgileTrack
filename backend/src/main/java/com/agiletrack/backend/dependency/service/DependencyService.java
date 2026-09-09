package com.agiletrack.backend.dependency.service;

import com.agiletrack.backend.common.exception.BusinessRuleException;
import com.agiletrack.backend.common.exception.DependencyNotFoundException;
import com.agiletrack.backend.common.exception.TaskNotFoundException;
import com.agiletrack.backend.dependency.dto.BlockedWorkItemResponse;
import com.agiletrack.backend.dependency.dto.CreateDependencyRequest;
import com.agiletrack.backend.dependency.dto.DependencyResponse;
import com.agiletrack.backend.dependency.dto.WorkItemDependenciesResponse;
import com.agiletrack.backend.dependency.entity.DependencyType;
import com.agiletrack.backend.dependency.entity.WorkItemDependency;
import com.agiletrack.backend.dependency.mapper.DependencyMapper;
import com.agiletrack.backend.dependency.repository.WorkItemDependencyRepository;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.service.ProjectService;
import com.agiletrack.backend.task.entity.ActivityType;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskStatus;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.task.service.TaskActivityRecorder;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Creates, removes and reports BLOCKS dependencies within a project.
 *
 * <p>Both endpoints of an edge are resolved through {@code findByIdAndProjectId}, so a work item
 * from another project or tenant is not "rejected" so much as never found — possession of a UUID
 * grants nothing.
 */
@Service
@RequiredArgsConstructor
public class DependencyService {

    private final WorkItemDependencyRepository dependencyRepository;
    private final DependencyMapper dependencyMapper;
    private final DependencyCycleDetector cycleDetector;
    private final TaskRepository taskRepository;
    private final ProjectService projectService;
    private final WorkspaceService workspaceService;
    private final TaskActivityRecorder activityRecorder;

    // -- commands --------------------------------------------------------------

    /**
     * Records that {@code taskId} is blocked by {@code request.blockedByWorkItemId}, producing the
     * edge {@code blocker -> blocked}.
     */
    @Transactional
    public DependencyResponse addDependency(UUID workspaceId, UUID projectId, UUID taskId,
                                            CreateDependencyRequest request) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Project project = projectService.getProject(workspaceId, projectId);
        projectService.requireMutable(project);

        UUID blockerId = request.blockedByWorkItemId();

        // Checked before the lookups so a self-reference fails with a precise message rather than
        // succeeding at finding the same row twice.
        if (blockerId.equals(taskId)) {
            throw new BusinessRuleException("A work item cannot block itself");
        }

        Task blocked = getTaskInProject(projectId, taskId);
        Task blocker = getTaskInProject(projectId, blockerId);

        if (dependencyRepository.existsBySourceIdAndTargetIdAndDependencyType(
                blockerId, taskId, DependencyType.BLOCKS)) {
            throw new BusinessRuleException("This dependency already exists");
        }

        // The graph must stay acyclic. Checked before the insert, inside this transaction, so a
        // concurrent writer cannot slip a conflicting edge in between the check and the write.
        cycleDetector.requireNoCycle(projectId, blockerId, taskId);

        WorkItemDependency dependency = dependencyRepository.save(WorkItemDependency.builder()
                .source(blocker)
                .target(blocked)
                .dependencyType(DependencyType.BLOCKS)
                .build());

        // Audited from both ends: each work item's own history should explain why it is waiting,
        // or what is waiting on it.
        activityRecorder.record(blocked, ActivityType.DEPENDENCY_ADDED,
                "Blocked by \"" + blocker.getTitle() + "\"");
        activityRecorder.record(blocker, ActivityType.DEPENDENCY_ADDED,
                "Now blocks \"" + blocked.getTitle() + "\"");

        return dependencyMapper.toResponse(dependency);
    }

    @Transactional
    public void removeDependency(UUID workspaceId, UUID projectId, UUID taskId, UUID dependencyId) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Project project = projectService.getProject(workspaceId, projectId);
        projectService.requireMutable(project);

        // Scoped by the work item in the path, so an edge belonging to a different item -- or a
        // different project -- cannot be deleted by id alone.
        WorkItemDependency dependency = dependencyRepository.findByIdAndTargetId(dependencyId, taskId)
                .orElseThrow(() -> new DependencyNotFoundException("Dependency not found"));

        Task blocked = getTaskInProject(projectId, taskId);
        Task blocker = dependency.getSource();

        dependencyRepository.delete(dependency);

        activityRecorder.record(blocked, ActivityType.DEPENDENCY_REMOVED,
                "No longer blocked by \"" + blocker.getTitle() + "\"");
        activityRecorder.record(blocker, ActivityType.DEPENDENCY_REMOVED,
                "No longer blocks \"" + blocked.getTitle() + "\"");
    }

    // -- queries ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public WorkItemDependenciesResponse getDependencies(UUID workspaceId, UUID projectId, UUID taskId) {
        projectService.getProject(workspaceId, projectId);
        getTaskInProject(projectId, taskId);

        List<DependencyResponse> blockedBy = dependencyRepository.findBlockersOf(taskId).stream()
                .map(dependencyMapper::toResponse)
                .toList();

        List<DependencyResponse> blocking = dependencyRepository.findBlockedBy(taskId).stream()
                .map(dependencyMapper::toResponse)
                .toList();

        boolean blocked = blockedBy.stream().anyMatch(d -> !d.resolved());

        return new WorkItemDependenciesResponse(blockedBy, blocking, blocked);
    }

    /**
     * Every work item in the project with at least one unresolved blocker, in one query, so a
     * board or dashboard can render blocked state without a lookup per card.
     */
    @Transactional(readOnly = true)
    public List<BlockedWorkItemResponse> getBlockedWorkItems(UUID workspaceId, UUID projectId) {
        projectService.getProject(workspaceId, projectId);

        Map<UUID, List<DependencyResponse>> byBlockedItem = new LinkedHashMap<>();
        Map<UUID, String> titles = new LinkedHashMap<>();

        for (WorkItemDependency dependency : dependencyRepository.findUnresolvedBlockersInProject(projectId)) {
            Task blocked = dependency.getTarget();
            titles.putIfAbsent(blocked.getId(), blocked.getTitle());
            byBlockedItem.computeIfAbsent(blocked.getId(), k -> new java.util.ArrayList<>())
                    .add(dependencyMapper.toResponse(dependency));
        }

        return byBlockedItem.entrySet().stream()
                .map(e -> new BlockedWorkItemResponse(e.getKey(), titles.get(e.getKey()), e.getValue()))
                .toList();
    }

    // -- internals -------------------------------------------------------------

    private Task getTaskInProject(UUID projectId, UUID taskId) {
        return taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new TaskNotFoundException(
                        "Work item not found in this project. Dependencies can only connect work "
                                + "items within the same project."));
    }

    /** Exposed for readiness in Phase 4: unresolved blockers across a set of work items. */
    @Transactional(readOnly = true)
    public List<WorkItemDependency> findUnresolvedBlockers(List<UUID> taskIds) {
        return taskIds.isEmpty() ? List.of() : dependencyRepository.findUnresolvedBlockersFor(taskIds);
    }

    /** True when the work item has at least one blocker that is not yet DONE. */
    @Transactional(readOnly = true)
    public boolean isBlocked(UUID taskId) {
        return dependencyRepository.findUnresolvedBlockersFor(List.of(taskId)).stream()
                .anyMatch(d -> d.getSource().getStatus() != TaskStatus.DONE);
    }
}

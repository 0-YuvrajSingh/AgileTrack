package com.agiletrack.backend.release.service;

import com.agiletrack.backend.common.concurrency.OptimisticLockGuard;
import com.agiletrack.backend.common.exception.BusinessRuleException;
import com.agiletrack.backend.common.exception.ReleaseNotFoundException;
import com.agiletrack.backend.common.exception.TaskNotFoundException;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.service.ProjectService;
import com.agiletrack.backend.release.dto.CreateReleaseRequest;
import com.agiletrack.backend.release.dto.ReleaseResponse;
import com.agiletrack.backend.release.dto.UpdateReleaseLifecycleRequest;
import com.agiletrack.backend.release.dto.UpdateReleaseRequest;
import com.agiletrack.backend.release.entity.Release;
import com.agiletrack.backend.release.entity.ReleaseLifecycleState;
import com.agiletrack.backend.release.mapper.ReleaseMapper;
import com.agiletrack.backend.release.repository.ReleaseRepository;
import com.agiletrack.backend.task.dto.TaskResponse;
import com.agiletrack.backend.task.entity.ActivityType;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.mapper.TaskMapper;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.task.service.TaskActivityRecorder;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Release lifecycle and scope rules.
 *
 * <p>Three rules live here rather than in the controller or the UI, because they must hold for any
 * caller: a release is reachable only through its own project's authorization chain, its scope
 * freezes once execution starts, and a work item can only join a release in its own project.
 */
@Service
@RequiredArgsConstructor
public class ReleaseService {

    private final ReleaseRepository releaseRepository;
    private final ReleaseMapper releaseMapper;
    private final ProjectService projectService;
    private final WorkspaceService workspaceService;
    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;
    private final TaskActivityRecorder activityRecorder;

    // -- commands --------------------------------------------------------------

    @Transactional
    public ReleaseResponse createRelease(UUID workspaceId, UUID projectId, CreateReleaseRequest request) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Project project = projectService.getProject(workspaceId, projectId);
        projectService.requireMutable(project);

        requireNameAvailable(projectId, request.name());

        Release release = Release.builder()
                .name(request.name())
                .releaseVersion(request.releaseVersion())
                .targetDate(request.targetDate())
                .lifecycleState(ReleaseLifecycleState.PLANNED)
                .project(project)
                .build();

        return releaseMapper.toResponse(releaseRepository.save(release));
    }

    @Transactional
    public ReleaseResponse updateRelease(UUID workspaceId, UUID projectId, UUID releaseId,
                                         UpdateReleaseRequest request) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Release release = getRelease(workspaceId, projectId, releaseId);
        projectService.requireMutable(release.getProject());
        OptimisticLockGuard.requireCurrentVersion(
                Release.class, releaseId, release.getVersion(), request.version());
        requireEditable(release);

        if (!release.getName().equals(request.name())) {
            requireNameAvailable(projectId, request.name());
        }

        release.setName(request.name());
        release.setReleaseVersion(request.releaseVersion());
        release.setTargetDate(request.targetDate());

        return releaseMapper.toResponse(release);
    }

    @Transactional
    public ReleaseResponse updateLifecycle(UUID workspaceId, UUID projectId, UUID releaseId,
                                           UpdateReleaseLifecycleRequest request) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Release release = getRelease(workspaceId, projectId, releaseId);
        projectService.requireMutable(release.getProject());
        OptimisticLockGuard.requireCurrentVersion(
                Release.class, releaseId, release.getVersion(), request.version());

        if (!release.canTransitionTo(request.lifecycleState())) {
            throw new BusinessRuleException("Invalid release lifecycle transition: "
                    + release.getLifecycleState() + " -> " + request.lifecycleState());
        }

        release.setLifecycleState(request.lifecycleState());
        return releaseMapper.toResponse(release);
    }

    /**
     * Hard delete, permitted only while the release is still being planned. Once execution has
     * started the release is a record of what was attempted; CANCELLED is the way to retire it.
     */
    @Transactional
    public void deleteRelease(UUID workspaceId, UUID projectId, UUID releaseId) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Release release = getRelease(workspaceId, projectId, releaseId);
        projectService.requireMutable(release.getProject());

        if (release.getLifecycleState() != ReleaseLifecycleState.PLANNED) {
            throw new BusinessRuleException(
                    "Only a PLANNED release can be deleted. Cancel the release instead.");
        }

        // Detach scope explicitly so the history reflects it, rather than relying on ON DELETE SET NULL.
        for (Task task : taskRepository.findByReleaseId(releaseId)) {
            task.setRelease(null);
            activityRecorder.record(task, ActivityType.RELEASE_UNASSIGNED,
                    "Removed from release " + release.getName() + " (release deleted)");
        }

        releaseRepository.delete(release);
    }

    // -- scope -----------------------------------------------------------------

    @Transactional
    public TaskResponse addWorkItem(UUID workspaceId, UUID projectId, UUID releaseId, UUID taskId) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Release release = getRelease(workspaceId, projectId, releaseId);
        projectService.requireMutable(release.getProject());
        requireScopeChangeAllowed(release);

        Task task = getTaskInProject(projectId, taskId);

        if (release.equals(task.getRelease())) {
            return taskMapper.toResponse(task);
        }
        if (task.getRelease() != null) {
            throw new BusinessRuleException("Work item already belongs to release "
                    + task.getRelease().getName() + ". Remove it from that release first.");
        }

        task.setRelease(release);
        activityRecorder.record(task, ActivityType.RELEASE_ASSIGNED,
                "Added to release " + release.getName());

        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse removeWorkItem(UUID workspaceId, UUID projectId, UUID releaseId, UUID taskId) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Release release = getRelease(workspaceId, projectId, releaseId);
        projectService.requireMutable(release.getProject());
        requireScopeChangeAllowed(release);

        Task task = getTaskInProject(projectId, taskId);

        if (!release.equals(task.getRelease())) {
            throw new BusinessRuleException("Work item is not part of this release");
        }

        task.setRelease(null);
        activityRecorder.record(task, ActivityType.RELEASE_UNASSIGNED,
                "Removed from release " + release.getName());

        return taskMapper.toResponse(task);
    }

    // -- queries ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<ReleaseResponse> getReleasesByProject(UUID workspaceId, UUID projectId, Pageable pageable) {
        projectService.getProject(workspaceId, projectId);
        return releaseRepository.findByProjectId(projectId, pageable).map(releaseMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ReleaseResponse getReleaseById(UUID workspaceId, UUID projectId, UUID releaseId) {
        return releaseMapper.toResponse(getRelease(workspaceId, projectId, releaseId));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getWorkItems(UUID workspaceId, UUID projectId, UUID releaseId) {
        getRelease(workspaceId, projectId, releaseId);
        return taskRepository.findByReleaseId(releaseId).stream().map(taskMapper::toResponse).toList();
    }

    // -- internals -------------------------------------------------------------

    /**
     * Loads a release through the full parent chain. Reachability is decided by workspace
     * membership and project ownership of the release, never by possession of the UUID.
     */
    @Transactional(readOnly = true)
    public Release getRelease(UUID workspaceId, UUID projectId, UUID releaseId) {
        projectService.getProject(workspaceId, projectId);
        return releaseRepository.findByIdAndProjectId(releaseId, projectId)
                .orElseThrow(() -> new ReleaseNotFoundException("Release not found"));
    }

    /**
     * A work item may only join a release in its own project. The lookup is constrained by
     * project rather than checked afterwards, so a foreign work item is simply not found.
     */
    private Task getTaskInProject(UUID projectId, UUID taskId) {
        return taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new TaskNotFoundException(
                        "Work item not found in this project. A work item cannot be assigned to "
                                + "another project's release."));
    }

    private void requireScopeChangeAllowed(Release release) {
        if (!release.getLifecycleState().allowsScopeChange()) {
            throw new BusinessRuleException("Release scope is locked in state "
                    + release.getLifecycleState() + ". Scope can only change while PLANNED.");
        }
    }

    private void requireEditable(Release release) {
        if (!release.getLifecycleState().allowsFieldEdit()) {
            throw new BusinessRuleException(
                    "A " + release.getLifecycleState() + " release cannot be modified");
        }
    }

    private void requireNameAvailable(UUID projectId, String name) {
        if (releaseRepository.existsByProjectIdAndName(projectId, name)) {
            throw new BusinessRuleException("A release named '" + name + "' already exists in this project");
        }
    }
}

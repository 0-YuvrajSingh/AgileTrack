package com.agiletrack.backend.approval.service;

import com.agiletrack.backend.approval.dto.ApprovalResponse;
import com.agiletrack.backend.approval.dto.CreateApprovalRequest;
import com.agiletrack.backend.approval.entity.ApprovalDecision;
import com.agiletrack.backend.approval.entity.ChangeApproval;
import com.agiletrack.backend.approval.policy.ChangeRiskPolicy;
import com.agiletrack.backend.approval.repository.ChangeApprovalRepository;
import com.agiletrack.backend.common.exception.BusinessRuleException;
import com.agiletrack.backend.common.exception.TaskNotFoundException;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.service.ProjectService;
import com.agiletrack.backend.security.CurrentUserService;
import com.agiletrack.backend.task.entity.ActivityType;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.WorkItemType;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.task.service.TaskActivityRecorder;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Change governance approval service.
 *
 * <p>Enforces authorization, tenant isolation, and business invariants:
 * <ul>
 *   <li>Only CHANGE work items can receive approval decisions.</li>
 *   <li>Authority is server-side; approver identity is derived from the authenticated session.</li>
 *   <li>Mutations are audited transactionally with the decision.</li>
 *   <li>Latest decision is authoritative.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class ApprovalService {

    private final ChangeApprovalRepository changeApprovalRepository;
    private final TaskRepository taskRepository;
    private final ProjectService projectService;
    private final WorkspaceService workspaceService;
    private final CurrentUserService currentUserService;
    private final TaskActivityRecorder activityRecorder;

    @Transactional(readOnly = true)
    public ApprovalResponse getApproval(UUID workspaceId, UUID projectId, UUID taskId) {
        workspaceService.getWorkspaceIfMember(workspaceId);
        Task task = getTask(workspaceId, projectId, taskId);

        if (task.getType() != WorkItemType.CHANGE) {
            throw new BusinessRuleException("Work item is not a CHANGE: " + task.getType());
        }

        Optional<ChangeApproval> latest = changeApprovalRepository
                .findFirstByWorkItemIdOrderByCreatedAtDescIdDesc(taskId);

        return toResponse(task, latest.orElse(null));
    }

    @Transactional
    public ApprovalResponse submitDecision(UUID workspaceId, UUID projectId, UUID taskId,
                                           CreateApprovalRequest request) {
        workspaceService.getWorkspaceForMutation(workspaceId);
        Project project = projectService.getProject(workspaceId, projectId);
        projectService.requireMutable(project);

        Task task = getTask(workspaceId, projectId, taskId);

        if (task.getType() != WorkItemType.CHANGE) {
            throw new BusinessRuleException("Only CHANGE work items can receive approval decisions");
        }

        if (request.decision() == null) {
            throw new BusinessRuleException("Decision is required");
        }

        User approver = currentUserService.getCurrentUser();

        ChangeApproval approval = ChangeApproval.builder()
                .workItem(task)
                .approver(approver)
                .decision(request.decision())
                .createdAt(LocalDateTime.now())
                .build();

        approval = changeApprovalRepository.save(approval);

        ActivityType activityType = request.decision() == ApprovalDecision.APPROVED
                ? ActivityType.APPROVAL_GRANTED
                : ActivityType.APPROVAL_REJECTED;

        String action = request.decision() == ApprovalDecision.APPROVED ? "approved" : "rejected";
        String detail = "Change " + action + " by " + approver.getEmail();
        activityRecorder.record(task, activityType, detail);

        return toResponse(task, approval);
    }

    private Task getTask(UUID workspaceId, UUID projectId, UUID taskId) {
        Task task = taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new TaskNotFoundException("Task not found"));

        if (!task.getProject().getWorkspace().getId().equals(workspaceId)) {
            throw new TaskNotFoundException("Task not found");
        }

        return task;
    }

    private ApprovalResponse toResponse(Task task, ChangeApproval approval) {
        boolean approvalRequired = ChangeRiskPolicy.requiresApproval(task.getRiskLevel());

        if (approval == null) {
            return new ApprovalResponse(
                    null,
                    task.getId(),
                    task.getRiskLevel(),
                    approvalRequired,
                    null,
                    null,
                    null,
                    null
            );
        }

        return new ApprovalResponse(
                approval.getId(),
                task.getId(),
                task.getRiskLevel(),
                approvalRequired,
                approval.getDecision(),
                approval.getApprover().getId(),
                approval.getApprover().getEmail(),
                approval.getCreatedAt()
        );
    }
}


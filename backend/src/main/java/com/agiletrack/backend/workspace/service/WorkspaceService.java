package com.agiletrack.backend.workspace.service;

import com.agiletrack.backend.common.exception.UserNotFoundException;
import com.agiletrack.backend.common.exception.WorkspaceNotFoundException;
import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import com.agiletrack.backend.workspace.dto.CreateWorkspaceRequest;
import com.agiletrack.backend.workspace.dto.InviteMemberRequest;
import com.agiletrack.backend.workspace.dto.UpdateWorkspaceRequest;
import com.agiletrack.backend.workspace.dto.WorkspaceResponse;
import com.agiletrack.backend.workspace.entity.Workspace;
import com.agiletrack.backend.workspace.entity.WorkspaceMember;
import com.agiletrack.backend.workspace.entity.WorkspaceRole;
import com.agiletrack.backend.workspace.mapper.WorkspaceMapper;
import com.agiletrack.backend.workspace.repository.WorkspaceMemberRepository;
import com.agiletrack.backend.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;
    private final WorkspaceMapper workspaceMapper;

    @Transactional
    public WorkspaceResponse create(CreateWorkspaceRequest request) {
        User currentUser = getCurrentUser();

        Workspace workspace = Workspace.builder()
                .name(request.name())
                .description(request.description())
                .owner(currentUser)
                .build();
        workspace = workspaceRepository.save(workspace);

        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(currentUser)
                .role(WorkspaceRole.OWNER)
                .build();
        workspaceMemberRepository.save(member);

        return workspaceMapper.toResponse(workspace, WorkspaceRole.OWNER);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceResponse> findAll() {
        return workspaceMemberRepository.findByUserId(getCurrentUser().getId())
                .stream()
                .map(member -> workspaceMapper.toResponse(member.getWorkspace(), member.getRole()))
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkspaceResponse findById(UUID id) {
        Workspace workspace = getWorkspaceIfMember(id);
        WorkspaceRole role = getMemberRole(id, getCurrentUser().getId());
        return workspaceMapper.toResponse(workspace, role);
    }

    @Transactional
    public WorkspaceResponse update(UpdateWorkspaceRequest request, UUID id) {
        Workspace workspace = getWorkspaceForAdmin(id);
        workspace.setName(request.name());
        workspace.setDescription(request.description());
        WorkspaceRole role = getMemberRole(id, getCurrentUser().getId());
        return workspaceMapper.toResponse(workspace, role);
    }

    @Transactional
    public void delete(UUID id) {
        Workspace workspace = getOwnedWorkspace(id);
        workspaceRepository.delete(workspace);
    }

    @Transactional
    public void inviteMember(UUID workspaceId, InviteMemberRequest request) {
        Workspace workspace = getWorkspaceForAdmin(workspaceId);

        User invitee = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, invitee.getId())) {
            throw new IllegalStateException("User is already a member of this workspace");
        }

        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(invitee)
                .role(request.role())
                .build();

        workspaceMemberRepository.save(member);
    }

    public Workspace getOwnedWorkspace(UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found"));

        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspaceIdAndUserId(workspaceId, getCurrentUser().getId())
                .orElseThrow(() -> new AccessDeniedException("Access denied"));

        if (member.getRole() != WorkspaceRole.OWNER) {
            throw new AccessDeniedException("Requires OWNER role to perform this action");
        }

        return workspace;
    }

    public Workspace getWorkspaceForAdmin(UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found"));

        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspaceIdAndUserId(workspaceId, getCurrentUser().getId())
                .orElseThrow(() -> new AccessDeniedException("Access denied"));

        if (member.getRole() != WorkspaceRole.OWNER && member.getRole() != WorkspaceRole.ADMIN) {
            throw new AccessDeniedException("Requires ADMIN or OWNER role to perform this action");
        }

        return workspace;
    }

    public Workspace getWorkspaceForMutation(UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found"));

        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspaceIdAndUserId(workspaceId, getCurrentUser().getId())
                .orElseThrow(() -> new AccessDeniedException("Access denied"));

        if (member.getRole() == WorkspaceRole.VIEWER) {
            throw new AccessDeniedException("VIEWER role cannot perform this action");
        }

        return workspace;
    }

    public Workspace getWorkspaceIfMember(UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found"));

        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, getCurrentUser().getId())) {
            throw new AccessDeniedException("Access denied");
        }

        return workspace;
    }

    @Transactional(readOnly = true)
    public List<com.agiletrack.backend.workspace.dto.WorkspaceMemberResponse> getMembers(UUID workspaceId) {
        getWorkspaceIfMember(workspaceId);
        return workspaceMemberRepository.findByWorkspaceId(workspaceId)
                .stream()
                .map(member -> new com.agiletrack.backend.workspace.dto.WorkspaceMemberResponse(
                        member.getUser().getId(),
                        member.getUser().getEmail(),
                        member.getRole()
                ))
                .toList();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new AccessDeniedException("Access denied");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getUser();
        }

        if (principal instanceof User user) {
            return user;
        }

        throw new AccessDeniedException("Access denied");
    }

    public WorkspaceRole getMemberRole(UUID workspaceId, UUID userId) {
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .map(WorkspaceMember::getRole)
                .orElseThrow(() -> new AccessDeniedException("User is not a member of this workspace"));
    }

    public boolean isWorkspaceMember(UUID workspaceId, UUID userId) {
        return workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId);
    }
}

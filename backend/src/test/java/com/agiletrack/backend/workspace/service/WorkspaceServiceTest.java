package com.agiletrack.backend.workspace.service;

import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.workspace.dto.CreateWorkspaceRequest;
import com.agiletrack.backend.workspace.dto.WorkspaceResponse;
import com.agiletrack.backend.workspace.entity.Workspace;
import com.agiletrack.backend.workspace.entity.WorkspaceMember;
import com.agiletrack.backend.workspace.mapper.WorkspaceMapper;
import com.agiletrack.backend.workspace.repository.WorkspaceMemberRepository;
import com.agiletrack.backend.workspace.repository.WorkspaceRepository;
import com.agiletrack.backend.workspace.service.WorkspaceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceServiceTest {

    @Mock private WorkspaceRepository workspaceRepository;
    @Mock private WorkspaceMemberRepository workspaceMemberRepository;
    @Mock private WorkspaceMapper workspaceMapper;

    @Mock private Authentication authentication;
    @Mock private SecurityContext securityContext;

    @InjectMocks
    private WorkspaceService workspaceService;

    private User testUser;
    private Workspace testWorkspace;

    @BeforeEach
    void setUp() {
        testUser = User.builder().id(UUID.randomUUID()).email("test@mail.com").build();
        testWorkspace = Workspace.builder().id(UUID.randomUUID()).name("Test WS").owner(testUser).build();
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void create_PersistsWorkspaceAndOwnerJunction() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(testUser);
        when(workspaceRepository.save(any(Workspace.class))).thenReturn(testWorkspace);

        WorkspaceResponse mockResponse = new WorkspaceResponse(
                testWorkspace.getId(), "Test WS", "Desc", testUser.getId(), com.agiletrack.backend.workspace.entity.WorkspaceRole.OWNER, null, null
        );
        when(workspaceMapper.toResponse(any(), any())).thenReturn(mockResponse);

        WorkspaceResponse response = workspaceService.create(new CreateWorkspaceRequest("Test WS", "Desc"));

        assertThat(response.name()).isEqualTo("Test WS");
        verify(workspaceRepository).save(any(Workspace.class));
        verify(workspaceMemberRepository).save(any(WorkspaceMember.class));
    }

    @Test
    void getOwnedWorkspace_UserNotMember_ThrowsAccessDenied() {
        UUID wsId = testWorkspace.getId();
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(testUser);
        when(workspaceRepository.findById(wsId)).thenReturn(Optional.of(testWorkspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserId(wsId, testUser.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> workspaceService.getOwnedWorkspace(wsId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getOwnedWorkspace_UserIsViewer_ThrowsAccessDenied() {
        UUID wsId = testWorkspace.getId();
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(testUser);
        when(workspaceRepository.findById(wsId)).thenReturn(Optional.of(testWorkspace));
        
        WorkspaceMember viewerMember = WorkspaceMember.builder()
                .user(testUser)
                .workspace(testWorkspace)
                .role(com.agiletrack.backend.workspace.entity.WorkspaceRole.VIEWER)
                .build();
                
        when(workspaceMemberRepository.findByWorkspaceIdAndUserId(wsId, testUser.getId()))
                .thenReturn(Optional.of(viewerMember));

        assertThatThrownBy(() -> workspaceService.getOwnedWorkspace(wsId))
                .isInstanceOf(AccessDeniedException.class);
    }
}

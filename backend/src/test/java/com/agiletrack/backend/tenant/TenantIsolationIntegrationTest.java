package com.agiletrack.backend.tenant;

import com.agiletrack.backend.AbstractIntegrationTest;

import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.security.JwtService;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskPriority;
import com.agiletrack.backend.task.entity.TaskStatus;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.user.entity.Role;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import com.agiletrack.backend.workspace.entity.Workspace;
import com.agiletrack.backend.workspace.entity.WorkspaceMember;
import com.agiletrack.backend.workspace.entity.WorkspaceRole;
import com.agiletrack.backend.workspace.repository.WorkspaceMemberRepository;
import com.agiletrack.backend.workspace.repository.WorkspaceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Tenant Isolation - Cross-Workspace Security Matrix")
public class TenantIsolationIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;

    private String userAToken;
    private String userBToken;
    private UUID userBId;
    
    private UUID workspaceAId;
    private UUID workspaceBId;
    
    private UUID projectAId;
    private UUID projectBId;
    
    private UUID taskAId;
    private UUID taskBId;
    
    private UUID memberAToRemoveId; // A member added to Workspace A just so we can try to remove them using User B
    private UUID memberAMemberId; // the WorkspaceMember ID of owner A inside workspace A

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        // ----------------------------------------------------
        // Tenant A Setup
        // ----------------------------------------------------
        User userA = userRepository.save(User.builder()
                .email("usera@test.com")
                .password("pw")
                .role(Role.USER)
                .build());

        Workspace workspaceA = workspaceRepository.save(Workspace.builder()
                .name("Workspace A")
                .owner(userA)
                .build());
        workspaceAId = workspaceA.getId();

        WorkspaceMember memberA = workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspaceA)
                .user(userA)
                .role(WorkspaceRole.OWNER)
                .build());
        memberAMemberId = memberA.getId();

        Project projectA = projectRepository.save(Project.builder()
                .name("Project A")
                .status(ProjectStatus.PLANNING)
                .workspace(workspaceA)
                .build());
        projectAId = projectA.getId();

        Task taskA = taskRepository.save(Task.builder()
                .title("Task A")
                .status(TaskStatus.TODO)
                .priority(TaskPriority.MEDIUM)
                .project(projectA)
                .build());
        taskAId = taskA.getId();

        userAToken = "Bearer " + jwtService.generateToken(new CustomUserDetails(userA));

        // ----------------------------------------------------
        // Tenant B Setup
        // ----------------------------------------------------
        User userB = userRepository.save(User.builder()
                .email("userb@test.com")
                .password("pw")
                .role(Role.USER)
                .build());
        userBId = userB.getId();

        Workspace workspaceB = workspaceRepository.save(Workspace.builder()
                .name("Workspace B")
                .owner(userB)
                .build());
        workspaceBId = workspaceB.getId();

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspaceB)
                .user(userB)
                .role(WorkspaceRole.OWNER)
                .build());

        Project projectB = projectRepository.save(Project.builder()
                .name("Project B")
                .status(ProjectStatus.PLANNING)
                .workspace(workspaceB)
                .build());
        projectBId = projectB.getId();

        Task taskB = taskRepository.save(Task.builder()
                .title("Task B")
                .status(TaskStatus.TODO)
                .priority(TaskPriority.MEDIUM)
                .project(projectB)
                .build());
        taskBId = taskB.getId();

        userBToken = "Bearer " + jwtService.generateToken(new CustomUserDetails(userB));
        
        // Add User C to Workspace A as a member (for remove_member cross-tenant test later)
        User userC = userRepository.save(User.builder()
                .email("userc@test.com")
                .password("pw")
                .role(Role.USER)
                .build());
                
        WorkspaceMember memberC = workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspaceA)
                .user(userC)
                .role(WorkspaceRole.MEMBER)
                .build());
        memberAToRemoveId = memberC.getId();
    }

    @Test
    @DisplayName("1. Cross-workspace direct access (403): User A -> Workspace B")
    void crossWorkspaceDirectAccess_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/workspaces/{id}", workspaceBId)
                .header("Authorization", userAToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("2. Cross-workspace project spoofing (404): User A -> Workspace A path -> Project B ID")
    void crossWorkspaceProjectSpoofing_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/workspaces/{workspaceId}/projects/{projectId}", workspaceAId, projectBId)
                .header("Authorization", userAToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("3. Cross-workspace task spoofing (404): User A -> Workspace A -> Project A -> Task B ID")
    void crossWorkspaceTaskSpoofing_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}", workspaceAId, projectAId, taskBId)
                .header("Authorization", userAToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("4. Cross-tenant assignment (400): Assign Task A to User B (not in Workspace A)")
    void assignTaskToNonMember_fails() throws Exception {
        String payload = """
                {
                    "assigneeId": "%s"
                }
                """.formatted(userBId);

        mockMvc.perform(put("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/assignee", workspaceAId, projectAId, taskAId)
                .header("Authorization", userAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("5. Cross-tenant member removal (400): User B tries to remove User C from Workspace B using User C's WorkspaceMember ID from Workspace A")
    void removeMemberFromAnotherWorkspace_fails() throws Exception {
        mockMvc.perform(delete("/api/v1/workspaces/{w}/members/{m}", workspaceBId, memberAToRemoveId)
                .header("Authorization", userBToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("6. Owner protection (400): Attempt to remove OWNER from workspace")
    void ownerRemoval_fails() throws Exception {
        mockMvc.perform(delete("/api/v1/workspaces/{w}/members/{m}", workspaceAId, memberAMemberId)
                .header("Authorization", userAToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("7. Owner invitation (400): Attempt to invite someone as OWNER")
    void ownerInvitation_fails() throws Exception {
        String payload = """
                {
                    "email": "userb@test.com",
                    "role": "OWNER"
                }
                """;

        mockMvc.perform(post("/api/v1/workspaces/{w}/members", workspaceAId)
                .header("Authorization", userAToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("8. Cross-workspace chain mismatch (404): User B -> Workspace B -> Project A -> Task A")
    void taskProjectWorkspaceMismatch_returns404() throws Exception {
        // User B tries to access Task A (which belongs to Project A).
        // Even if they use their own valid Workspace B ID in the path, it should 404
        // because Project A does not belong to Workspace B.
        mockMvc.perform(get("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}", workspaceBId, projectAId, taskAId)
                .header("Authorization", userBToken))
                .andExpect(status().isNotFound());
    }
}


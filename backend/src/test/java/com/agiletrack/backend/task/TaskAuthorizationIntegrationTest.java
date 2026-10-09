package com.agiletrack.backend.task;

import com.agiletrack.backend.AbstractIntegrationTest;

import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.security.JwtService;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskPriority;
import com.agiletrack.backend.task.entity.WorkItemType;
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

import org.springframework.context.annotation.Import;


import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test proving that the server enforces MEMBER task RBAC
 * independently of any client-side UI behaviour.
 *
 * The critical invariant:
 *   MEMBER → directly calls any mutating API → allowed (not just offered in UI)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")

@DisplayName("Task RBAC — server-side enforcement")
class TaskAuthorizationIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;

    private String memberToken;
    private UUID workspaceId;
    private UUID projectId;
    private UUID taskId;
    private UUID memberId;   // the member user's UUID — needed for assigneeId in create payload

    @BeforeEach
    void setUp() {
        // Cleanup in FK dependency order
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = userRepository.save(User.builder()
                .email("owner@test.com")
                .password("pw")
                .role(Role.USER)
                .build());

        User member = userRepository.save(User.builder()
                .email("member@test.com")
                .password("pw")
                .role(Role.USER)
                .build());
        memberId = member.getId();

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Test Workspace")
                .description("Integration test")
                .owner(owner)
                .build());
        workspaceId = workspace.getId();

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(owner).role(WorkspaceRole.OWNER).build());
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(member).role(WorkspaceRole.MEMBER).build());

        Project project = projectRepository.save(Project.builder()
                .name("Test Project")
                .description("Test")
                .status(ProjectStatus.ACTIVE)
                .workspace(workspace)
                .build());
        projectId = project.getId();

        Task task = taskRepository.save(Task.builder()
                .title("Existing Task")
                .description("A task to mutate in tests")
                .status(TaskStatus.TODO)
                .type(WorkItemType.FEATURE)
                .priority(TaskPriority.MEDIUM)
                .position(1.0)
                .project(project)
                .assignee(member)
                .build());
        taskId = task.getId();

        memberToken = jwtService.generateToken(new CustomUserDetails(member));
    }

    // ── MEMBER: mutations permitted ────────────────────────────────────────────

    @Test
    @DisplayName("MEMBER → POST /tasks → 201")
    void member_createTask_isAllowed() throws Exception {
        mockMvc.perform(post(taskBaseUrl())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createTaskJson()))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("MEMBER → PUT /tasks/{id} → 200")
    void member_updateTask_isAllowed() throws Exception {
        mockMvc.perform(put(taskUrl(taskId))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateTaskJson()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("MEMBER → PATCH /tasks/{id}/status → 200")
    void member_patchTaskStatus_isAllowed() throws Exception {
        mockMvc.perform(patch(taskUrl(taskId) + "/status")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("MEMBER → DELETE /tasks/{id} → 204")
    void member_deleteTask_isAllowed() throws Exception {
        mockMvc.perform(delete(taskUrl(taskId))
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNoContent());
    }

    // ── URL helpers ───────────────────────────────────────────────────────────

    private String taskBaseUrl() {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks";
    }

    private String taskUrl(UUID id) {
        return taskBaseUrl() + "/" + id;
    }

    private String createTaskJson() {
        // deadline must be in the future (@Future constraint)
        return """
                {
                  "title": "New Task from Test",
                  "description": "Created by integration test",
                  "type": "FEATURE",
                  "priority": "MEDIUM",
                  "deadline": "2099-12-31T23:59:59",
                  "assigneeId": "%s"
                }
                """.formatted(memberId);
    }

    /** The version currently stored, so a rejected request is rejected on authorization, not validation. */
    private Long currentVersion() {
        return taskRepository.findById(taskId).orElseThrow().getVersion();
    }

    private String updateTaskJson() {
        return """
                {
                  "title": "Updated Task Title",
                  "description": "Updated by integration test",
                  "type": "FEATURE",
                  "version": %s,
                  "priority": "HIGH",
                  "deadline": "2099-12-31T23:59:59",
                  "assigneeId": "%s"
                }
                """.formatted(currentVersion(), memberId);
    }
}


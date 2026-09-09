package com.agiletrack.backend.task;

import com.agiletrack.backend.AbstractIntegrationTest;

import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class TaskActivityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private WorkspaceRepository workspaceRepository;
    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private TaskRepository taskRepository;

    private UUID workspaceId;
    private UUID projectId;
    private UUID ownerId;
    private User owner;
    private UUID user2Id;
    private User user2;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        owner = userRepository.save(User.builder()
                .email("activity@test.com")
                .password("pw")
                .role(Role.USER)
                .build());
        ownerId = owner.getId();

        user2 = userRepository.save(User.builder()
                .email("user2@test.com")
                .password("pw")
                .role(Role.USER)
                .build());
        user2Id = user2.getId();

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Activity WS")
                .owner(owner)
                .build());
        workspaceId = workspace.getId();

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace)
                .user(owner)
                .role(WorkspaceRole.OWNER)
                .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace)
                .user(user2)
                .role(WorkspaceRole.MEMBER)
                .build());

        Project project = projectRepository.save(Project.builder()
                .name("Activity Project")
                .status(ProjectStatus.ACTIVE)
                .workspace(workspace)
                .build());
        projectId = project.getId();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(owner, null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")))
        );
    }

    @Test
    @DisplayName("Task lifecycle generates correct activity records")
    void taskLifecycle_generatesActivities() throws Exception {
        // 1. Create Task -> CREATED
        String createPayload = """
                {
                    "title": "Activity Task",
                    "description": "Desc",
                    "type": "FEATURE",
                    "priority": "HIGH",
                    "assigneeId": "%s"
                }
                """.formatted(ownerId);

        String responseStr = mockMvc.perform(post("/api/v1/workspaces/{w}/projects/{p}/tasks", workspaceId, projectId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createPayload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        // Extract taskId using simple string manipulation (we know it's in the response)
        String taskIdStr = responseStr.substring(responseStr.indexOf("\"id\":\"") + 6, responseStr.indexOf("\"", responseStr.indexOf("\"id\":\"") + 6));
        UUID taskId = UUID.fromString(taskIdStr);

        mockMvc.perform(get("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/activities", workspaceId, projectId, taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].type", is("CREATED")));

        // 2. Assign Task -> ASSIGNED
        String assignPayload = """
                {
                    "assigneeId": "%s"
                }
                """.formatted(user2Id);

        mockMvc.perform(put("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/assignee", workspaceId, projectId, taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(assignPayload))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/activities", workspaceId, projectId, taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].type", is("ASSIGNED"))) // Descending order
                .andExpect(jsonPath("$[1].type", is("CREATED")));

        // 3. Change Priority -> PRIORITY_CHANGED
        String updatePayload = """
                {
                    "title": "Activity Task",
                    "description": "Desc",
                    "type": "FEATURE",
                    "priority": "URGENT",
                    "version": %s,
                    "assigneeId": "%s"
                }
                """.formatted(taskRepository.findById(taskId).orElseThrow().getVersion(), ownerId);

        mockMvc.perform(put("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}", workspaceId, projectId, taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updatePayload))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/activities", workspaceId, projectId, taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].type", is("PRIORITY_CHANGED")));

        // 4. Change Status -> STATUS_CHANGED
        String statusPayload = """
                {
                    "status": "IN_PROGRESS"
                }
                """;

        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, projectId, taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusPayload))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/activities", workspaceId, projectId, taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].type", is("STATUS_CHANGED")));

        // 5. Change Status to DONE -> COMPLETED
        // First transition through IN_REVIEW
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, projectId, taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"IN_REVIEW\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, projectId, taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"DONE\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/activities", workspaceId, projectId, taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[0].type", is("COMPLETED")));
    }

    @Test
    @DisplayName("Failed mutations do not produce activity records")
    void failedMutation_noActivity() throws Exception {
        // Create Task -> CREATED
        String createPayload = """
                {
                    "title": "Activity Task",
                    "description": "Desc",
                    "type": "FEATURE",
                    "priority": "HIGH",
                    "assigneeId": "%s"
                }
                """.formatted(ownerId);

        String responseStr = mockMvc.perform(post("/api/v1/workspaces/{w}/projects/{p}/tasks", workspaceId, projectId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createPayload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String taskIdStr = responseStr.substring(responseStr.indexOf("\"id\":\"") + 6, responseStr.indexOf("\"", responseStr.indexOf("\"id\":\"") + 6));
        UUID taskId = UUID.fromString(taskIdStr);

        // Fail to assign to non-existent user -> 404/400
        String assignPayload = """
                {
                    "assigneeId": "%s"
                }
                """.formatted(UUID.randomUUID());

        mockMvc.perform(put("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/assignee", workspaceId, projectId, taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(assignPayload))
                .andExpect(status().is4xxClientError());

        // Fail an invalid status transition (TODO -> DONE)
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, projectId, taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"DONE\"}"))
                .andExpect(status().isBadRequest());

        // Verify still only 1 activity
        mockMvc.perform(get("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/activities", workspaceId, projectId, taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].type", is("CREATED")));
    }
}

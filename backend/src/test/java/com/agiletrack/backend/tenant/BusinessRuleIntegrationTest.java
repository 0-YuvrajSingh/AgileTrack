package com.agiletrack.backend.tenant;

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

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Business Rule Enforcement Matrix")
public class BusinessRuleIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;

    private String token;
    private UUID workspaceId;
    private UUID archivedProjectId;
    private UUID activeProjectId;
    private UUID taskInActiveId;
    private UUID taskInArchivedId;
    private UUID taskInProgressId;
    private UUID taskInReviewId;
    private UUID ownerId;

    @BeforeEach
    void setUp() {
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
        ownerId = owner.getId();

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Business Rules WS")
                .owner(owner)
                .build());
        workspaceId = workspace.getId();

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace)
                .user(owner)
                .role(WorkspaceRole.OWNER)
                .build());

        Project archivedProject = projectRepository.save(Project.builder()
                .name("Archived Project")
                .status(ProjectStatus.ARCHIVED)
                .workspace(workspace)
                .build());
        archivedProjectId = archivedProject.getId();
        
        Task archivedTask = taskRepository.save(Task.builder()
                .title("Archived Task")
                .status(TaskStatus.DONE)
                .type(WorkItemType.FEATURE)
                .priority(TaskPriority.LOW)
                .project(archivedProject)
                .build());
        taskInArchivedId = archivedTask.getId();

        Project activeProject = projectRepository.save(Project.builder()
                .name("Active Project")
                .status(ProjectStatus.ACTIVE)
                .workspace(workspace)
                .build());
        activeProjectId = activeProject.getId();

        Task task = taskRepository.save(Task.builder()
                .title("Active Task")
                .status(TaskStatus.TODO)
                .type(WorkItemType.FEATURE)
                .priority(TaskPriority.LOW)
                .project(activeProject)
                .build());
        taskInActiveId = task.getId();

        Task inProgressTask = taskRepository.save(Task.builder()
                .title("In Progress Task")
                .status(TaskStatus.IN_PROGRESS)
                .type(WorkItemType.FEATURE)
                .priority(TaskPriority.LOW)
                .project(activeProject)
                .build());
        taskInProgressId = inProgressTask.getId();

        Task inReviewTask = taskRepository.save(Task.builder()
                .title("In Review Task")
                .status(TaskStatus.IN_REVIEW)
                .type(WorkItemType.FEATURE)
                .priority(TaskPriority.LOW)
                .project(activeProject)
                .build());
        taskInReviewId = inReviewTask.getId();

        token = "Bearer " + jwtService.generateToken(new CustomUserDetails(owner));
    }

    @Test
    @DisplayName("Archived project mutability (400): Cannot create task in archived project")
    void createTaskInArchivedProject_fails() throws Exception {
        String payload = """
                {
                    "title": "New Task",
                    "type": "FEATURE",
                    "priority": "LOW"
                }
                """;

        mockMvc.perform(post("/api/v1/workspaces/{w}/projects/{p}/tasks", workspaceId, archivedProjectId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Task state machine (200): TODO -> IN_PROGRESS")
    void taskState_todoToInProgress_success() throws Exception {
        String payload = """
                {
                    "status": "IN_PROGRESS"
                }
                """;

        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInActiveId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Task state machine (400): TODO -> DONE (invalid transition)")
    void taskState_todoToDone_fails() throws Exception {
        String payload = """
                {
                    "status": "DONE"
                }
                """;

        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInActiveId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Archived project mutability (400): Cannot update task in archived project")
    void updateTaskInArchivedProject_fails() throws Exception {
        String payload = """
                {
                    "title": "Updated",
                    "type": "FEATURE",
                    "priority": "HIGH"
                }
                """;
        mockMvc.perform(put("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}", workspaceId, archivedProjectId, taskInArchivedId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Archived project mutability (400): Cannot delete task in archived project")
    void deleteTaskInArchivedProject_fails() throws Exception {
        mockMvc.perform(delete("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}", workspaceId, archivedProjectId, taskInArchivedId)
                .header("Authorization", token))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Archived project mutability (400): Cannot change task status in archived project")
    void changeTaskStatusInArchivedProject_fails() throws Exception {
        String payload = """
                {
                    "status": "IN_PROGRESS"
                }
                """;
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, archivedProjectId, taskInArchivedId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Archived project mutability (400): Cannot change task position in archived project")
    void changeTaskPositionInArchivedProject_fails() throws Exception {
        String payload = "5.0";
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/position", workspaceId, archivedProjectId, taskInArchivedId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Archived project mutability (400): Cannot assign task in archived project")
    void assignTaskInArchivedProject_fails() throws Exception {
        String payload = """
                {
                    "assigneeId": "%s"
                }
                """.formatted(ownerId);
        mockMvc.perform(put("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/assignee", workspaceId, archivedProjectId, taskInArchivedId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Task state machine (400): TODO -> IN_REVIEW (invalid transition)")
    void taskState_todoToReview_fails() throws Exception {
        String payload = """
                {
                    "status": "IN_REVIEW"
                }
                """;
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInActiveId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Task state machine (400): IN_REVIEW -> TODO (invalid transition)")
    void taskState_reviewToTodo_fails() throws Exception {
        String payload = """
                {
                    "status": "TODO"
                }
                """;
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInReviewId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Task state machine (200): IN_PROGRESS -> IN_REVIEW")
    void taskState_inProgressToReview_success() throws Exception {
        String payload = """
                {
                    "status": "IN_REVIEW"
                }
                """;
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInProgressId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Task state machine (200): IN_REVIEW -> DONE")
    void taskState_reviewToDone_success() throws Exception {
        String payload = """
                {
                    "status": "DONE"
                }
                """;
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInReviewId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Task state machine (200): IN_PROGRESS -> TODO")
    void taskState_inProgressToTodo_success() throws Exception {
        String payload = """
                {
                    "status": "TODO"
                }
                """;
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInProgressId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Task state machine (200): IN_REVIEW -> IN_PROGRESS")
    void taskState_inReviewToInProgress_success() throws Exception {
        String payload = """
                {
                    "status": "IN_PROGRESS"
                }
                """;
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInReviewId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Task state machine (200): DONE -> IN_PROGRESS")
    void taskState_doneToInProgress_success() throws Exception {
        // First we need a task in DONE state
        String payload = """
                {
                    "status": "IN_PROGRESS"
                }
                """;
        // taskInArchivedId is DONE but archived project prevents mutations. We need a DONE task in active project.
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInReviewId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"DONE\"}"))
                .andExpect(status().isOk());
                
        // Now it's DONE, let's move it to IN_PROGRESS
        mockMvc.perform(patch("/api/v1/workspaces/{w}/projects/{p}/tasks/{t}/status", workspaceId, activeProjectId, taskInReviewId)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk());
    }

}
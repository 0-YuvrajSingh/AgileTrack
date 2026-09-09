package com.agiletrack.backend.concurrency;

import com.agiletrack.backend.AbstractIntegrationTest;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.security.JwtService;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskPriority;
import com.agiletrack.backend.task.entity.TaskStatus;
import com.agiletrack.backend.task.entity.WorkItemType;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Frozen business rule #10, exercised the way a real client hits it.
 *
 * <p>JPA's {@code @Version} alone does not cover this: each request re-reads the row, so two
 * sequential requests never collide however stale the second client's form data is. The API
 * therefore carries the version the client read, and a mismatch is a 409.
 *
 * <p>This is the scenario behind the demo's stale-write step: two people open the same work item,
 * one saves, the other saves over it and is refused.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Stale client writes are rejected with 409 over HTTP")
class StaleWriteApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;

    private String token;
    private UUID workspaceId;
    private UUID projectId;
    private UUID taskId;
    private UUID ownerId;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = userRepository.save(User.builder()
                .email("stale-owner@test.com").password("pw").role(Role.USER).build());
        ownerId = owner.getId();

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Stale WS").owner(owner).build());
        workspaceId = workspace.getId();

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(owner).role(WorkspaceRole.OWNER).build());

        Project project = projectRepository.save(Project.builder()
                .name("Stale Project").status(ProjectStatus.ACTIVE).workspace(workspace).build());
        projectId = project.getId();

        taskId = taskRepository.save(Task.builder()
                .title("Shared work item")
                .status(TaskStatus.TODO)
                .type(WorkItemType.FEATURE)
                .priority(TaskPriority.MEDIUM)
                .position(1.0)
                .project(project)
                .assignee(owner)
                .build()).getId();
    }

    private String taskUrl() {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks/" + taskId;
    }

    private String projectUrl() {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId;
    }

    private String taskBody(String title, Long version) {
        return """
                {
                  "title": "%s",
                  "description": "Desc",
                  "type": "FEATURE",
                  "priority": "MEDIUM",
                  "version": %s,
                  "assigneeId": "%s"
                }
                """.formatted(title, version, ownerId);
    }

    private String authHeader() {
        return "Bearer " + jwtService.generateToken(
                new CustomUserDetails(userRepository.findById(ownerId).orElseThrow()));
    }

    @Test
    @DisplayName("Two clients read the same work item; the second save is refused with 409")
    void staleWorkItemUpdate_isRejected() throws Exception {
        Long versionBothClientsRead = taskRepository.findById(taskId).orElseThrow().getVersion();

        // Client A saves first and wins.
        mockMvc.perform(put(taskUrl())
                        .header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskBody("Saved by A", versionBothClientsRead)))
                .andExpect(status().isOk());

        // Client B saves against the version it read before A's write.
        mockMvc.perform(put(taskUrl())
                        .header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskBody("Saved by B", versionBothClientsRead)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        // A's write stands; B's is not applied.
        assertThat(taskRepository.findById(taskId).orElseThrow().getTitle()).isEqualTo("Saved by A");
    }

    @Test
    @DisplayName("Re-reading after a conflict lets the client retry successfully")
    void retryAfterRefetch_succeeds() throws Exception {
        Long stale = taskRepository.findById(taskId).orElseThrow().getVersion();

        mockMvc.perform(put(taskUrl()).header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskBody("First", stale)))
                .andExpect(status().isOk());

        mockMvc.perform(put(taskUrl()).header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskBody("Stale retry", stale)))
                .andExpect(status().isConflict());

        Long fresh = taskRepository.findById(taskId).orElseThrow().getVersion();
        assertThat(fresh).isGreaterThan(stale);

        mockMvc.perform(put(taskUrl()).header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskBody("Retried with fresh version", fresh)))
                .andExpect(status().isOk());

        assertThat(taskRepository.findById(taskId).orElseThrow().getTitle())
                .isEqualTo("Retried with fresh version");
    }

    @Test
    @DisplayName("A full work item update without a version is rejected as invalid")
    void updateWithoutVersion_isBadRequest() throws Exception {
        String noVersion = """
                {
                  "title": "No version supplied",
                  "description": "Desc",
                  "type": "FEATURE",
                  "priority": "MEDIUM",
                  "assigneeId": "%s"
                }
                """.formatted(ownerId);

        mockMvc.perform(put(taskUrl())
                        .header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noVersion))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("A stale status transition is refused, and the stored status does not move")
    void staleStatusTransition_isRejected() throws Exception {
        Long stale = taskRepository.findById(taskId).orElseThrow().getVersion();

        mockMvc.perform(put(taskUrl()).header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskBody("Touched", stale)))
                .andExpect(status().isOk());

        mockMvc.perform(patch(taskUrl() + "/status")
                        .header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "status": "IN_PROGRESS", "version": %s }
                                """.formatted(stale)))
                .andExpect(status().isConflict());

        assertThat(taskRepository.findById(taskId).orElseThrow().getStatus())
                .isEqualTo(TaskStatus.TODO);
    }

    @Test
    @DisplayName("A status transition without a version still applies, keeping drag-and-drop workable")
    void statusTransitionWithoutVersion_isAccepted() throws Exception {
        mockMvc.perform(patch(taskUrl() + "/status")
                        .header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "status": "IN_PROGRESS" }
                                """))
                .andExpect(status().isOk());

        assertThat(taskRepository.findById(taskId).orElseThrow().getStatus())
                .isEqualTo(TaskStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("A stale project rename is refused and the winning name stands")
    void staleProjectUpdate_isRejected() throws Exception {
        Long stale = projectRepository.findById(projectId).orElseThrow().getVersion();

        mockMvc.perform(put(projectUrl()).header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Renamed by A", "description": "d", "version": %s }
                                """.formatted(stale)))
                .andExpect(status().isOk());

        mockMvc.perform(put(projectUrl()).header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Renamed by B", "description": "d", "version": %s }
                                """.formatted(stale)))
                .andExpect(status().isConflict());

        assertThat(projectRepository.findById(projectId).orElseThrow().getName())
                .isEqualTo("Renamed by A");
    }

    @Test
    @DisplayName("The version the API returns is the one the client must send back")
    void responseCarriesVersion() throws Exception {
        Long stored = taskRepository.findById(taskId).orElseThrow().getVersion();

        mockMvc.perform(put(taskUrl()).header("Authorization", authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskBody("Version echo", stored)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(stored + 1));
    }
}

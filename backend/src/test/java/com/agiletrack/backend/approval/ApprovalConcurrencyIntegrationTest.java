package com.agiletrack.backend.approval;

import com.agiletrack.backend.AbstractIntegrationTest;
import com.agiletrack.backend.approval.entity.ApprovalDecision;
import com.agiletrack.backend.approval.repository.ChangeApprovalRepository;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.readiness.dto.ReadinessReasonCode;
import com.agiletrack.backend.readiness.dto.ReadinessStatus;
import com.agiletrack.backend.release.entity.Release;
import com.agiletrack.backend.release.entity.ReleaseLifecycleState;
import com.agiletrack.backend.release.repository.ReleaseRepository;
import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.security.JwtService;
import com.agiletrack.backend.task.entity.*;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 5 — Approval & Readiness Concurrency and Stale-write Scenarios")
class ApprovalConcurrencyIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired ReleaseRepository releaseRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired ChangeApprovalRepository changeApprovalRepository;

    private String memberToken;
    private User memberUser;
    private UUID workspaceId;
    private UUID projectId;
    private UUID releaseId;
    private UUID changeTaskId;

    @BeforeEach
    void setUp() {
        changeApprovalRepository.deleteAll();
        taskRepository.deleteAll();
        releaseRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = saveUser("conc-owner@test.com");
        memberUser = saveUser("conc-member@test.com");

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Concurrency WS").owner(owner).build());
        workspaceId = workspace.getId();

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(owner).role(WorkspaceRole.OWNER).build());
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(memberUser).role(WorkspaceRole.MEMBER).build());

        Project project = projectRepository.save(Project.builder()
                .name("Payments").status(ProjectStatus.ACTIVE).workspace(workspace).build());
        projectId = project.getId();

        Release release = releaseRepository.save(Release.builder()
                .name("v2.5.0")
                .lifecycleState(ReleaseLifecycleState.PLANNED)
                .project(project)
                .build());
        releaseId = release.getId();

        Task changeTask = taskRepository.save(Task.builder()
                .title("Database Schema Migration")
                .status(TaskStatus.DONE)
                .type(WorkItemType.CHANGE)
                .riskLevel(RiskLevel.HIGH)
                .priority(TaskPriority.HIGH)
                .position(1.0)
                .project(project)
                .release(release)
                .assignee(memberUser)
                .build());
        changeTaskId = changeTask.getId();

        memberToken = jwtService.generateToken(new CustomUserDetails(memberUser));
    }

    private User saveUser(String email) {
        return userRepository.save(User.builder().email(email).password("pw").role(Role.USER).build());
    }

    private String readinessUrl() {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                + "/releases/" + releaseId + "/readiness";
    }

    private String approvalUrl() {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                + "/tasks/" + changeTaskId + "/approval";
    }

    @Test
    @DisplayName("Scenario A: Approval immediately satisfies readiness gate without caching lag")
    void scenarioA_approvalChangesReadiness() throws Exception {
        // 1. Initial evaluation: task is DONE, but HIGH risk change is unapproved -> NOT_READY
        mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(ReadinessStatus.NOT_READY.name()))
                .andExpect(jsonPath("$.reasons[0].code").value(ReadinessReasonCode.APPROVAL_REQUIRED.name()))
                .andExpect(jsonPath("$.reasons[0].detail").value(org.hamcrest.Matchers.containsString("has no approved decision")));

        // 2. Submit APPROVED decision
        mockMvc.perform(post(approvalUrl())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"APPROVED\"}"))
                .andExpect(status().isCreated());

        // 3. Subsequent readiness evaluation sees committed approval -> READY
        mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(ReadinessStatus.READY.name()))
                .andExpect(jsonPath("$.reasons").isEmpty());
    }

    @Test
    @DisplayName("Scenario B: Stale work-item update produces 409 Conflict")
    void scenarioB_staleWorkItemMutation_yields409() throws Exception {
        Long initialVersion = taskRepository.findById(changeTaskId).orElseThrow().getVersion();

        // User B updates the task successfully -> advances version
        String userBUpdate = """
                {
                  "title": "Database Schema Migration (Updated)",
                  "type": "CHANGE",
                  "riskLevel": "HIGH",
                  "priority": "HIGH",
                  "assigneeId": "%s",
                  "version": %d
                }
                """.formatted(memberUser.getId(), initialVersion);

        mockMvc.perform(put("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks/" + changeTaskId)
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userBUpdate))
                .andExpect(status().isOk());

        // User A submits a stale update using initialVersion -> 409 Conflict
        String staleUserAUpdate = """
                {
                  "title": "Database Schema Migration (Stale)",
                  "type": "CHANGE",
                  "riskLevel": "CRITICAL",
                  "priority": "HIGH",
                  "assigneeId": "%s",
                  "version": %d
                }
                """.formatted(memberUser.getId(), initialVersion);

        mockMvc.perform(put("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks/" + changeTaskId)
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(staleUserAUpdate))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This record was modified by someone else. Reload and try again."));
    }

    @Test
    @DisplayName("Scenario C: Rejection blocks readiness, subsequent approval restores READY")
    void scenarioC_approvalAfterRejection_restoresReadiness() throws Exception {
        // 1. Submit REJECTED decision
        mockMvc.perform(post(approvalUrl())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"REJECTED\"}"))
                .andExpect(status().isCreated());

        // Readiness is NOT_READY with rejected detail
        mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(ReadinessStatus.NOT_READY.name()))
                .andExpect(jsonPath("$.reasons[0].code").value(ReadinessReasonCode.APPROVAL_REQUIRED.name()))
                .andExpect(jsonPath("$.reasons[0].detail").value(org.hamcrest.Matchers.containsString("approval was rejected")));

        // 2. Later, after discussion, APPROVED decision is submitted
        mockMvc.perform(post(approvalUrl())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"APPROVED\"}"))
                .andExpect(status().isCreated());

        // Latest decision wins: readiness becomes READY
        mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(ReadinessStatus.READY.name()))
                .andExpect(jsonPath("$.reasons").isEmpty());
    }
}


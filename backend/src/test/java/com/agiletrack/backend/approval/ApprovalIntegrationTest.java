package com.agiletrack.backend.approval;

import com.agiletrack.backend.AbstractIntegrationTest;
import com.agiletrack.backend.approval.entity.ApprovalDecision;
import com.agiletrack.backend.approval.entity.ChangeApproval;
import com.agiletrack.backend.approval.repository.ChangeApprovalRepository;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.security.JwtService;
import com.agiletrack.backend.task.entity.*;
import com.agiletrack.backend.task.repository.TaskActivityRepository;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.user.entity.Role;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import com.agiletrack.backend.workspace.entity.Workspace;
import com.agiletrack.backend.workspace.entity.WorkspaceMember;
import com.agiletrack.backend.workspace.entity.WorkspaceRole;
import com.agiletrack.backend.workspace.repository.WorkspaceMemberRepository;
import com.agiletrack.backend.workspace.repository.WorkspaceRepository;
import org.hamcrest.Matchers;
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
@DisplayName("Phase 5 — Change Governance and Approval Workflow Integration Tests")
class ApprovalIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired ChangeApprovalRepository changeApprovalRepository;
    @Autowired TaskActivityRepository taskActivityRepository;

    private String ownerToken;
    private String memberToken;
    private String viewerToken;
    private String outsiderToken;
    private User memberUser;

    private UUID workspaceId;
    private UUID projectId;
    private UUID changeTaskId;
    private UUID featureTaskId;

    private UUID otherWorkspaceId;
    private UUID otherProjectId;
    private UUID otherChangeTaskId;

    @BeforeEach
    void setUp() {
        changeApprovalRepository.deleteAll();
        taskActivityRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = saveUser("appr-owner@test.com");
        memberUser = saveUser("appr-member@test.com");
        User viewer = saveUser("appr-viewer@test.com");
        User outsider = saveUser("appr-outsider@test.com");

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Governance WS").owner(owner).build());
        workspaceId = workspace.getId();

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(owner).role(WorkspaceRole.OWNER).build());
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(memberUser).role(WorkspaceRole.MEMBER).build());
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(viewer).role(WorkspaceRole.VIEWER).build());

        Project project = projectRepository.save(Project.builder()
                .name("Core System").status(ProjectStatus.ACTIVE).workspace(workspace).build());
        projectId = project.getId();

        changeTaskId = taskRepository.save(Task.builder()
                .title("Database Migration")
                .status(TaskStatus.TODO)
                .type(WorkItemType.CHANGE)
                .riskLevel(RiskLevel.HIGH)
                .priority(TaskPriority.HIGH)
                .position(1.0)
                .project(project)
                .assignee(memberUser)
                .build()).getId();

        featureTaskId = taskRepository.save(Task.builder()
                .title("UI Feature")
                .status(TaskStatus.TODO)
                .type(WorkItemType.FEATURE)
                .priority(TaskPriority.MEDIUM)
                .position(2.0)
                .project(project)
                .assignee(memberUser)
                .build()).getId();

        // Cross-workspace setup
        Workspace otherWorkspace = workspaceRepository.save(Workspace.builder()
                .name("Other WS").owner(outsider).build());
        otherWorkspaceId = otherWorkspace.getId();
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(otherWorkspace).user(outsider).role(WorkspaceRole.OWNER).build());

        Project otherProject = projectRepository.save(Project.builder()
                .name("Other Project").status(ProjectStatus.ACTIVE).workspace(otherWorkspace).build());
        otherProjectId = otherProject.getId();

        otherChangeTaskId = taskRepository.save(Task.builder()
                .title("Other Change")
                .status(TaskStatus.TODO)
                .type(WorkItemType.CHANGE)
                .riskLevel(RiskLevel.HIGH)
                .priority(TaskPriority.HIGH)
                .position(1.0)
                .project(otherProject)
                .assignee(outsider)
                .build()).getId();

        ownerToken = jwtService.generateToken(new CustomUserDetails(owner));
        memberToken = jwtService.generateToken(new CustomUserDetails(memberUser));
        viewerToken = jwtService.generateToken(new CustomUserDetails(viewer));
        outsiderToken = jwtService.generateToken(new CustomUserDetails(outsider));
    }

    private User saveUser(String email) {
        return userRepository.save(User.builder().email(email).password("pw").role(Role.USER).build());
    }

    private String approvalUrl(UUID wsId, UUID pId, UUID tId) {
        return "/api/v1/workspaces/" + wsId + "/projects/" + pId + "/tasks/" + tId + "/approval";
    }

    private String changesApprovalUrl(UUID wsId, UUID pId, UUID tId) {
        return "/api/v1/workspaces/" + wsId + "/projects/" + pId + "/changes/" + tId + "/approval";
    }

    // =========================================================================
    // 1. GET /approval checks
    // =========================================================================

    @Test
    @DisplayName("Reading approval on an unapproved HIGH risk CHANGE returns approvalRequired=true and decision=null")
    void getApproval_unapprovedHighRiskChange() throws Exception {
        mockMvc.perform(get(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workItemId").value(changeTaskId.toString()))
                .andExpect(jsonPath("$.riskLevel").value("HIGH"))
                .andExpect(jsonPath("$.approvalRequired").value(true))
                .andExpect(jsonPath("$.decision").doesNotExist());
    }

    @Test
    @DisplayName("Reading approval through /changes/{taskId}/approval alias also works identically")
    void getApproval_throughChangesAlias() throws Exception {
        mockMvc.perform(get(changesApprovalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workItemId").value(changeTaskId.toString()))
                .andExpect(jsonPath("$.riskLevel").value("HIGH"))
                .andExpect(jsonPath("$.approvalRequired").value(true));
    }

    @Test
    @DisplayName("Reading approval on a non-CHANGE work item is rejected with 400 Bad Request")
    void getApproval_onNonChange_isBadRequest() throws Exception {
        mockMvc.perform(get(approvalUrl(workspaceId, projectId, featureTaskId))
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Non-member reading approval is rejected with 403 Forbidden")
    void getApproval_byOutsider_isForbidden() throws Exception {
        mockMvc.perform(get(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 2. POST /approval decisions & authorization
    // =========================================================================

    @Test
    @DisplayName("Authorized member can approve a HIGH risk CHANGE work item")
    void submitDecision_approved_success() throws Exception {
        String body = """
                {
                  "decision": "APPROVED"
                }
                """;

        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.workItemId").value(changeTaskId.toString()))
                .andExpect(jsonPath("$.decision").value("APPROVED"))
                .andExpect(jsonPath("$.approverId").value(memberUser.getId().toString()))
                .andExpect(jsonPath("$.approverEmail").value(memberUser.getEmail()))
                .andExpect(jsonPath("$.approvalRequired").value(true));

        // Verify persisted in database
        assertThat(changeApprovalRepository.findByWorkItemIdOrderByCreatedAtDesc(changeTaskId))
                .hasSize(1)
                .first()
                .satisfies(a -> {
                    assertThat(a.getDecision()).isEqualTo(ApprovalDecision.APPROVED);
                    assertThat(a.getApprover().getId()).isEqualTo(memberUser.getId());
                });

        // Verify transactional activity record
        mockMvc.perform(get("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                        + "/tasks/" + changeTaskId + "/activities")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'APPROVAL_GRANTED')].details")
                        .value(Matchers.hasItem(Matchers.containsString("approved by " + memberUser.getEmail()))));
    }

    @Test
    @DisplayName("Authorized member can reject a CHANGE work item")
    void submitDecision_rejected_success() throws Exception {
        String body = """
                {
                  "decision": "REJECTED"
                }
                """;

        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.decision").value("REJECTED"))
                .andExpect(jsonPath("$.approverEmail").value(memberUser.getEmail()));

        // Verify transactional activity record
        mockMvc.perform(get("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                        + "/tasks/" + changeTaskId + "/activities")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'APPROVAL_REJECTED')].details")
                        .value(Matchers.hasItem(Matchers.containsString("rejected by " + memberUser.getEmail()))));
    }

    @Test
    @DisplayName("Latest decision rule: REJECTED then APPROVED leaves the item APPROVED")
    void submitDecision_rejectedThenApproved_latestDecisionWins() throws Exception {
        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"REJECTED\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"APPROVED\"}"))
                .andExpect(status().isCreated());

        // GET should return APPROVED
        mockMvc.perform(get(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("APPROVED"));
    }

    @Test
    @DisplayName("Latest decision rule: APPROVED then REJECTED leaves the item REJECTED")
    void submitDecision_approvedThenRejected_latestDecisionWins() throws Exception {
        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"APPROVED\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"REJECTED\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("REJECTED"));
    }

    @Test
    @DisplayName("Approver identity is strictly server-side: client-passed fields cannot spoof approver")
    void submitDecision_clientCannotSpoofApprover() throws Exception {
        UUID fakeUserId = UUID.randomUUID();
        String spoofBody = """
                {
                  "decision": "APPROVED",
                  "approverId": "%s",
                  "approverEmail": "spoofed@test.com"
                }
                """.formatted(fakeUserId);

        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(spoofBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.approverId").value(memberUser.getId().toString()))
                .andExpect(jsonPath("$.approverEmail").value(memberUser.getEmail()));
    }

    @Test
    @DisplayName("VIEWER role cannot submit approval decisions (403 Forbidden)")
    void submitDecision_viewerRole_isForbidden() throws Exception {
        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"APPROVED\"}"))
                .andExpect(status().isForbidden());

        // Ensure nothing was saved or audited
        assertThat(changeApprovalRepository.findByWorkItemIdOrderByCreatedAtDesc(changeTaskId)).isEmpty();
        assertThat(taskActivityRepository.findByTaskIdOrderByCreatedAtDesc(changeTaskId)).isEmpty();
    }

    @Test
    @DisplayName("Outsider cannot submit approval decisions to another workspace (403 Forbidden)")
    void submitDecision_outsider_isForbidden() throws Exception {
        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"APPROVED\"}"))
                .andExpect(status().isForbidden());

        assertThat(changeApprovalRepository.findByWorkItemIdOrderByCreatedAtDesc(changeTaskId)).isEmpty();
    }

    @Test
    @DisplayName("Cross-workspace resource approval spoofing fails with 404 Not Found")
    void submitDecision_crossWorkspaceSpoofing_isNotFound() throws Exception {
        // Authenticated member of workspace 1 tries to approve a task in workspace 2
        mockMvc.perform(post(approvalUrl(workspaceId, projectId, otherChangeTaskId))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"APPROVED\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Submitting approval for a non-CHANGE work item is rejected with 400 Bad Request")
    void submitDecision_onNonChange_isBadRequest() throws Exception {
        mockMvc.perform(post(approvalUrl(workspaceId, projectId, featureTaskId))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"APPROVED\"}"))
                .andExpect(status().isBadRequest());

        assertThat(changeApprovalRepository.findByWorkItemIdOrderByCreatedAtDesc(featureTaskId)).isEmpty();
    }

    @Test
    @DisplayName("Submitting invalid decision value is rejected with 400 Bad Request")
    void submitDecision_invalidDecision_isBadRequest() throws Exception {
        mockMvc.perform(post(approvalUrl(workspaceId, projectId, changeTaskId))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"MAYBE\"}"))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // 3. Risk Level Validation & Activity
    // =========================================================================

    @Test
    @DisplayName("Setting risk level on a non-CHANGE work item is rejected with 400 Bad Request")
    void createTask_nonChangeWithRiskLevel_isBadRequest() throws Exception {
        String body = """
                {
                  "title": "Bug with risk",
                  "type": "BUG",
                  "riskLevel": "HIGH",
                  "priority": "HIGH",
                  "assigneeId": "%s"
                }
                """.formatted(memberUser.getId());

        mockMvc.perform(post("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Updating a CHANGE item's risk level records a RISK_CHANGED activity")
    void updateTask_riskLevelChange_recordsActivity() throws Exception {
        Long version = taskRepository.findById(changeTaskId).orElseThrow().getVersion();

        String updateBody = """
                {
                  "title": "Database Migration",
                  "type": "CHANGE",
                  "riskLevel": "CRITICAL",
                  "priority": "HIGH",
                  "assigneeId": "%s",
                  "version": %d
                }
                """.formatted(memberUser.getId(), version);

        mockMvc.perform(put("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                        + "/tasks/" + changeTaskId)
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.riskLevel").value("CRITICAL"));

        mockMvc.perform(get("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                        + "/tasks/" + changeTaskId + "/activities")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'RISK_CHANGED')].details")
                        .value(Matchers.hasItem(Matchers.containsString("HIGH to CRITICAL"))));
    }
}


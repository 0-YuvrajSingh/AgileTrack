package com.agiletrack.backend.readiness;

import com.agiletrack.backend.AbstractIntegrationTest;
import com.agiletrack.backend.approval.entity.ApprovalDecision;
import com.agiletrack.backend.approval.entity.ChangeApproval;
import com.agiletrack.backend.approval.repository.ChangeApprovalRepository;
import com.agiletrack.backend.dependency.entity.DependencyType;
import com.agiletrack.backend.dependency.entity.WorkItemDependency;
import com.agiletrack.backend.dependency.repository.WorkItemDependencyRepository;
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
import com.agiletrack.backend.task.entity.RiskLevel;
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
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 4 — release readiness as derived state.
 *
 * <p>Each gate is exercised alone and in combination, the result is shown to be a pure function of
 * committed rows, and readiness is shown to stay truthful across a failed concurrent write.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Release readiness — derived, explainable and deterministic")
class ReadinessIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired ReleaseRepository releaseRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired WorkItemDependencyRepository dependencyRepository;
    @Autowired ChangeApprovalRepository changeApprovalRepository;

    private String token;
    private String outsiderToken;
    private UUID workspaceId;
    private UUID projectId;
    private UUID releaseId;
    private Project project;
    private Release release;

    @BeforeEach
    void setUp() {
        changeApprovalRepository.deleteAll();
        dependencyRepository.deleteAll();
        taskRepository.deleteAll();
        releaseRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = saveUser("readiness-owner@test.com");
        User outsider = saveUser("readiness-outsider@test.com");

        Workspace workspace = workspaceRepository.save(
                Workspace.builder().name("Readiness WS").owner(owner).build());
        workspaceId = workspace.getId();
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(owner).role(WorkspaceRole.OWNER).build());

        project = projectRepository.save(Project.builder()
                .name("Payments").status(ProjectStatus.ACTIVE).workspace(workspace).build());
        projectId = project.getId();

        release = releaseRepository.save(Release.builder()
                .name("v2.4.0").releaseVersion("2.4.0")
                .lifecycleState(ReleaseLifecycleState.PLANNED)
                .project(project).build());
        releaseId = release.getId();

        token = jwtService.generateToken(new CustomUserDetails(owner));
        outsiderToken = jwtService.generateToken(new CustomUserDetails(outsider));
    }

    private User saveUser(String email) {
        return userRepository.save(User.builder().email(email).password("pw").role(Role.USER).build());
    }

    private Task addWorkItem(String title, TaskStatus status, boolean inRelease) {
        return taskRepository.save(Task.builder()
                .title(title).status(status).type(WorkItemType.FEATURE)
                .priority(TaskPriority.MEDIUM).position(1.0)
                .project(project)
                .release(inRelease ? release : null)
                .build());
    }

    private Task addChangeItem(String title, RiskLevel riskLevel, TaskStatus status, boolean inRelease) {
        return taskRepository.save(Task.builder()
                .title(title).status(status).type(WorkItemType.CHANGE)
                .riskLevel(riskLevel)
                .priority(TaskPriority.HIGH).position(1.0)
                .project(project)
                .release(inRelease ? release : null)
                .build());
    }

    private void approve(Task task) {
        User owner = userRepository.findByEmail("readiness-owner@test.com").orElseThrow();
        changeApprovalRepository.save(ChangeApproval.builder()
                .workItem(task)
                .approver(owner)
                .decision(ApprovalDecision.APPROVED)
                .build());
    }

    private void reject(Task task) {
        User owner = userRepository.findByEmail("readiness-owner@test.com").orElseThrow();
        changeApprovalRepository.save(ChangeApproval.builder()
                .workItem(task)
                .approver(owner)
                .decision(ApprovalDecision.REJECTED)
                .build());
    }

    private void blocks(Task blocker, Task blocked) {
        dependencyRepository.save(WorkItemDependency.builder()
                .source(blocker).target(blocked).dependencyType(DependencyType.BLOCKS).build());
    }

    private void setStatus(UUID taskId, TaskStatus status) {
        Task task = taskRepository.findById(taskId).orElseThrow();
        task.setStatus(status);
        taskRepository.saveAndFlush(task);
    }

    private String readinessUrl() {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                + "/releases/" + releaseId + "/readiness";
    }

    private String readinessJson() throws Exception {
        return mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    // ==========================================================================
    @Nested
    @DisplayName("Gates")
    class Gates {

        @Test
        @DisplayName("An empty release is NOT_READY, and says so")
        void emptyRelease() throws Exception {
            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("NOT_READY"))
                    .andExpect(jsonPath("$.reasons[0].code").value("EMPTY_RELEASE"))
                    .andExpect(jsonPath("$.totalWorkItems").value(0));
        }

        @Test
        @DisplayName("Incomplete work is reported per work item, naming it")
        void incompleteWork() throws Exception {
            addWorkItem("Checkout flow", TaskStatus.IN_PROGRESS, true);
            addWorkItem("Rounding fix", TaskStatus.DONE, true);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("NOT_READY"))
                    .andExpect(jsonPath("$.reasons").value(hasSize(1)))
                    .andExpect(jsonPath("$.reasons[0].code").value("INCOMPLETE_WORK"))
                    .andExpect(jsonPath("$.reasons[0].workItemTitle").value("Checkout flow"))
                    .andExpect(jsonPath("$.reasons[0].detail").value(containsString("IN_PROGRESS")))
                    .andExpect(jsonPath("$.totalWorkItems").value(2))
                    .andExpect(jsonPath("$.completedWorkItems").value(1));
        }

        @Test
        @DisplayName("A blocked release work item is reported, naming the blocker")
        void blockedWork() throws Exception {
            Task blocked = addWorkItem("API-91", TaskStatus.IN_REVIEW, true);
            Task blocker = addWorkItem("API-87", TaskStatus.TODO, true);
            blocks(blocker, blocked);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("NOT_READY"))
                    .andExpect(jsonPath("$.reasons[?(@.code == 'BLOCKED_WORK')].detail")
                            .value(hasSize(1)))
                    .andExpect(jsonPath("$.reasons[?(@.code == 'BLOCKED_WORK')].detail")
                            .value(hasItem(containsString("API-87"))));
        }

        @Test
        @DisplayName("A blocker outside the release still counts against it")
        void blockerOutsideRelease() throws Exception {
            Task blocked = addWorkItem("In release", TaskStatus.DONE, true);
            Task outsideBlocker = addWorkItem("Outside release", TaskStatus.TODO, false);
            blocks(outsideBlocker, blocked);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("NOT_READY"))
                    .andExpect(jsonPath("$.reasons[?(@.code == 'BLOCKED_WORK')]").value(hasSize(1)))
                    // The work item itself is complete, so this is the only reason.
                    .andExpect(jsonPath("$.reasons[?(@.code == 'INCOMPLETE_WORK')]").value(hasSize(0)));
        }

        @Test
        @DisplayName("A cancelled release is NOT_READY whatever its contents look like")
        void cancelledRelease() throws Exception {
            addWorkItem("All done", TaskStatus.DONE, true);
            release.setLifecycleState(ReleaseLifecycleState.CANCELLED);
            releaseRepository.saveAndFlush(release);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("NOT_READY"))
                    .andExpect(jsonPath("$.reasons[0].code").value("RELEASE_CANCELLED"));
        }

        @Test
        @DisplayName("A release whose work is all complete and unblocked is READY, with no reasons")
        void readyRelease() throws Exception {
            addWorkItem("Checkout flow", TaskStatus.DONE, true);
            addWorkItem("Rounding fix", TaskStatus.DONE, true);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("READY"))
                    .andExpect(jsonPath("$.reasons").value(hasSize(0)))
                    .andExpect(jsonPath("$.completedWorkItems").value(2));
        }

        @Test
        @DisplayName("A resolved blocker stops counting against readiness")
        void resolvedBlockerIsIgnored() throws Exception {
            Task blocked = addWorkItem("Dependent", TaskStatus.DONE, true);
            Task blocker = addWorkItem("Blocker", TaskStatus.DONE, true);
            blocks(blocker, blocked);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("READY"));
        }

        @Test
        @DisplayName("Multiple failing gates all appear, so one fix does not hide the next")
        void multipleReasons() throws Exception {
            Task blocked = addWorkItem("Blocked item", TaskStatus.IN_REVIEW, true);
            Task blocker = addWorkItem("Blocking item", TaskStatus.TODO, true);
            blocks(blocker, blocked);

            String body = readinessJson();

            // Both items are incomplete, and one of them is additionally blocked.
            assertThat(body).contains("INCOMPLETE_WORK").contains("BLOCKED_WORK");
            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.reasons").value(hasSize(3)));
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Determinism")
    class Determinism {

        @Test
        @DisplayName("Identical committed state produces a byte-identical result, repeatedly")
        void repeatedEvaluationsAgree() throws Exception {
            addWorkItem("Zulu", TaskStatus.TODO, true);
            addWorkItem("Alpha", TaskStatus.IN_PROGRESS, true);
            Task blocked = addWorkItem("Mike", TaskStatus.IN_REVIEW, true);
            Task blocker = addWorkItem("Bravo", TaskStatus.TODO, true);
            blocks(blocker, blocked);

            String first = readinessJson();
            for (int i = 0; i < 5; i++) {
                assertThat(readinessJson()).isEqualTo(first);
            }
        }

        @Test
        @DisplayName("Reasons are ordered by code then title, never by database row order")
        void reasonsAreSorted() throws Exception {
            addWorkItem("Zulu", TaskStatus.TODO, true);
            addWorkItem("Alpha", TaskStatus.TODO, true);
            addWorkItem("Mike", TaskStatus.TODO, true);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.reasons[0].workItemTitle").value("Alpha"))
                    .andExpect(jsonPath("$.reasons[1].workItemTitle").value("Mike"))
                    .andExpect(jsonPath("$.reasons[2].workItemTitle").value("Zulu"));
        }

        @Test
        @DisplayName("Release-level reasons sort ahead of work item reasons")
        void releaseLevelReasonsComeFirst() throws Exception {
            addWorkItem("Some work", TaskStatus.TODO, true);
            release.setLifecycleState(ReleaseLifecycleState.CANCELLED);
            releaseRepository.saveAndFlush(release);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.reasons[0].code").value("RELEASE_CANCELLED"))
                    .andExpect(jsonPath("$.reasons[1].code").value("INCOMPLETE_WORK"));
        }

        @Test
        @DisplayName("Readiness follows committed state automatically as work progresses")
        void readinessTracksState() throws Exception {
            Task blocked = addWorkItem("Dependent", TaskStatus.IN_REVIEW, true);
            Task blocker = addWorkItem("Blocker", TaskStatus.IN_REVIEW, true);
            blocks(blocker, blocked);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("NOT_READY"))
                    .andExpect(jsonPath("$.reasons[?(@.code == 'BLOCKED_WORK')]").value(hasSize(1)));

            // Resolve the blocker. No write touches readiness or the dependent item.
            setStatus(blocker.getId(), TaskStatus.DONE);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("NOT_READY"))
                    .andExpect(jsonPath("$.reasons[?(@.code == 'BLOCKED_WORK')]").value(hasSize(0)))
                    .andExpect(jsonPath("$.reasons[?(@.code == 'INCOMPLETE_WORK')]").value(hasSize(1)));

            setStatus(blocked.getId(), TaskStatus.DONE);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("READY"));
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Derived, not settable")
    class NotSettable {

        @Test
        @DisplayName("Readiness fields sent to the release update endpoint are ignored")
        void readinessCannotBeWrittenThroughReleaseUpdate() throws Exception {
            addWorkItem("Unfinished", TaskStatus.TODO, true);

            Long version = releaseRepository.findById(releaseId).orElseThrow().getVersion();

            mockMvc.perform(put("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                            + "/releases/" + releaseId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "name": "v2.4.0",
                                      "version": %s,
                                      "status": "READY",
                                      "readiness": "READY",
                                      "reasons": []
                                    }
                                    """.formatted(version)))
                    .andExpect(status().isOk());

            // The gate still fails, because readiness was never a stored value to overwrite.
            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("NOT_READY"))
                    .andExpect(jsonPath("$.reasons[?(@.code == 'INCOMPLETE_WORK')]").value(hasSize(1)));
        }

        @Test
        @DisplayName("A non-member cannot read readiness for another tenant's release")
        void outsiderCannotRead() throws Exception {
            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + outsiderToken))
                    .andExpect(status().isForbidden());
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Concurrency")
    class Concurrency {

        /**
         * The required scenario: two users hold the same release state; B commits a work item
         * change that alters readiness; A then attempts a stale release write. A must get 409, and
         * the readiness evaluation afterwards must describe B's committed state — the rejected
         * write must leave no trace in either.
         */
        @Test
        @DisplayName("A stale release write is refused while readiness reflects the committed change")
        void staleWriteDoesNotCorruptReadiness() throws Exception {
            Task work = addWorkItem("Checkout flow", TaskStatus.IN_REVIEW, true);

            // Both users read the release at this version.
            Long versionBothRead = releaseRepository.findById(releaseId).orElseThrow().getVersion();

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("NOT_READY"));

            // User B commits a work item change that flips the only failing gate.
            setStatus(work.getId(), TaskStatus.DONE);

            // User B also renames the release, moving its version on.
            mockMvc.perform(put("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                            + "/releases/" + releaseId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "v2.4.0-rc1", "version": %s }
                                    """.formatted(versionBothRead)))
                    .andExpect(status().isOk());

            // User A writes against the version it read before B's change.
            mockMvc.perform(put("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                            + "/releases/" + releaseId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "renamed by A", "version": %s }
                                    """.formatted(versionBothRead)))
                    .andExpect(status().isConflict());

            // Readiness reflects committed state: B's completion counts, A's rename does not exist.
            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(jsonPath("$.status").value("READY"))
                    .andExpect(jsonPath("$.reasons").value(hasSize(0)))
                    .andExpect(jsonPath("$.releaseName").value("v2.4.0-rc1"));

            assertThat(releaseRepository.findById(releaseId).orElseThrow().getName())
                    .isEqualTo("v2.4.0-rc1");
        }

        @Test
        @DisplayName("A rejected work item write leaves readiness exactly as it was")
        void rejectedWorkItemWriteLeavesReadinessUnchanged() throws Exception {
            Task blocked = addWorkItem("Dependent", TaskStatus.IN_REVIEW, true);
            Task blocker = addWorkItem("Blocker", TaskStatus.TODO, true);
            blocks(blocker, blocked);

            String before = readinessJson();

            // Completing a blocked item is refused by the domain rule.
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                            .patch("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                                    + "/tasks/" + blocked.getId() + "/status")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "status": "DONE" }
                                    """))
                    .andExpect(status().isBadRequest());

            assertThat(readinessJson()).isEqualTo(before);
        }

        @Test
        @DisplayName("Readiness is a read: evaluating it never mutates anything")
        void evaluationIsSideEffectFree() throws Exception {
            Task work = addWorkItem("Checkout flow", TaskStatus.TODO, true);
            Long releaseVersionBefore = releaseRepository.findById(releaseId).orElseThrow().getVersion();
            Long taskVersionBefore = taskRepository.findById(work.getId()).orElseThrow().getVersion();

            for (int i = 0; i < 3; i++) {
                readinessJson();
            }

            assertThat(releaseRepository.findById(releaseId).orElseThrow().getVersion())
                    .isEqualTo(releaseVersionBefore);
            assertThat(taskRepository.findById(work.getId()).orElseThrow().getVersion())
                    .isEqualTo(taskVersionBefore);
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Change governance gate")
    class ChangeGovernanceGate {

        @Test
        @DisplayName("A release with an unapproved HIGH risk CHANGE is NOT_READY with APPROVAL_REQUIRED")
        void unapprovedHighRiskChange_makesReleaseNotReady() throws Exception {
            Task change = addChangeItem("Database cutover", RiskLevel.HIGH, TaskStatus.DONE, true);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(ReadinessStatus.NOT_READY.name()))
                    .andExpect(jsonPath("$.reasons[0].code").value(ReadinessReasonCode.APPROVAL_REQUIRED.name()))
                    .andExpect(jsonPath("$.reasons[0].workItemId").value(change.getId().toString()))
                    .andExpect(jsonPath("$.reasons[0].detail").value(containsString("has no approved decision")));
        }

        @Test
        @DisplayName("LOW and MEDIUM risk changes do not require approval and allow release to be READY")
        void lowAndMediumRiskChanges_doNotRequireApproval() throws Exception {
            addChangeItem("Minor copy update", RiskLevel.LOW, TaskStatus.DONE, true);
            addChangeItem("Internal tweak", RiskLevel.MEDIUM, TaskStatus.DONE, true);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(ReadinessStatus.READY.name()))
                    .andExpect(jsonPath("$.reasons").isEmpty());
        }

        @Test
        @DisplayName("Approving a HIGH risk change satisfies the approval gate")
        void approvedHighRiskChange_satisfiesGate() throws Exception {
            Task change = addChangeItem("API Gateway Migration", RiskLevel.HIGH, TaskStatus.DONE, true);
            approve(change);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(ReadinessStatus.READY.name()))
                    .andExpect(jsonPath("$.reasons").isEmpty());
        }

        @Test
        @DisplayName("A REJECTED decision keeps the release NOT_READY")
        void rejectedHighRiskChange_keepsReleaseNotReady() throws Exception {
            Task change = addChangeItem("Security Config Change", RiskLevel.CRITICAL, TaskStatus.DONE, true);
            reject(change);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(ReadinessStatus.NOT_READY.name()))
                    .andExpect(jsonPath("$.reasons[0].code").value(ReadinessReasonCode.APPROVAL_REQUIRED.name()))
                    .andExpect(jsonPath("$.reasons[0].detail").value(containsString("approval was rejected")));
        }

        @Test
        @DisplayName("Reasons follow deterministic order across incomplete work, blockers, and governance")
        void deterministicOrder_withGovernance() throws Exception {
            // INCOMPLETE_WORK (ordinal 2)
            addWorkItem("B - Incomplete feature", TaskStatus.IN_PROGRESS, true);

            // BLOCKED_WORK (ordinal 3)
            Task blocker = addWorkItem("Blocker task", TaskStatus.TODO, false);
            Task blocked = addWorkItem("A - Blocked feature", TaskStatus.DONE, true);
            blocks(blocker, blocked);

            // APPROVAL_REQUIRED (ordinal 4)
            addChangeItem("C - Critical Cutover", RiskLevel.CRITICAL, TaskStatus.DONE, true);

            mockMvc.perform(get(readinessUrl()).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(ReadinessStatus.NOT_READY.name()))
                    .andExpect(jsonPath("$.reasons", hasSize(3)))
                    .andExpect(jsonPath("$.reasons[0].code").value(ReadinessReasonCode.INCOMPLETE_WORK.name()))
                    .andExpect(jsonPath("$.reasons[1].code").value(ReadinessReasonCode.BLOCKED_WORK.name()))
                    .andExpect(jsonPath("$.reasons[2].code").value(ReadinessReasonCode.APPROVAL_REQUIRED.name()));
        }
    }

    // ==========================================================================
    @Test
    @DisplayName("Every NOT_READY result carries at least one reason")
    void notReadyAlwaysExplains() throws Exception {
        // Exercised across several shapes rather than trusting one.
        assertThat(readinessJson()).contains("NOT_READY").contains("EMPTY_RELEASE");

        Task work = addWorkItem("Work", TaskStatus.TODO, true);
        assertThat(readinessJson()).contains("NOT_READY").contains("INCOMPLETE_WORK");

        setStatus(work.getId(), TaskStatus.DONE);
        String ready = readinessJson();
        assertThat(ready).contains(ReadinessStatus.READY.name());
        assertThat(ready).contains("\"reasons\":[]");
    }
}

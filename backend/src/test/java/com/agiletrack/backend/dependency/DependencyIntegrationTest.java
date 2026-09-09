package com.agiletrack.backend.dependency;

import com.agiletrack.backend.AbstractIntegrationTest;
import com.agiletrack.backend.dependency.entity.DependencyType;
import com.agiletrack.backend.dependency.entity.WorkItemDependency;
import com.agiletrack.backend.dependency.repository.WorkItemDependencyRepository;
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
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 3 — the BLOCKS graph.
 *
 * <p>Required matrix: direct cycle, indirect cycle, disconnected graph, duplicate edge, concurrent
 * mutation, plus blocked completion and cross-tenant probes.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Dependencies — cycles, blocked completion and isolation")
class DependencyIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired WorkItemDependencyRepository dependencyRepository;

    private String memberToken;
    private String viewerToken;
    private String outsiderToken;

    private UUID workspaceId;
    private UUID projectId;
    private UUID otherProjectId;

    // A -> B -> C are wired up per test as needed; D and E stay disconnected.
    private UUID a;
    private UUID b;
    private UUID c;
    private UUID d;
    private UUID e;
    private UUID foreignTaskId;

    private UUID memberId;

    @BeforeEach
    void setUp() {
        dependencyRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = saveUser("dep-owner@test.com");
        User member = saveUser("dep-member@test.com");
        User viewer = saveUser("dep-viewer@test.com");
        User outsider = saveUser("dep-outsider@test.com");
        memberId = member.getId();

        Workspace workspace = workspaceRepository.save(
                Workspace.builder().name("Dep WS").owner(owner).build());
        workspaceId = workspace.getId();
        saveMember(workspace, owner, WorkspaceRole.OWNER);
        saveMember(workspace, member, WorkspaceRole.MEMBER);
        saveMember(workspace, viewer, WorkspaceRole.VIEWER);

        Project project = saveProject(workspace, "Graph Project");
        projectId = project.getId();
        Project other = saveProject(workspace, "Other Project");
        otherProjectId = other.getId();

        a = saveTask(project, "A").getId();
        b = saveTask(project, "B").getId();
        c = saveTask(project, "C").getId();
        d = saveTask(project, "D").getId();
        e = saveTask(project, "E").getId();
        foreignTaskId = saveTask(other, "Foreign").getId();

        memberToken = jwtService.generateToken(new CustomUserDetails(member));
        viewerToken = jwtService.generateToken(new CustomUserDetails(viewer));
        outsiderToken = jwtService.generateToken(new CustomUserDetails(outsider));
    }

    private User saveUser(String email) {
        return userRepository.save(User.builder().email(email).password("pw").role(Role.USER).build());
    }

    private void saveMember(Workspace ws, User user, WorkspaceRole role) {
        workspaceMemberRepository.save(
                WorkspaceMember.builder().workspace(ws).user(user).role(role).build());
    }

    private Project saveProject(Workspace ws, String name) {
        return projectRepository.save(Project.builder()
                .name(name).status(ProjectStatus.ACTIVE).workspace(ws).build());
    }

    private Task saveTask(Project project, String title) {
        return taskRepository.save(Task.builder()
                .title(title).status(TaskStatus.TODO).type(WorkItemType.FEATURE)
                .priority(TaskPriority.MEDIUM).position(1.0).project(project).build());
    }

    private String projectUrl() {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId;
    }

    private String depsUrl(UUID taskId) {
        return projectUrl() + "/tasks/" + taskId + "/dependencies";
    }

    private String body(UUID blockerId) {
        return """
                { "blockedByWorkItemId": "%s" }
                """.formatted(blockerId);
    }

    /** Declares "blocker blocks blocked" and expects it to be accepted. */
    private UUID link(UUID blocker, UUID blocked) throws Exception {
        MvcResult result = mockMvc.perform(post(depsUrl(blocked))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(blocker)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(com.jayway.jsonpath.JsonPath
                .read(result.getResponse().getContentAsString(), "$.id").toString());
    }

    private void expectRejected(UUID blocker, UUID blocked) throws Exception {
        mockMvc.perform(post(depsUrl(blocked))
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(blocker)))
                .andExpect(status().isBadRequest());
    }

    private void setStatus(UUID taskId, TaskStatus status) {
        Task task = taskRepository.findById(taskId).orElseThrow();
        task.setStatus(status);
        taskRepository.saveAndFlush(task);
    }

    private String statusBody(TaskStatus status) {
        return """
                { "status": "%s" }
                """.formatted(status);
    }

    // ==========================================================================
    @Nested
    @DisplayName("Edge creation")
    class EdgeCreation {

        @Test
        @DisplayName("A valid edge is created and reported from both sides")
        void createEdge() throws Exception {
            link(a, b);

            mockMvc.perform(get(depsUrl(b)).header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.blockedBy.length()").value(1))
                    .andExpect(jsonPath("$.blockedBy[0].blockerTitle").value("A"))
                    .andExpect(jsonPath("$.blockedBy[0].resolved").value(false))
                    .andExpect(jsonPath("$.blocked").value(true));

            mockMvc.perform(get(depsUrl(a)).header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.blocking.length()").value(1))
                    .andExpect(jsonPath("$.blocking[0].blockedTitle").value("B"))
                    .andExpect(jsonPath("$.blocked").value(false));
        }

        @Test
        @DisplayName("A work item cannot block itself")
        void selfDependency_isRejected() throws Exception {
            expectRejected(a, a);
            assertThat(dependencyRepository.count()).isZero();
        }

        @Test
        @DisplayName("The same edge cannot be added twice")
        void duplicateEdge_isRejected() throws Exception {
            link(a, b);
            expectRejected(a, b);
            assertThat(dependencyRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("Both directions between two items is itself a cycle and is rejected")
        void reverseEdge_isRejectedAsCycle() throws Exception {
            link(a, b);
            expectRejected(b, a);
            assertThat(dependencyRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("Adding a blocker writes history on both work items")
        void createEdge_isAudited() throws Exception {
            link(a, b);

            mockMvc.perform(get(projectUrl() + "/tasks/" + b + "/activities")
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(jsonPath("$[?(@.type == 'DEPENDENCY_ADDED')]")
                            .value(org.hamcrest.Matchers.hasSize(1)));

            mockMvc.perform(get(projectUrl() + "/tasks/" + a + "/activities")
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(jsonPath("$[?(@.type == 'DEPENDENCY_ADDED')]")
                            .value(org.hamcrest.Matchers.hasSize(1)));
        }

        @Test
        @DisplayName("Removing a blocker deletes the edge and is audited")
        void removeEdge_isAudited() throws Exception {
            UUID dependencyId = link(a, b);

            mockMvc.perform(delete(depsUrl(b) + "/" + dependencyId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isNoContent());

            assertThat(dependencyRepository.count()).isZero();

            mockMvc.perform(get(projectUrl() + "/tasks/" + b + "/activities")
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(jsonPath("$[?(@.type == 'DEPENDENCY_REMOVED')]")
                            .value(org.hamcrest.Matchers.hasSize(1)));
        }

        @Test
        @DisplayName("An edge cannot be deleted through a work item it does not belong to")
        void removeEdge_throughWrongWorkItem_isNotFound() throws Exception {
            UUID dependencyId = link(a, b);

            mockMvc.perform(delete(depsUrl(c) + "/" + dependencyId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isNotFound());

            assertThat(dependencyRepository.count()).isEqualTo(1);
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Cycle detection")
    class Cycles {

        @Test
        @DisplayName("Direct cycle: A blocks B, so B cannot block A")
        void directCycle_isRejected() throws Exception {
            link(a, b);
            expectRejected(b, a);
        }

        @Test
        @DisplayName("Indirect cycle: A blocks B blocks C, so C cannot block A")
        void indirectCycle_isRejected() throws Exception {
            link(a, b);
            link(b, c);

            expectRejected(c, a);
            assertThat(dependencyRepository.count()).isEqualTo(2);
        }

        @Test
        @DisplayName("The rejection names the work items forming the loop")
        void cycleRejection_namesTheLoop() throws Exception {
            link(a, b);
            link(b, c);

            mockMvc.perform(post(depsUrl(a))
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(c)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.allOf(
                                    org.hamcrest.Matchers.containsString("cycle"),
                                    org.hamcrest.Matchers.containsString("A"),
                                    org.hamcrest.Matchers.containsString("B"),
                                    org.hamcrest.Matchers.containsString("C"))));
        }

        @Test
        @DisplayName("A longer indirect cycle across four items is still caught")
        void deeperCycle_isRejected() throws Exception {
            link(a, b);
            link(b, c);
            link(c, d);

            expectRejected(d, a);
            assertThat(dependencyRepository.count()).isEqualTo(3);
        }

        @Test
        @DisplayName("A diamond is not a cycle: shared ancestors and descendants are allowed")
        void diamond_isAllowed() throws Exception {
            // A blocks B and C; both block D. Undirected loop, but no directed cycle.
            link(a, b);
            link(a, c);
            link(b, d);
            link(c, d);

            assertThat(dependencyRepository.count()).isEqualTo(4);
        }

        @Test
        @DisplayName("A disconnected component cannot be reached, so its edges are unaffected")
        void disconnectedGraph_isUnaffected() throws Exception {
            link(a, b);   // component one
            link(d, e);   // component two, no path between them

            // Joining the two components in one direction is fine.
            link(b, d);
            assertThat(dependencyRepository.count()).isEqualTo(3);

            // Now that A -> B -> D -> E exists, closing it back is a cycle.
            expectRejected(e, a);
            assertThat(dependencyRepository.count()).isEqualTo(3);
        }

        @Test
        @DisplayName("Traversal ignores edges in other projects")
        void traversalIsProjectScoped() throws Exception {
            // Build a chain in this project and confirm an unrelated project's graph is untouched.
            link(a, b);
            assertThat(dependencyRepository.findEdgesBySourceIds(
                    java.util.Set.of(a), DependencyType.BLOCKS, otherProjectId)).isEmpty();
            assertThat(dependencyRepository.findEdgesBySourceIds(
                    java.util.Set.of(a), DependencyType.BLOCKS, projectId)).hasSize(1);
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Blocked completion")
    class BlockedCompletion {

        /** Moves an item to DONE the long way, since TODO cannot jump straight there. */
        private void advanceToReview(UUID taskId) {
            setStatus(taskId, TaskStatus.IN_REVIEW);
        }

        @Test
        @DisplayName("A blocked work item cannot be completed, and the rejection names the blocker")
        void cannotCompleteWhileBlocked() throws Exception {
            link(a, b);
            advanceToReview(b);

            mockMvc.perform(patch(projectUrl() + "/tasks/" + b + "/status")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(statusBody(TaskStatus.DONE)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("\"A\"")));

            assertThat(taskRepository.findById(b).orElseThrow().getStatus())
                    .isEqualTo(TaskStatus.IN_REVIEW);
        }

        @Test
        @DisplayName("Completing the blocker unblocks the dependent item with no further action")
        void resolvingBlocker_unblocksAutomatically() throws Exception {
            link(a, b);
            advanceToReview(b);

            // Blocked while A is open.
            mockMvc.perform(get(depsUrl(b)).header("Authorization", "Bearer " + memberToken))
                    .andExpect(jsonPath("$.blocked").value(true));

            setStatus(a, TaskStatus.DONE);

            // No write against B, yet it is no longer blocked.
            mockMvc.perform(get(depsUrl(b)).header("Authorization", "Bearer " + memberToken))
                    .andExpect(jsonPath("$.blocked").value(false))
                    .andExpect(jsonPath("$.blockedBy[0].resolved").value(true));

            mockMvc.perform(patch(projectUrl() + "/tasks/" + b + "/status")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(statusBody(TaskStatus.DONE)))
                    .andExpect(status().isOk());

            assertThat(taskRepository.findById(b).orElseThrow().getStatus()).isEqualTo(TaskStatus.DONE);
        }

        @Test
        @DisplayName("Every blocker must be resolved, not just one")
        void allBlockersMustResolve() throws Exception {
            link(a, c);
            link(b, c);
            advanceToReview(c);

            setStatus(a, TaskStatus.DONE);

            mockMvc.perform(patch(projectUrl() + "/tasks/" + c + "/status")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(statusBody(TaskStatus.DONE)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("\"B\"")));
        }

        @Test
        @DisplayName("An unblocked item still completes normally")
        void unblockedItem_completes() throws Exception {
            advanceToReview(d);

            mockMvc.perform(patch(projectUrl() + "/tasks/" + d + "/status")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(statusBody(TaskStatus.DONE)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Blocked work is listed for the whole project in one call")
        void blockedWorkItemsOverview() throws Exception {
            link(a, b);
            link(a, c);

            mockMvc.perform(get(projectUrl() + "/blocked-work-items")
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2));

            setStatus(a, TaskStatus.DONE);

            mockMvc.perform(get(projectUrl() + "/blocked-work-items")
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Authorization and isolation")
    class Isolation {

        @Test
        @DisplayName("A dependency cannot span two projects")
        void crossProjectEdge_isRejected() throws Exception {
            mockMvc.perform(post(depsUrl(a))
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(foreignTaskId)))
                    .andExpect(status().isNotFound());

            assertThat(dependencyRepository.count()).isZero();
        }

        @Test
        @DisplayName("A VIEWER cannot create a dependency but can read the graph")
        void viewer_isReadOnly() throws Exception {
            mockMvc.perform(post(depsUrl(b))
                            .header("Authorization", "Bearer " + viewerToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(a)))
                    .andExpect(status().isForbidden());

            mockMvc.perform(get(depsUrl(b)).header("Authorization", "Bearer " + viewerToken))
                    .andExpect(status().isOk());

            assertThat(dependencyRepository.count()).isZero();
        }

        @Test
        @DisplayName("A non-member cannot create or read dependencies with valid UUIDs")
        void outsider_isRejected() throws Exception {
            mockMvc.perform(post(depsUrl(b))
                            .header("Authorization", "Bearer " + outsiderToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(a)))
                    .andExpect(status().isForbidden());

            mockMvc.perform(get(depsUrl(b)).header("Authorization", "Bearer " + outsiderToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Dependencies in an archived project are frozen")
        void archivedProject_freezesGraph() throws Exception {
            link(a, b);

            Project project = projectRepository.findById(projectId).orElseThrow();
            project.setStatus(ProjectStatus.ARCHIVED);
            projectRepository.saveAndFlush(project);

            mockMvc.perform(post(depsUrl(c))
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(a)))
                    .andExpect(status().isBadRequest());

            assertThat(dependencyRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("Deleting a work item removes the edges that referenced it")
        void deletingWorkItem_cascadesToEdges() throws Exception {
            link(a, b);
            assertThat(dependencyRepository.count()).isEqualTo(1);

            mockMvc.perform(delete(projectUrl() + "/tasks/" + a)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isNoContent());

            assertThat(dependencyRepository.count()).isZero();
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Concurrency")
    class Concurrency {

        @Test
        @DisplayName("A duplicate edge racing past the service check is still refused by the database")
        void duplicateEdge_isRefusedByTheDatabase() throws Exception {
            link(a, b);

            Task blocker = taskRepository.findById(a).orElseThrow();
            Task blocked = taskRepository.findById(b).orElseThrow();

            // Bypasses the service entirely: this is the unique constraint doing the work, which is
            // what protects the graph if two requests pass the existence check simultaneously.
            org.junit.jupiter.api.Assertions.assertThrows(Exception.class, () ->
                    dependencyRepository.saveAndFlush(WorkItemDependency.builder()
                            .source(blocker).target(blocked)
                            .dependencyType(DependencyType.BLOCKS).build()));
        }

        @Test
        @DisplayName("A self-edge is refused by the database as well as the service")
        void selfEdge_isRefusedByTheDatabase() {
            Task task = taskRepository.findById(a).orElseThrow();

            org.junit.jupiter.api.Assertions.assertThrows(Exception.class, () ->
                    dependencyRepository.saveAndFlush(WorkItemDependency.builder()
                            .source(task).target(task)
                            .dependencyType(DependencyType.BLOCKS).build()));
        }

        @Test
        @DisplayName("Completion is judged on committed state, so a blocker resolved meanwhile counts")
        void completionUsesCommittedState() throws Exception {
            link(a, b);
            setStatus(b, TaskStatus.IN_REVIEW);

            mockMvc.perform(patch(projectUrl() + "/tasks/" + b + "/status")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(statusBody(TaskStatus.DONE)))
                    .andExpect(status().isBadRequest());

            // Another actor commits the blocker's completion.
            setStatus(a, TaskStatus.DONE);

            mockMvc.perform(patch(projectUrl() + "/tasks/" + b + "/status")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(statusBody(TaskStatus.DONE)))
                    .andExpect(status().isOk());
        }
    }
}

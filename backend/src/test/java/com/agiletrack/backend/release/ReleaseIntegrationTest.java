package com.agiletrack.backend.release;

import com.agiletrack.backend.AbstractIntegrationTest;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.release.entity.Release;
import com.agiletrack.backend.release.entity.ReleaseLifecycleState;
import com.agiletrack.backend.release.repository.ReleaseRepository;
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

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 2 — releases: lifecycle, scope lock, project isolation and concurrency.
 *
 * <p>Every rule here is asserted against the database as well as the response, because the point
 * of the phase is that these are domain rules rather than UI affordances.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Releases — lifecycle, scope lock and isolation")
class ReleaseIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired ReleaseRepository releaseRepository;
    @Autowired TaskRepository taskRepository;

    private String memberToken;
    private String viewerToken;
    private String outsiderToken;

    private UUID workspaceId;
    private UUID projectId;
    private UUID otherProjectId;
    private UUID releaseId;
    private UUID taskId;
    private UUID otherProjectTaskId;

    // A second tenant entirely, used for cross-workspace probes.
    private UUID foreignWorkspaceId;
    private UUID foreignProjectId;
    private UUID foreignReleaseId;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        releaseRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = saveUser("rel-owner@test.com");
        User member = saveUser("rel-member@test.com");
        User viewer = saveUser("rel-viewer@test.com");
        User outsider = saveUser("rel-outsider@test.com");

        Workspace workspace = workspaceRepository.save(
                Workspace.builder().name("Delivery WS").owner(owner).build());
        workspaceId = workspace.getId();
        saveMember(workspace, owner, WorkspaceRole.OWNER);
        saveMember(workspace, member, WorkspaceRole.MEMBER);
        saveMember(workspace, viewer, WorkspaceRole.VIEWER);

        Project project = saveProject(workspace, "Payments");
        projectId = project.getId();
        Project otherProject = saveProject(workspace, "Search");
        otherProjectId = otherProject.getId();

        releaseId = releaseRepository.save(Release.builder()
                .name("v2.4.0").releaseVersion("2.4.0")
                .lifecycleState(ReleaseLifecycleState.PLANNED)
                .targetDate(LocalDate.now().plusDays(30))
                .project(project).build()).getId();

        taskId = saveTask(project, "Payments work item", member).getId();
        otherProjectTaskId = saveTask(otherProject, "Search work item", member).getId();

        // Separate tenant.
        User foreignOwner = saveUser("foreign-owner@test.com");
        Workspace foreign = workspaceRepository.save(
                Workspace.builder().name("Foreign WS").owner(foreignOwner).build());
        foreignWorkspaceId = foreign.getId();
        saveMember(foreign, foreignOwner, WorkspaceRole.OWNER);
        Project foreignProject = saveProject(foreign, "Foreign Project");
        foreignProjectId = foreignProject.getId();
        foreignReleaseId = releaseRepository.save(Release.builder()
                .name("foreign-1.0").lifecycleState(ReleaseLifecycleState.PLANNED)
                .project(foreignProject).build()).getId();

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

    private Task saveTask(Project project, String title, User assignee) {
        return taskRepository.save(Task.builder()
                .title(title).status(TaskStatus.TODO).type(WorkItemType.FEATURE)
                .priority(TaskPriority.MEDIUM).position(1.0)
                .project(project).assignee(assignee).build());
    }

    private String releasesUrl() {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/releases";
    }

    private String releaseUrl() {
        return releasesUrl() + "/" + releaseId;
    }

    private Release storedRelease() {
        return releaseRepository.findById(releaseId).orElseThrow();
    }

    private void moveTo(ReleaseLifecycleState state) {
        Release release = storedRelease();
        release.setLifecycleState(state);
        releaseRepository.saveAndFlush(release);
    }

    private String lifecycleBody(ReleaseLifecycleState state, Long version) {
        return version == null
                ? """
                  { "lifecycleState": "%s" }
                  """.formatted(state)
                : """
                  { "lifecycleState": "%s", "version": %s }
                  """.formatted(state, version);
    }

    // ==========================================================================
    @Nested
    @DisplayName("CRUD")
    class Crud {

        @Test
        @DisplayName("A new release starts PLANNED with an unlocked, editable scope")
        void create_startsPlanned() throws Exception {
            mockMvc.perform(post(releasesUrl())
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "v2.5.0", "releaseVersion": "2.5.0", "targetDate": "2099-01-31" }
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.lifecycleState").value("PLANNED"))
                    .andExpect(jsonPath("$.scopeLocked").value(false))
                    .andExpect(jsonPath("$.editable").value(true))
                    .andExpect(jsonPath("$.version").value(0));
        }

        @Test
        @DisplayName("Release names are unique within a project")
        void create_duplicateName_isRejected() throws Exception {
            mockMvc.perform(post(releasesUrl())
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "v2.4.0" }
                                    """))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("The same release name is fine in a different project")
        void create_sameNameInAnotherProject_isAllowed() throws Exception {
            mockMvc.perform(post("/api/v1/workspaces/" + workspaceId + "/projects/" + otherProjectId + "/releases")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "v2.4.0" }
                                    """))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("A release can be renamed while it is still editable")
        void update_succeeds() throws Exception {
            mockMvc.perform(put(releaseUrl())
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "v2.4.1", "releaseVersion": "2.4.1", "version": 0 }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("v2.4.1"));

            assertThat(storedRelease().getName()).isEqualTo("v2.4.1");
        }

        @Test
        @DisplayName("Deleting a PLANNED release releases its work items rather than deleting them")
        void delete_whilePlanned_detachesScope() throws Exception {
            mockMvc.perform(put(releaseUrl() + "/work-items/" + taskId)
                    .header("Authorization", "Bearer " + memberToken)).andExpect(status().isOk());

            mockMvc.perform(delete(releaseUrl())
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isNoContent());

            assertThat(releaseRepository.findById(releaseId)).isEmpty();
            Task task = taskRepository.findById(taskId).orElseThrow();
            assertThat(task.getRelease()).isNull();
        }

        @Test
        @DisplayName("A release that has started execution cannot be deleted")
        void delete_afterStart_isRejected() throws Exception {
            moveTo(ReleaseLifecycleState.IN_PROGRESS);

            mockMvc.perform(delete(releaseUrl())
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isBadRequest());

            assertThat(releaseRepository.findById(releaseId)).isPresent();
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Lifecycle")
    class Lifecycle {

        @Test
        @DisplayName("PLANNED advances to IN_PROGRESS")
        void plannedToInProgress() throws Exception {
            mockMvc.perform(patch(releaseUrl() + "/lifecycle")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(lifecycleBody(ReleaseLifecycleState.IN_PROGRESS, 0L)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.lifecycleState").value("IN_PROGRESS"))
                    .andExpect(jsonPath("$.scopeLocked").value(true));
        }

        @Test
        @DisplayName("PLANNED cannot jump straight to RELEASED")
        void plannedToReleased_isRejected() throws Exception {
            mockMvc.perform(patch(releaseUrl() + "/lifecycle")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(lifecycleBody(ReleaseLifecycleState.RELEASED, 0L)))
                    .andExpect(status().isBadRequest());

            assertThat(storedRelease().getLifecycleState()).isEqualTo(ReleaseLifecycleState.PLANNED);
        }

        @Test
        @DisplayName("RELEASED is terminal — it cannot be reopened")
        void releasedIsTerminal() throws Exception {
            moveTo(ReleaseLifecycleState.RELEASED);

            mockMvc.perform(patch(releaseUrl() + "/lifecycle")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(lifecycleBody(ReleaseLifecycleState.IN_PROGRESS, null)))
                    .andExpect(status().isBadRequest());

            assertThat(storedRelease().getLifecycleState()).isEqualTo(ReleaseLifecycleState.RELEASED);
        }

        @Test
        @DisplayName("CANCELLED is terminal — it cannot be revived")
        void cancelledIsTerminal() throws Exception {
            moveTo(ReleaseLifecycleState.CANCELLED);

            mockMvc.perform(patch(releaseUrl() + "/lifecycle")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(lifecycleBody(ReleaseLifecycleState.PLANNED, null)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("A terminal release's fields cannot be edited")
        void terminalRelease_cannotBeEdited() throws Exception {
            moveTo(ReleaseLifecycleState.RELEASED);
            Long current = storedRelease().getVersion();

            mockMvc.perform(put(releaseUrl())
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "renamed after ship", "version": %s }
                                    """.formatted(current)))
                    .andExpect(status().isBadRequest());

            assertThat(storedRelease().getName()).isEqualTo("v2.4.0");
        }

        @Test
        @DisplayName("An IN_PROGRESS release can still have its target date edited")
        void inProgressRelease_remainsEditable() throws Exception {
            moveTo(ReleaseLifecycleState.IN_PROGRESS);
            Long current = storedRelease().getVersion();

            mockMvc.perform(put(releaseUrl())
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "v2.4.0", "targetDate": "2099-06-30", "version": %s }
                                    """.formatted(current)))
                    .andExpect(status().isOk());
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Scope")
    class Scope {

        @Test
        @DisplayName("A work item can join and leave a PLANNED release, and both are audited")
        void addAndRemove_areAudited() throws Exception {
            mockMvc.perform(put(releaseUrl() + "/work-items/" + taskId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.releaseId").value(releaseId.toString()));

            mockMvc.perform(get(releaseUrl() + "/work-items")
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            mockMvc.perform(delete(releaseUrl() + "/work-items/" + taskId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.releaseId").doesNotExist());

            String activitiesUrl = "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId
                    + "/tasks/" + taskId + "/activities";
            mockMvc.perform(get(activitiesUrl).header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.type == 'RELEASE_ASSIGNED')]")
                            .value(org.hamcrest.Matchers.hasSize(1)))
                    .andExpect(jsonPath("$[?(@.type == 'RELEASE_UNASSIGNED')]")
                            .value(org.hamcrest.Matchers.hasSize(1)));
        }

        @Test
        @DisplayName("Scope is locked once the release is IN_PROGRESS")
        void addAfterScopeLock_isRejected() throws Exception {
            moveTo(ReleaseLifecycleState.IN_PROGRESS);

            mockMvc.perform(put(releaseUrl() + "/work-items/" + taskId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isBadRequest());

            assertThat(taskRepository.findById(taskId).orElseThrow().getRelease()).isNull();
        }

        @Test
        @DisplayName("Work already in scope cannot be removed after the lock either")
        void removeAfterScopeLock_isRejected() throws Exception {
            mockMvc.perform(put(releaseUrl() + "/work-items/" + taskId)
                    .header("Authorization", "Bearer " + memberToken)).andExpect(status().isOk());

            moveTo(ReleaseLifecycleState.IN_PROGRESS);

            mockMvc.perform(delete(releaseUrl() + "/work-items/" + taskId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isBadRequest());

            assertThat(taskRepository.findById(taskId).orElseThrow().getRelease()).isNotNull();
        }

        @Test
        @DisplayName("A work item cannot be assigned to another project's release")
        void crossProjectAssignment_isRejected() throws Exception {
            mockMvc.perform(put(releaseUrl() + "/work-items/" + otherProjectTaskId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isNotFound());

            assertThat(taskRepository.findById(otherProjectTaskId).orElseThrow().getRelease()).isNull();
        }

        @Test
        @DisplayName("A work item cannot be in two releases at once")
        void doubleAssignment_isRejected() throws Exception {
            UUID secondRelease = releaseRepository.save(Release.builder()
                    .name("v2.6.0").lifecycleState(ReleaseLifecycleState.PLANNED)
                    .project(projectRepository.findById(projectId).orElseThrow()).build()).getId();

            mockMvc.perform(put(releaseUrl() + "/work-items/" + taskId)
                    .header("Authorization", "Bearer " + memberToken)).andExpect(status().isOk());

            mockMvc.perform(put(releasesUrl() + "/" + secondRelease + "/work-items/" + taskId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isBadRequest());

            assertThat(taskRepository.findById(taskId).orElseThrow().getRelease().getId())
                    .isEqualTo(releaseId);
        }

        @Test
        @DisplayName("Removing a work item that is not in the release is rejected")
        void removeUnrelatedWorkItem_isRejected() throws Exception {
            mockMvc.perform(delete(releaseUrl() + "/work-items/" + taskId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Authorization and isolation")
    class Isolation {

        @Test
        @DisplayName("A VIEWER can read releases but cannot create one")
        void viewer_isReadOnly() throws Exception {
            mockMvc.perform(get(releasesUrl()).header("Authorization", "Bearer " + viewerToken))
                    .andExpect(status().isOk());

            mockMvc.perform(post(releasesUrl())
                            .header("Authorization", "Bearer " + viewerToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "sneaky" }
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("A VIEWER cannot change release scope")
        void viewer_cannotChangeScope() throws Exception {
            mockMvc.perform(put(releaseUrl() + "/work-items/" + taskId)
                            .header("Authorization", "Bearer " + viewerToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("A non-member cannot read a release even with the right UUIDs")
        void outsider_cannotRead() throws Exception {
            mockMvc.perform(get(releaseUrl()).header("Authorization", "Bearer " + outsiderToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("A release cannot be reached through another workspace's path")
        void crossTenantPathSpoofing_isRejected() throws Exception {
            // Our own release id, but addressed through the foreign tenant's workspace/project.
            mockMvc.perform(get("/api/v1/workspaces/" + foreignWorkspaceId
                            + "/projects/" + foreignProjectId + "/releases/" + releaseId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("A foreign release addressed through our own project is not found")
        void foreignReleaseThroughOwnProject_isNotFound() throws Exception {
            mockMvc.perform(get(releasesUrl() + "/" + foreignReleaseId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Releases in an archived project are frozen")
        void archivedProject_freezesReleases() throws Exception {
            Project project = projectRepository.findById(projectId).orElseThrow();
            project.setStatus(ProjectStatus.ARCHIVED);
            projectRepository.saveAndFlush(project);

            mockMvc.perform(post(releasesUrl())
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "v9.9.9" }
                                    """))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(put(releaseUrl() + "/work-items/" + taskId)
                            .header("Authorization", "Bearer " + memberToken))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==========================================================================
    @Nested
    @DisplayName("Concurrency")
    class Concurrency {

        @Test
        @DisplayName("A stale release edit is refused and the winning edit stands")
        void staleUpdate_isRejected() throws Exception {
            Long stale = storedRelease().getVersion();

            mockMvc.perform(put(releaseUrl())
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "Renamed by A", "version": %s }
                                    """.formatted(stale)))
                    .andExpect(status().isOk());

            mockMvc.perform(put(releaseUrl())
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "Renamed by B", "version": %s }
                                    """.formatted(stale)))
                    .andExpect(status().isConflict());

            assertThat(storedRelease().getName()).isEqualTo("Renamed by A");
        }

        @Test
        @DisplayName("A stale lifecycle transition is refused and the state does not move")
        void staleLifecycleTransition_isRejected() throws Exception {
            Long stale = storedRelease().getVersion();

            mockMvc.perform(put(releaseUrl())
                    .header("Authorization", "Bearer " + memberToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            { "name": "Touched", "version": %s }
                            """.formatted(stale))).andExpect(status().isOk());

            mockMvc.perform(patch(releaseUrl() + "/lifecycle")
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(lifecycleBody(ReleaseLifecycleState.IN_PROGRESS, stale)))
                    .andExpect(status().isConflict());

            assertThat(storedRelease().getLifecycleState()).isEqualTo(ReleaseLifecycleState.PLANNED);
        }

        @Test
        @DisplayName("A release edit without a version is rejected as invalid")
        void updateWithoutVersion_isBadRequest() throws Exception {
            mockMvc.perform(put(releaseUrl())
                            .header("Authorization", "Bearer " + memberToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "name": "No version" }
                                    """))
                    .andExpect(status().isBadRequest());
        }
    }
}

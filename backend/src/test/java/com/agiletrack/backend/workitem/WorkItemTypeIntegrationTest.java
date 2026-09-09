package com.agiletrack.backend.workitem;

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
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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

/**
 * Phase 1 — work items carry an engineering type end-to-end.
 *
 * <p>Also pins the rule that the new field is governed by the same authorization chain as every
 * other field: a UUID is not a capability, and a VIEWER cannot reclassify work.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Work item type — persistence, validation, authorization")
class WorkItemTypeIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;

    private String memberToken;
    private String viewerToken;
    private String outsiderToken;
    private UUID workspaceId;
    private UUID projectId;
    private UUID taskId;
    private UUID memberId;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = saveUser("wit-owner@test.com");
        User member = saveUser("wit-member@test.com");
        User viewer = saveUser("wit-viewer@test.com");
        User outsider = saveUser("wit-outsider@test.com");
        memberId = member.getId();

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Delivery WS").owner(owner).build());
        workspaceId = workspace.getId();

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(owner).role(WorkspaceRole.OWNER).build());
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(member).role(WorkspaceRole.MEMBER).build());
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(viewer).role(WorkspaceRole.VIEWER).build());

        Project project = projectRepository.save(Project.builder()
                .name("Delivery Project").status(ProjectStatus.ACTIVE).workspace(workspace).build());
        projectId = project.getId();

        taskId = taskRepository.save(Task.builder()
                .title("Existing work item")
                .status(TaskStatus.TODO)
                .type(WorkItemType.FEATURE)
                .priority(TaskPriority.MEDIUM)
                .position(1.0)
                .project(project)
                .assignee(member)
                .build()).getId();

        memberToken = jwtService.generateToken(new CustomUserDetails(member));
        viewerToken = jwtService.generateToken(new CustomUserDetails(viewer));
        outsiderToken = jwtService.generateToken(new CustomUserDetails(outsider));
    }

    private User saveUser(String email) {
        return userRepository.save(User.builder().email(email).password("pw").role(Role.USER).build());
    }

    private String tasksUrl() {
        return "/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks";
    }

    private String createJson(String type) {
        return """
                {
                  "title": "New work item",
                  "description": "Created by test",
                  "type": "%s",
                  "priority": "HIGH",
                  "assigneeId": "%s"
                }
                """.formatted(type, memberId);
    }

    private String updateJson(String type) {
        return """
                {
                  "title": "Existing work item",
                  "description": "Reclassified",
                  "type": "%s",
                  "priority": "MEDIUM",
                  "assigneeId": "%s"
                }
                """.formatted(type, memberId);
    }

    // -- every type round-trips ----------------------------------------------

    @ParameterizedTest
    @EnumSource(WorkItemType.class)
    @DisplayName("Each work item type is accepted, persisted and returned")
    void createTask_supportsEveryType(WorkItemType type) throws Exception {
        String body = mockMvc.perform(post(tasksUrl())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(type.name())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value(type.name()))
                .andReturn().getResponse().getContentAsString();

        UUID createdId = UUID.fromString(
                com.jayway.jsonpath.JsonPath.read(body, "$.id").toString());

        // Read back from the database, not just the response DTO.
        assertThat(taskRepository.findById(createdId)).get()
                .extracting(Task::getType).isEqualTo(type);
    }

    // -- validation ------------------------------------------------------------

    @Test
    @DisplayName("Missing type is rejected with 400")
    void createTask_withoutType_isBadRequest() throws Exception {
        String noType = """
                {
                  "title": "No type",
                  "priority": "HIGH",
                  "assigneeId": "%s"
                }
                """.formatted(memberId);

        mockMvc.perform(post(tasksUrl())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noType))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Unknown type value is rejected with 400")
    void createTask_withUnknownType_isBadRequest() throws Exception {
        mockMvc.perform(post(tasksUrl())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("EPIC")))
                .andExpect(status().isBadRequest());
    }

    // -- filtering -------------------------------------------------------------

    @Test
    @DisplayName("Listing with type=BUG returns only that type")
    void listTasks_filtersByType() throws Exception {
        mockMvc.perform(post(tasksUrl()).header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON).content(createJson("BUG")))
                .andExpect(status().isCreated());

        mockMvc.perform(get(tasksUrl()).param("type", "BUG")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].type").value("BUG"));

        // The seeded FEATURE item is still there, so an unfiltered read sees both.
        mockMvc.perform(get(tasksUrl()).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));
    }

    // -- activity history ------------------------------------------------------

    @Test
    @DisplayName("Changing type writes a TYPE_CHANGED activity; an unchanged type writes none")
    void updateTask_recordsTypeChangeActivity() throws Exception {
        mockMvc.perform(put(tasksUrl() + "/" + taskId)
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson("TECH_DEBT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("TECH_DEBT"));

        mockMvc.perform(get(tasksUrl() + "/" + taskId + "/activities")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'TYPE_CHANGED')].details")
                        .value(Matchers.hasItem(Matchers.containsString("FEATURE to TECH_DEBT"))));

        // Re-sending the same type must not append a second TYPE_CHANGED entry.
        mockMvc.perform(put(tasksUrl() + "/" + taskId)
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson("TECH_DEBT")))
                .andExpect(status().isOk());

        mockMvc.perform(get(tasksUrl() + "/" + taskId + "/activities")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(jsonPath("$[?(@.type == 'TYPE_CHANGED')]").value(Matchers.hasSize(1)));
    }

    // -- authorization on the new field ----------------------------------------

    @Test
    @DisplayName("VIEWER cannot reclassify a work item, and the stored type is unchanged")
    void viewer_cannotChangeType() throws Exception {
        mockMvc.perform(put(tasksUrl() + "/" + taskId)
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson("CHANGE")))
                .andExpect(status().isForbidden());

        assertThat(taskRepository.findById(taskId)).get()
                .extracting(Task::getType).isEqualTo(WorkItemType.FEATURE);
    }

    @Test
    @DisplayName("A non-member knowing the UUIDs still cannot set the type")
    void outsider_cannotChangeType() throws Exception {
        mockMvc.perform(put(tasksUrl() + "/" + taskId)
                        .header("Authorization", "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson("CHANGE")))
                .andExpect(status().isForbidden());

        assertThat(taskRepository.findById(taskId)).get()
                .extracting(Task::getType).isEqualTo(WorkItemType.FEATURE);
    }

    @Test
    @DisplayName("A non-member cannot filter another workspace's work items by type")
    void outsider_cannotListByType() throws Exception {
        mockMvc.perform(get(tasksUrl()).param("type", "FEATURE")
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());
    }
}

package com.agiletrack.backend;

import com.agiletrack.backend.auth.dto.LoginRequest;
import com.agiletrack.backend.auth.dto.RegisterRequest;
import com.agiletrack.backend.auth.dto.TokenRefreshRequest;
import com.agiletrack.backend.project.dto.CreateProjectRequest;
import com.agiletrack.backend.project.dto.UpdateProjectRequest;
import com.agiletrack.backend.task.dto.CreateTaskRequest;
import com.agiletrack.backend.task.dto.UpdateTaskRequest;
import com.agiletrack.backend.task.dto.UpdateTaskStatusRequest;
import com.agiletrack.backend.task.entity.TaskPriority;
import com.agiletrack.backend.task.entity.TaskStatus;
import com.agiletrack.backend.workspace.dto.CreateWorkspaceRequest;
import com.agiletrack.backend.workspace.dto.UpdateWorkspaceRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EndToEndIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerAndLogin_work() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RegisterRequest("auth@agiletrack.com", "password123"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("auth@agiletrack.com"));
    }

    @Test
    void refreshRotatesTokenAndLogoutInvalidatesRefreshToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest("refresh@agiletrack.com", "password123"))))
                .andExpect(status().isCreated());

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("refresh@agiletrack.com", "password123"))))
                .andExpect(status().isOk())
                .andReturn();

        String refreshToken = extractJsonField(loginResult.getResponse().getContentAsString(), "refreshToken");

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TokenRefreshRequest(refreshToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();

        String rotatedRefreshToken = extractJsonField(refreshResult.getResponse().getContentAsString(), "refreshToken");

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TokenRefreshRequest(refreshToken))))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TokenRefreshRequest(rotatedRefreshToken))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TokenRefreshRequest(rotatedRefreshToken))))
                .andExpect(status().isForbidden());
    }

    @Test
    void protectedEndpoint_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/workspaces"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void workspaceCrudLifecycle_works() throws Exception {
        String token = registerAndLogin("workspace-owner@agiletrack.com", "password123");

        String workspaceId = createWorkspace(token, "Alpha Corp", "Engineering");

        mockMvc.perform(put("/api/v1/workspaces/" + workspaceId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateWorkspaceRequest("Alpha Corp Updated", "Platform"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alpha Corp Updated"));

        mockMvc.perform(get("/api/v1/workspaces/" + workspaceId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alpha Corp Updated"));

        mockMvc.perform(delete("/api/v1/workspaces/" + workspaceId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/workspaces/" + workspaceId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void projectCrudLifecycle_works() throws Exception {
        String token = registerAndLogin("project-owner@agiletrack.com", "password123");
        String workspaceId = createWorkspace(token, "Beta Corp", "Delivery");
        String projectId = createProject(token, workspaceId, "Backend API", "Sprint 1");

        mockMvc.perform(put("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateProjectRequest("Backend API Updated", "Sprint 2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Backend API Updated"));

        mockMvc.perform(get("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Backend API Updated"));

        mockMvc.perform(delete("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void taskCrudLifecycle_works() throws Exception {
        String token = registerAndLogin("task-owner@agiletrack.com", "password123");
        String workspaceId = createWorkspace(token, "Gamma Corp", "Execution");
        String projectId = createProject(token, workspaceId, "Backend API", "Sprint 1");
        String ownerId = extractJsonField(getWorkspace(token, workspaceId).getResponse().getContentAsString(), "ownerId");
        String taskId = createTask(token, workspaceId, projectId, ownerId, "Setup Testing");

        mockMvc.perform(put("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks/" + taskId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateTaskRequest(
                                "Setup Testing Updated",
                                "Expanded test coverage",
                                TaskPriority.URGENT,
                                LocalDateTime.now().plusDays(3),
                                UUID.fromString(ownerId)
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Setup Testing Updated"));

        mockMvc.perform(patch("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks/" + taskId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateTaskStatusRequest(TaskStatus.IN_PROGRESS, null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mockMvc.perform(delete("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks/" + taskId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void rbac_forbiddenForNonMember() throws Exception {
        String ownerToken = registerAndLogin("owner@agiletrack.com", "password123");
        String workspaceId = createWorkspace(ownerToken, "Delta Corp", "Security");
        createProject(ownerToken, workspaceId, "Platform", "Core");

        String attackerToken = registerAndLogin("attacker@agiletrack.com", "password123");

        mockMvc.perform(get("/api/v1/workspaces/" + workspaceId + "/projects")
                        .header("Authorization", "Bearer " + attackerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void executeFullTaskLifecycleAndEnforceRbac() throws Exception {

        // 1. Register and Login User A (OWNER)
        String userAToken = registerAndLogin("owner@agiletrack.com", "password123");

        // 2. Create Workspace
        CreateWorkspaceRequest wsReq = new CreateWorkspaceRequest("Alpha Corp", "Engineering");
        String wsResponse = mockMvc.perform(post("/api/v1/workspaces")
                        .header("Authorization", "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wsReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String workspaceId = extractJsonField(wsResponse, "id");
        String ownerId = extractJsonField(wsResponse, "ownerId");

        // 3. Create Project
        CreateProjectRequest projReq = new CreateProjectRequest("Backend API", "Sprint 1");
        String projResponse = mockMvc.perform(post("/api/v1/workspaces/" + workspaceId + "/projects")
                        .header("Authorization", "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String projectId = extractJsonField(projResponse, "id");

        // 4. Create Task
        CreateTaskRequest taskReq = new CreateTaskRequest(
                "Setup Testing",
                "Implement full integration suite",
                TaskPriority.HIGH,
                LocalDateTime.now().plusDays(2),
                UUID.fromString(ownerId)
        );

        mockMvc.perform(post("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Setup Testing"))
                .andExpect(jsonPath("$.status").value("TODO"));

        // 5. Cross-Boundary RBAC Verification (Register User B -> Access User A's Data)
        String userBToken = registerAndLogin("attacker@agiletrack.com", "password123");

        mockMvc.perform(get("/api/v1/workspaces/" + workspaceId + "/projects")
                        .header("Authorization", "Bearer " + userBToken))
                .andExpect(status().isForbidden());
    }

    private String registerAndLogin(String email, String password) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RegisterRequest(email, password))))
                .andExpect(status().isCreated());

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();

        return extractJsonField(result.getResponse().getContentAsString(), "token");
    }

        private String createWorkspace(String token, String name, String description) throws Exception {
                MvcResult result = mockMvc.perform(post("/api/v1/workspaces")
                                                .header("Authorization", "Bearer " + token)
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(objectMapper.writeValueAsString(new CreateWorkspaceRequest(name, description))))
                                .andExpect(status().isCreated())
                                .andReturn();

                return extractJsonField(result.getResponse().getContentAsString(), "id");
        }

        private MvcResult getWorkspace(String token, String workspaceId) throws Exception {
                return mockMvc.perform(get("/api/v1/workspaces/" + workspaceId)
                                                .header("Authorization", "Bearer " + token))
                                .andExpect(status().isOk())
                                .andReturn();
        }

        private String createProject(String token, String workspaceId, String name, String description) throws Exception {
                MvcResult result = mockMvc.perform(post("/api/v1/workspaces/" + workspaceId + "/projects")
                                                .header("Authorization", "Bearer " + token)
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(objectMapper.writeValueAsString(new CreateProjectRequest(name, description))))
                                .andExpect(status().isCreated())
                                .andReturn();

                return extractJsonField(result.getResponse().getContentAsString(), "id");
        }

        private String createTask(String token, String workspaceId, String projectId, String ownerId, String title) throws Exception {
                MvcResult result = mockMvc.perform(post("/api/v1/workspaces/" + workspaceId + "/projects/" + projectId + "/tasks")
                                                .header("Authorization", "Bearer " + token)
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(objectMapper.writeValueAsString(new CreateTaskRequest(
                                                                title,
                                                                "Implement end-to-end suite",
                                                                TaskPriority.HIGH,
                                                                LocalDateTime.now().plusDays(2),
                                                                UUID.fromString(ownerId)
                                                ))))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.title").value(title))
                                .andReturn();

                return extractJsonField(result.getResponse().getContentAsString(), "id");
        }

    private String extractJsonField(String json, String field) throws Exception {
        return objectMapper.readTree(json).get(field).asText();
    }
}

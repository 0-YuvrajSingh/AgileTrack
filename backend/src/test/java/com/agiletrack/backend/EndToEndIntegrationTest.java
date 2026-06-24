package com.agiletrack.backend;

import com.agiletrack.backend.auth.dto.LoginRequest;
import com.agiletrack.backend.auth.dto.RegisterRequest;
import com.agiletrack.backend.project.dto.CreateProjectRequest;
import com.agiletrack.backend.task.dto.CreateTaskRequest;
import com.agiletrack.backend.task.entity.TaskPriority;
import com.agiletrack.backend.workspace.dto.CreateWorkspaceRequest;
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
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();

        return extractJsonField(result.getResponse().getContentAsString(), "token");
    }

    private String extractJsonField(String json, String field) throws Exception {
        return objectMapper.readTree(json).get(field).asText();
    }
}
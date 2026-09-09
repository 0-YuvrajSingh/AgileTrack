package com.agiletrack.backend.workspace;

import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.security.JwtService;
import com.agiletrack.backend.task.repository.TaskRepository;
import com.agiletrack.backend.project.repository.ProjectRepository;
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

/**
 * Verifies workspace membership management RBAC.
 *
 * Role-privilege matrix under test:
 *
 *  Operation                | MEMBER | ADMIN | OWNER
 *  Invite member            |   403  |  200  |  200
 *  Remove member            |   403  |  204  |  204
 *  Delete workspace         |   403  |  403  |  204
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")

@DisplayName("Workspace RBAC — member management")
class WorkspaceAuthorizationIntegrationTest extends com.agiletrack.backend.AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;

    private String ownerToken;
    private String adminToken;
    private String memberToken;
    private UUID workspaceId;
    private UUID memberMembershipId;   // workspace_members.id for the MEMBER row
    private UUID uninvitedUserId;      // a user who is NOT yet a workspace member

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = userRepository.save(User.builder()
                .email("owner@test.com").password("pw").role(Role.USER).build());

        User admin = userRepository.save(User.builder()
                .email("admin@test.com").password("pw").role(Role.USER).build());

        User member = userRepository.save(User.builder()
                .email("member@test.com").password("pw").role(Role.USER).build());

        User uninvited = userRepository.save(User.builder()
                .email("uninvited@test.com").password("pw").role(Role.USER).build());
        uninvitedUserId = uninvited.getId();

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Test Workspace")
                .description("Auth test workspace")
                .owner(owner)
                .build());
        workspaceId = workspace.getId();

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(owner).role(WorkspaceRole.OWNER).build());
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(admin).role(WorkspaceRole.ADMIN).build());

        WorkspaceMember memberRow = workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(member).role(WorkspaceRole.MEMBER).build());
        memberMembershipId = memberRow.getId();

        ownerToken  = jwtService.generateToken(new CustomUserDetails(owner));
        adminToken  = jwtService.generateToken(new CustomUserDetails(admin));
        memberToken = jwtService.generateToken(new CustomUserDetails(member));
    }

    // ── Invite member ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("MEMBER → POST /members → 403")
    void member_inviteMember_isForbidden() throws Exception {
        mockMvc.perform(post(membersUrl())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inviteJson("uninvited@test.com", "MEMBER")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN → POST /members → 200 (invite succeeds)")
    void admin_inviteMember_isAllowed() throws Exception {
        mockMvc.perform(post(membersUrl())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inviteJson("uninvited@test.com", "MEMBER")))
                .andExpect(status().isOk());
    }

    // ── Remove member ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("MEMBER → DELETE /members/{id} → 403")
    void member_removeMember_isForbidden() throws Exception {
        mockMvc.perform(delete(memberUrl(memberMembershipId))
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN → DELETE /members/{id} → 204 (remove succeeds)")
    void admin_removeMember_isAllowed() throws Exception {
        mockMvc.perform(delete(memberUrl(memberMembershipId))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    // ── Delete workspace ──────────────────────────────────────────────────────

    @Test
    @DisplayName("ADMIN (non-owner) → DELETE /workspaces/{id} → 403")
    void admin_deleteWorkspace_isForbidden() throws Exception {
        mockMvc.perform(delete(workspaceUrl())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("OWNER → DELETE /workspaces/{id} → 204")
    void owner_deleteWorkspace_isAllowed() throws Exception {
        mockMvc.perform(delete(workspaceUrl())
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());
    }

    // ── URL and payload helpers ───────────────────────────────────────────────

    private String workspaceUrl() {
        return "/api/v1/workspaces/" + workspaceId;
    }

    private String membersUrl() {
        return workspaceUrl() + "/members";
    }

    private String memberUrl(UUID membershipId) {
        return membersUrl() + "/" + membershipId;
    }

    private String inviteJson(String email, String role) {
        return """
                {
                  "email": "%s",
                  "role": "%s"
                }
                """.formatted(email, role);
    }
}


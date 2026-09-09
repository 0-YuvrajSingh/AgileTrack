package com.agiletrack.backend;

import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.user.entity.Role;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import com.agiletrack.backend.workspace.entity.Workspace;
import com.agiletrack.backend.workspace.entity.WorkspaceMember;
import com.agiletrack.backend.workspace.entity.WorkspaceRole;
import com.agiletrack.backend.workspace.repository.WorkspaceMemberRepository;
import com.agiletrack.backend.workspace.repository.WorkspaceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
public class DatabaseCascadeIntegrationTest extends AbstractIntegrationTest {

    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    @Transactional
    public void deletingWorkspace_cascadesToChildren_atDatabaseLevel() {
        // Given
        User owner = new User();
        owner.setEmail("cascade@agiletrack.com");
        owner.setPassword("pass");
        owner.setRole(Role.USER);
        owner = userRepository.saveAndFlush(owner);

        Workspace workspace = Workspace.builder().name("Cascade WS").owner(owner).build();
        workspace = workspaceRepository.save(workspace);

        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(owner)
                .role(WorkspaceRole.OWNER)
                .build();
        workspaceMemberRepository.save(member);

        Project project = Project.builder()
                .name("Cascade Project")
                .description("To be cascaded")
                .workspace(workspace)
                .status(ProjectStatus.ACTIVE)
                .build();
        projectRepository.save(project);

        // Force flush so that inserts are sent to the database
        workspaceRepository.flush();

        // Verify records exist in DB
        Integer membersCountBefore = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?", Integer.class, workspace.getId());
        assertThat(membersCountBefore).isEqualTo(1);

        Integer projectsCountBefore = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM projects WHERE workspace_id = ?", Integer.class, workspace.getId());
        assertThat(projectsCountBefore).isEqualTo(1);

        // When - executing raw SQL delete on the workspace to trigger DB-level cascade
        jdbcTemplate.update("DELETE FROM workspaces WHERE id = ?", workspace.getId());

        // Then - verify DB-level ON DELETE CASCADE worked
        Integer membersCountAfter = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?", Integer.class, workspace.getId());
        assertThat(membersCountAfter).isEqualTo(0);

        Integer projectsCountAfter = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM projects WHERE workspace_id = ?", Integer.class, workspace.getId());
        assertThat(projectsCountAfter).isEqualTo(0);
    }
}

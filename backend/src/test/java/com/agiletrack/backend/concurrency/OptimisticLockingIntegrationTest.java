package com.agiletrack.backend.concurrency;

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
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Frozen business rule #10 — a stale write fails with 409 rather than silently overwriting
 * newer state.
 *
 * <p>{@code Task} and {@code Project} carry a JPA {@code @Version}. This pins both halves of the
 * contract: Hibernate raises the conflict, and {@code GlobalExceptionHandler} maps it to 409
 * rather than letting it fall through to the catch-all 500.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Optimistic locking - stale writes are rejected with 409")
class OptimisticLockingIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired WorkspaceRepository workspaceRepository;
    @Autowired WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired TransactionTemplate transactionTemplate;
    @Autowired EntityManager entityManager;
    @Autowired JdbcTemplate jdbcTemplate;

    private UUID taskId;
    private UUID projectId;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        User owner = userRepository.save(User.builder()
                .email("lock-owner@test.com").password("pw").role(Role.USER).build());

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Lock WS").owner(owner).build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace).user(owner).role(WorkspaceRole.OWNER).build());

        Project project = projectRepository.save(Project.builder()
                .name("Lock Project").status(ProjectStatus.ACTIVE).workspace(workspace).build());
        projectId = project.getId();

        taskId = taskRepository.save(Task.builder()
                .title("Contended item")
                .status(TaskStatus.TODO)
                .type(WorkItemType.FEATURE)
                .priority(TaskPriority.MEDIUM)
                .position(1.0)
                .project(project)
                .assignee(owner)
                .build()).getId();

        jwtService.generateToken(new CustomUserDetails(owner));
    }

    @Test
    @DisplayName("A task write against a superseded version raises an optimistic lock failure")
    void staleTaskWrite_failsInsteadOfOverwriting() {
        // Reader A loads the row at its current version.
        Task stale = transactionTemplate.execute(status -> {
            Task t = taskRepository.findById(taskId).orElseThrow();
            entityManager.detach(t);
            return t;
        });
        Long versionSeenByA = stale.getVersion();

        // Writer B commits first, bumping the version.
        transactionTemplate.executeWithoutResult(status -> {
            Task t = taskRepository.findById(taskId).orElseThrow();
            t.setTitle("Written by B");
        });

        // A now writes back what it read. Hibernate must refuse it.
        stale.setTitle("Written by A");
        assertThatThrownBy(() ->
                transactionTemplate.executeWithoutResult(status -> taskRepository.save(stale)))
                .isInstanceOf(org.springframework.dao.OptimisticLockingFailureException.class);

        // B's write survives; A's is not applied.
        Task current = taskRepository.findById(taskId).orElseThrow();
        assertThat(current.getTitle()).isEqualTo("Written by B");
        assertThat(current.getVersion()).isGreaterThan(versionSeenByA);
    }

    @Test
    @DisplayName("A project write against a superseded version is rejected the same way")
    void staleProjectWrite_failsInsteadOfOverwriting() {
        Project stale = transactionTemplate.execute(status -> {
            Project p = projectRepository.findById(projectId).orElseThrow();
            entityManager.detach(p);
            return p;
        });

        transactionTemplate.executeWithoutResult(status -> {
            Project p = projectRepository.findById(projectId).orElseThrow();
            p.setName("Renamed by B");
        });

        stale.setName("Renamed by A");
        assertThatThrownBy(() ->
                transactionTemplate.executeWithoutResult(status -> projectRepository.save(stale)))
                .isInstanceOf(org.springframework.dao.OptimisticLockingFailureException.class);

        assertThat(projectRepository.findById(projectId).orElseThrow().getName())
                .isEqualTo("Renamed by B");
    }

    @Test
    @DisplayName("The version column actually advances on every committed mutation")
    void versionAdvancesOnCommit() {
        Long before = jdbcTemplate.queryForObject(
                "SELECT version FROM tasks WHERE id = ?", Long.class, taskId);

        transactionTemplate.executeWithoutResult(status -> {
            Task t = taskRepository.findById(taskId).orElseThrow();
            t.setTitle("Bumped");
        });

        Long after = jdbcTemplate.queryForObject(
                "SELECT version FROM tasks WHERE id = ?", Long.class, taskId);

        assertThat(after).isGreaterThan(before);
    }
}

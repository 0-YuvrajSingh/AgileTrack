package com.agiletrack.backend.seed;

import com.agiletrack.backend.dependency.entity.DependencyType;
import com.agiletrack.backend.dependency.entity.WorkItemDependency;
import com.agiletrack.backend.dependency.repository.WorkItemDependencyRepository;
import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.release.entity.Release;
import com.agiletrack.backend.release.entity.ReleaseLifecycleState;
import com.agiletrack.backend.release.repository.ReleaseRepository;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.RiskLevel;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Builds a demo dataset that exercises the delivery model, not just the task board.
 *
 * <p>The releases below are shaped so that a fresh database already shows every readiness verdict
 * the service can produce — READY, and NOT_READY for each of the four reason codes that are
 * currently emitted. Without that, the core feature is invisible until someone clicks it into
 * existence by hand.
 *
 * <p>Rows are written straight through the repositories rather than through the services. That is
 * deliberate: seeding is a fixture, not a user action. It means seeded rows carry no activity
 * history — history records what people did, and nobody did this. It also means a seeded release
 * can hold work items in a state the API would no longer allow you to reach (the cancelled release
 * below), which is exactly how such a release looks in real life: its scope was set while it was
 * still PLANNED.
 */
@Component
@ConditionalOnProperty(name = "agiletrack.seed-demo-data", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ReleaseRepository releaseRepository;
    private final WorkItemDependencyRepository dependencyRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded, skipping.");
            return;
        }

        log.info("Seeding demo data...");

        User demoUser = userRepository.save(User.builder()
                .email("demo@agiletrack.com")
                .password(passwordEncoder.encode("Demo@12345"))
                .role(Role.USER)
                .build());

        User teammate = userRepository.save(User.builder()
                .email("alice@agiletrack.com")
                .password(passwordEncoder.encode("Alice@12345"))
                .role(Role.USER)
                .build());

        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Acme Corp")
                .description("Main workspace for product development")
                .owner(demoUser)
                .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace)
                .user(demoUser)
                .role(WorkspaceRole.OWNER)
                .build());

        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace)
                .user(teammate)
                .role(WorkspaceRole.MEMBER)
                .build());

        Project frontendProject = projectRepository.save(Project.builder()
                .name("Frontend Redesign")
                .description("React migration and UI overhaul")
                .workspace(workspace)
                .status(ProjectStatus.ACTIVE)
                .build());

        Project backendProject = projectRepository.save(Project.builder()
                .name("API v2")
                .description("REST API improvements and new endpoints")
                .workspace(workspace)
                .status(ProjectStatus.PLANNING)
                .build());

        seedFrontendDelivery(frontendProject, demoUser, teammate);
        seedBackendDelivery(backendProject, demoUser, teammate);

        log.info("Demo data seeded: 2 users, 1 workspace, 2 projects, {} work items, "
                        + "{} releases, {} dependencies",
                taskRepository.count(), releaseRepository.count(), dependencyRepository.count());
    }

    /**
     * Frontend Redesign covers the two ends of the readiness spectrum: a release where every gate
     * passes, and a cancelled one that can never pass.
     */
    private void seedFrontendDelivery(Project project, User demoUser, User teammate) {
        // READY — in flight, everything complete, scope already locked by IN_PROGRESS.
        Release designSystem = release(project, "Design System Baseline", "v2.0.0",
                ReleaseLifecycleState.IN_PROGRESS, LocalDate.now().plusDays(3));

        // NOT_READY — incomplete work, one item held up by an unresolved blocker.
        Release uiRefresh = release(project, "Q3 UI Refresh", "v2.1.0",
                ReleaseLifecycleState.PLANNED, LocalDate.now().plusDays(21));

        // NOT_READY — cancelled, and still holding an unfinished item.
        Release mobileShell = release(project, "Native Mobile Shell", "v3.0.0",
                ReleaseLifecycleState.CANCELLED, null);

        task(project, "Set up Vite and Tailwind config", "Initialize the new build pipeline",
                WorkItemType.TECH_DEBT, TaskStatus.DONE, TaskPriority.HIGH, 1.0, demoUser, designSystem);
        task(project, "Ship design tokens package", "Colour, spacing and type scales as a shared package",
                WorkItemType.FEATURE, TaskStatus.DONE, TaskPriority.MEDIUM, 2.0, teammate, designSystem);
        task(project, "Remove legacy jQuery bundle", "Drop the last pre-React dependency",
                WorkItemType.TECH_DEBT, TaskStatus.DONE, TaskPriority.LOW, 3.0, demoUser, designSystem);

        Task componentLibrary = task(project, "Build reusable component library",
                "Buttons, inputs, cards, modals",
                WorkItemType.FEATURE, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, 4.0, demoUser, uiRefresh);
        task(project, "Implement authentication pages", "Login, register, forgot password",
                WorkItemType.FEATURE, TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, 5.0, teammate, uiRefresh);
        // Seeded at IN_REVIEW on purpose. Only IN_REVIEW -> DONE is a legal transition, so this is
        // the one state from which an attempt to complete the item reaches the blocked-completion
        // guard rather than being turned away earlier by the status state machine.
        Task taskBoard = task(project, "Drag-and-drop task board", "Kanban-style task management view",
                WorkItemType.FEATURE, TaskStatus.IN_REVIEW, TaskPriority.HIGH, 6.0, demoUser, uiRefresh);

        task(project, "Responsive mobile layout", "Ensure all pages work on mobile",
                WorkItemType.BUG, TaskStatus.TODO, TaskPriority.LOW, 7.0, teammate, mobileShell);

        // The board cannot be built on components that do not exist yet. This single edge is why
        // "Drag-and-drop task board" cannot be dragged to DONE, and why Q3 UI Refresh reports
        // BLOCKED_WORK on top of its incomplete items.
        blocks(componentLibrary, taskBoard);
    }

    /**
     * API v2 carries the dependency chain. It is three edges deep so the cycle check has something
     * real to reject, and it includes an empty release for the EMPTY_RELEASE gate.
     */
    private void seedBackendDelivery(Project project, User demoUser, User teammate) {
        Release cutover = release(project, "API v2.0 Cutover", "v2.0.0",
                ReleaseLifecycleState.PLANNED, LocalDate.now().plusDays(35));

        // NOT_READY for the one reason that has nothing to do with the work: there is none.
        release(project, "API v2.1 Planning", "v2.1.0", ReleaseLifecycleState.PLANNED, null);

        Task schema = task(project, "Design database schema v2",
                "New tables for notifications and audit log",
                WorkItemType.CHANGE, TaskStatus.IN_PROGRESS, TaskPriority.URGENT, 1.0, demoUser, cutover);
        Task rateLimiting = task(project, "Add rate limiting middleware",
                "Prevent abuse on public endpoints",
                WorkItemType.CHANGE, TaskStatus.TODO, TaskPriority.MEDIUM, 2.0, demoUser, cutover);
        Task authMigration = task(project, "Migrate auth endpoints to v2",
                "Move token issue and refresh onto the v2 contract",
                WorkItemType.CHANGE, TaskStatus.TODO, TaskPriority.HIGH, 3.0, teammate, cutover);
        Task deprecateV1 = task(project, "Deprecate v1 task endpoints",
                "Remove the old routes once every client has moved",
                WorkItemType.CHANGE, TaskStatus.TODO, TaskPriority.HIGH, 4.0, demoUser, cutover);

        task(project, "Write integration tests", "Cover auth and workspace flows",
                WorkItemType.TECH_DEBT, TaskStatus.TODO, TaskPriority.HIGH, 5.0, teammate, null);

        // schema -> authMigration -> deprecateV1, with rate limiting joining the last step.
        // Adding "deprecateV1 blocks schema" closes the loop, which is the rejection to demo.
        blocks(schema, authMigration);
        blocks(authMigration, deprecateV1);
        blocks(rateLimiting, deprecateV1);
    }

    private Release release(Project project, String name, String releaseVersion,
                            ReleaseLifecycleState state, LocalDate targetDate) {
        return releaseRepository.save(Release.builder()
                .project(project)
                .name(name)
                .releaseVersion(releaseVersion)
                .lifecycleState(state)
                .targetDate(targetDate)
                .build());
    }

    private Task task(Project project, String title, String description,
                      WorkItemType type, TaskStatus status, TaskPriority priority,
                      double position, User assignee, Release release) {
        return task(project, title, description, type,
                type == WorkItemType.CHANGE ? RiskLevel.HIGH : null,
                status, priority, position, assignee, release);
    }

    private Task task(Project project, String title, String description,
                      WorkItemType type, RiskLevel riskLevel, TaskStatus status, TaskPriority priority,
                      double position, User assignee, Release release) {
        return taskRepository.save(Task.builder()
                .project(project)
                .title(title)
                .description(description)
                .status(status)
                .type(type)
                .riskLevel(riskLevel)
                .priority(priority)
                .position(position)
                .assignee(assignee)
                .release(release)
                .deadline(LocalDateTime.now().plusDays(14))
                .build());
    }

    /** Records "blocker blocks blocked", matching the edge direction the service writes. */
    private void blocks(Task blocker, Task blocked) {
        dependencyRepository.save(WorkItemDependency.builder()
                .source(blocker)
                .target(blocked)
                .dependencyType(DependencyType.BLOCKS)
                .build());
    }
}

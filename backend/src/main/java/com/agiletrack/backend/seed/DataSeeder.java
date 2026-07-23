package com.agiletrack.backend.seed;

import com.agiletrack.backend.project.entity.Project;
import com.agiletrack.backend.project.entity.ProjectStatus;
import com.agiletrack.backend.project.repository.ProjectRepository;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.entity.TaskPriority;
import com.agiletrack.backend.task.entity.TaskStatus;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
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

        createTask(frontendProject, "Set up Vite and Tailwind config", "Initialize the new build pipeline", TaskStatus.DONE, TaskPriority.HIGH, 1.0, demoUser);
        createTask(frontendProject, "Build reusable component library", "Buttons, inputs, cards, modals", TaskStatus.IN_PROGRESS, TaskPriority.HIGH, 2.0, demoUser);
        createTask(frontendProject, "Implement authentication pages", "Login, register, forgot password", TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, 3.0, teammate);
        createTask(frontendProject, "Drag-and-drop task board", "Kanban-style task management view", TaskStatus.TODO, TaskPriority.HIGH, 4.0, demoUser);
        createTask(frontendProject, "Responsive mobile layout", "Ensure all pages work on mobile", TaskStatus.TODO, TaskPriority.LOW, 5.0, teammate);

        createTask(backendProject, "Design database schema v2", "New tables for notifications and audit log", TaskStatus.IN_PROGRESS, TaskPriority.URGENT, 1.0, demoUser);
        createTask(backendProject, "Add rate limiting middleware", "Prevent abuse on public endpoints", TaskStatus.TODO, TaskPriority.MEDIUM, 2.0, demoUser);
        createTask(backendProject, "Write integration tests", "Cover auth and workspace flows", TaskStatus.TODO, TaskPriority.HIGH, 3.0, teammate);

        log.info("Demo data seeded: 2 users, 1 workspace, 2 projects, 8 tasks");
        log.info("Demo login email: demo@agiletrack.com (password in README)");
    }

    private void createTask(Project project, String title, String description,
                            TaskStatus status, TaskPriority priority, double position, User assignee) {
        taskRepository.save(Task.builder()
                .project(project)
                .title(title)
                .description(description)
                .status(status)
                .priority(priority)
                .position(position)
                .assignee(assignee)
                .deadline(LocalDateTime.now().plusDays(14))
                .build());
    }
}

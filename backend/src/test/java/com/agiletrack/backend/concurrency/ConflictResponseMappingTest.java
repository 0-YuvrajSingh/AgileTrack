package com.agiletrack.backend.concurrency;

import com.agiletrack.backend.AbstractIntegrationTest;
import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.security.JwtService;
import com.agiletrack.backend.task.entity.Task;
import com.agiletrack.backend.task.service.TaskService;
import com.agiletrack.backend.user.entity.Role;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pins the HTTP half of frozen business rule #10.
 *
 * <p>Before Phase 1 this path was unmapped: {@code ObjectOptimisticLockingFailureException} is a
 * {@code DataAccessException}, so it fell through to the catch-all handler and surfaced as 500.
 * The frontend has always branched on 409, so the two disagreed. This asserts the resolved
 * status code through the real controller advice, not just the handler method in isolation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Optimistic lock failures surface as 409 through the API")
class ConflictResponseMappingTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;

    @MockBean TaskService taskService;

    private String token;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        User user = userRepository.save(User.builder()
                .email("conflict@test.com").password("pw").role(Role.USER).build());
        token = jwtService.generateToken(new CustomUserDetails(user));
    }

    @Test
    @DisplayName("A version conflict raised by the service becomes 409, not 500")
    void optimisticLockFailure_isMappedToConflict() throws Exception {
        UUID workspaceId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();

        when(taskService.getTaskById(ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any()))
                .thenThrow(new ObjectOptimisticLockingFailureException(Task.class, taskId));

        mockMvc.perform(get("/api/v1/workspaces/" + workspaceId
                        + "/projects/" + projectId + "/tasks/" + taskId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }
}

package com.agiletrack.backend;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for tests that need a real PostgreSQL instance.
 *
 * <p>The container is started once per JVM and shared by every integration test class, so the
 * suite does not depend on a PostgreSQL happening to run on the developer's machine. Flyway still
 * owns the schema and Hibernate still only validates it, exactly as in production.
 */
public abstract class AbstractIntegrationTest {

    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("agiletrack_test")
                    .withUsername("testuser")
                    .withPassword("testpassword");

    static {
        // Deliberately never stopped: Testcontainers' Ryuk reaper removes it when the JVM exits,
        // and reusing one container across classes keeps the suite fast.
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}

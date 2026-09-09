package com.agiletrack.backend.benchmark;

import com.agiletrack.backend.AbstractIntegrationTest;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

@SpringBootTest
@ActiveProfiles("test")
// Not a test: it prints EXPLAIN ANALYZE output for ~1.1M generated rows and leaves them
// behind, which would wreck any test sharing the database. Excluded from the default
// surefire run; execute it deliberately with: ./mvnw test -Dgroups=benchmark
@Tag("benchmark")
public class PerformanceBenchmarkTest extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    public void runBenchmark() {
        System.out.println("=================================================");
        System.out.println("RUNNING PERFORMANCE BENCHMARK");
        System.out.println("=================================================");

        UUID workspaceId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        
        // 1. Insert Workspace and User
        String randomEmail = UUID.randomUUID().toString() + "@example.com";
        jdbcTemplate.update("INSERT INTO users (id, email, password, role) VALUES (?, ?, 'hash', 'USER')", ownerId, randomEmail);
        jdbcTemplate.update("INSERT INTO workspaces (id, name, owner_id) VALUES (?, 'Bench Workspace', ?)", workspaceId, ownerId);
        
        // 2. Define scale factors
        int[] rowCounts = {1000, 10000, 100000, 1000000};
        
        for (int rows : rowCounts) {
            System.out.println("\n\n--- BENCHMARK FOR " + rows + " TASKS ---");
            
            UUID projectId = UUID.randomUUID();
            jdbcTemplate.update("INSERT INTO projects (id, workspace_id, name, status, version) VALUES (?, ?, 'Project ' || ?, 'ACTIVE', 0)", projectId, workspaceId, rows);
            
            // Insert data
            // We use generate_series to quickly insert thousands of rows
            // 5% of tasks will contain the word "urgentbug"
            System.out.println("Generating data...");
            String insertTasks = """
                INSERT INTO tasks (id, project_id, title, description, status, priority, version)
                SELECT 
                    gen_random_uuid(),
                    ?,
                    CASE 
                        WHEN random() < 0.05 THEN 'Fix urgentbug in module ' || i 
                        ELSE 'Standard task ' || i 
                    END,
                    'Description ' || i,
                    'TODO',
                    'MEDIUM',
                    0
                FROM generate_series(1, ?) i
            """;
            
            long startInsert = System.currentTimeMillis();
            jdbcTemplate.update(insertTasks, projectId, rows);
            System.out.println("Data generated in " + (System.currentTimeMillis() - startInsert) + "ms");
            
            // Analyze the table so Postgres planner has accurate stats
            jdbcTemplate.execute("ANALYZE tasks");

            // Query 1: Task Search ILIKE (no pg_trgm yet)
            String searchExplain = "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM tasks WHERE project_id = '" + projectId + "' AND title ILIKE '%urgentbug%'";
            System.out.println("\nQuery: ILIKE Task Search");
            List<String> searchExplainResult = jdbcTemplate.queryForList(searchExplain, String.class);
            searchExplainResult.forEach(System.out::println);

            // Generate task activities for a specific task
            UUID targetTaskId = jdbcTemplate.queryForObject("SELECT id FROM tasks WHERE project_id = ? LIMIT 1", UUID.class, projectId);
            
            String insertActivities = """
                INSERT INTO task_activities (id, task_id, user_id, activity_type, details, created_at)
                SELECT 
                    gen_random_uuid(),
                    ?,
                    ?,
                    'COMMENTED',
                    'Activity ' || i,
                    now() - (i || ' minutes')::interval
                FROM generate_series(1, 50) i
            """;
            jdbcTemplate.update(insertActivities, targetTaskId, ownerId);
            
            jdbcTemplate.execute("ANALYZE task_activities");
            
            // Query 2: Task Activity Search
            String activityExplain = "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM task_activities WHERE task_id = '" + targetTaskId + "' ORDER BY created_at DESC";
            System.out.println("\nQuery: Task Activities Ordered");
            List<String> activityExplainResult = jdbcTemplate.queryForList(activityExplain, String.class);
            activityExplainResult.forEach(System.out::println);
        }
        
        System.out.println("=================================================");
    }
}

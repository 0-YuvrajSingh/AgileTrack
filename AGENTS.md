# AGENTS.md

## 1. Project Summary
AgileTrack is a focused engineering delivery platform that enables software teams to plan work, group work items into versioned releases, enforce dependency constraints with cycle detection, and evaluate real-time release readiness verdicts. Rather than serving as a sprawling governance tool, its primary technical identity centers on domain logic, dependency graphs, and purely derived release state.

## 2. Tech Stack
- **Backend**: Java 21, Spring Boot 3.3.5, Spring Data JPA, Hibernate 6.5, Spring Security, Flyway 10, JJWT, PostgreSQL 16 (via Testcontainers in tests)
- **Frontend**: TypeScript (~6.0), React 19, Vite 8, Tailwind CSS 3.4, React Router 7, Vitest 5, Axios, Lucide React
- **Infrastructure**: Docker, Docker Compose, Maven Wrapper (mvnw)

## 3. How to Run, Build, and Test (Verified)

Every command listed below has been verified against the current repository state:

### Backend Build & Test
```bash
# Compile backend without running tests
docker run --rm -v agiletrack-m2:/root/.m2 -v "$PWD/backend:/app" -w /app maven:3.9-eclipse-temurin-21 mvn -DskipTests compile

# Run full backend test suite (Testcontainers PostgreSQL 16)
docker run --rm -v agiletrack-m2:/root/.m2 -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal -v "$PWD/backend:/app" -w /app maven:3.9-eclipse-temurin-21 mvn test

# Run a single backend test class
docker run --rm -v agiletrack-m2:/root/.m2 -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal -v "$PWD/backend:/app" -w /app maven:3.9-eclipse-temurin-21 mvn test -Dtest=ReleaseIntegrationTest
```
*Note: If Java 21 is installed directly on the host machine, you can run `./mvnw test` inside `backend/`.*

### Frontend Build & Test
```bash
# Install frontend dependencies
docker run --rm -v "$PWD/frontend:/app" -w /app node:24-alpine npm ci

# Run frontend tests
docker run --rm -v "$PWD/frontend:/app" -w /app node:24-alpine npm run test:ci

# Build frontend production bundle
docker run --rm -v "$PWD/frontend:/app" -w /app node:24-alpine npm run build
```
*Note: If Node 24+ is installed directly on the host machine, you can run `npm run test:ci` inside `frontend/`.*

### Running the Full Application
```bash
docker-compose up --build
```
Default UI runs on `http://localhost:5173`, backend API on `http://localhost:8080`.

## 4. Repository Folder Map
```
AgileTrack/
├── .github/workflows/          # GitHub Actions CI workflow (JDK 21, Node 24, Postgres)
├── backend/
│   ├── src/main/java/com/agiletrack/backend/
│   │   ├── auth/               # Authentication endpoints, JWT token filters & services
│   │   ├── common/             # Global exception handlers, DTOs, optimistic locking guards
│   │   ├── dependency/         # Work item dependency entities, cycle detection DFS service
│   │   ├── project/            # Projects domain logic and controllers
│   │   ├── readiness/          # Derived release readiness gate calculation engine
│   │   ├── release/            # Release lifecycle, scope lock, release services & controllers
│   │   ├── task/               # Work items / tasks domain, status transition state machine
│   │   ├── tenant/             # Multi-tenancy isolation and ownership validation
│   │   ├── user/               # User entities, repositories, UserDetailsService
│   │   └── workspace/          # Workspace grouping and membership management
│   ├── src/main/resources/
│   │   ├── application.yaml    # Application properties and JPA configuration
│   │   └── db/migration/       # Flyway database migrations (V1 .. V15)
│   └── src/test/java/          # Unit and Testcontainers-backed integration tests
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI widgets (ReadinessPanel, DependencyPanel, etc.)
│   │   ├── context/            # Authentication and UI state contexts
│   │   ├── hooks/              # Custom React data-fetching hooks (useReleases, useTasks)
│   │   ├── pages/              # Primary view pages (TaskBoard, ReleaseDetail, Dashboard)
│   │   ├── services/           # Axios HTTP client wrappers
│   │   └── types/              # TypeScript interface definitions
│   └── tests/                  # Vitest unit and component tests
├── docs/                       # Project documentation, scope specifications, audit reports
├── AGENTS.md                   # Agent developer guide (this file)
└── DECISIONS.md                # Architecture and scope decision log
```

## 5. Code Conventions Seen in Repository
- **Package by Feature**: Backend is partitioned by domain concept (`release`, `dependency`, `readiness`, `task`, `project`, `workspace`).
- **Authorization Enforcement**: Security is strictly enforced in the service layer against parent entities (User -> Workspace -> Project -> Work Item), never by checking UUID presence or relying on UI guards.
- **Derived State**: Computed values (such as release readiness verdicts) are never persisted in the database; they are computed on demand in transactional query services.
- **Optimistic Locking**: Mutation endpoints require or check `@Version` to prevent concurrent write collisions (returning HTTP 409 Conflict).
- **Explicit Domain Constraints**: Business rules throw custom exceptions (e.g., `BusinessRuleException`) which map to 400 Bad Request or 409 Conflict via `GlobalExceptionHandler`.
- **Clean Architecture Principles**: DTOs decouple web requests/responses from JPA persistence entities; mappers are utilized for conversion.

## 6. Hard Rules
1. **Verify before change**: Read code, tests, migrations, and README first. Never assume documentation is accurate.
2. **No new features**: Only: (a) remove what the scope cuts, (b) fix mismatches between docs and code, (c) implement behaviour explicitly accepted in DECISIONS.md.
3. **Architecture preservation**: Do not redesign the architecture or the wider authorization system.
4. **Flyway immutability**: Never edit an existing Flyway migration. Add new ones. Ask before any destructive migration.
5. **Git integrity**: Do not rewrite or squash git history, and do not fake dates or authorship. Work on branch `scope-v1` with small commits and clear messages.
6. **Test preservation**: Delete a test only if it covers a removed feature, and list every deleted test with the reason. Tests for in-scope behaviour must keep passing.
7. **Zero bloat & security**: No new dependencies, no secrets in the repo, no real personal data.
8. **Factual documentation**: Docs must be plain and factual: no marketing language and no claim the code or tests do not back. If you cannot verify something, write "unverified".
9. **Conservative ambiguity handling**: If something is unclear or risky, stop and ask ONE question instead of guessing.

## 7. Definition of Done per Phase
Every phase must satisfy:
1. **Explicit Goal**: Restate the goal and list the exact files to be modified/deleted before applying changes.
2. **Atomic Commits**: Changes committed with descriptive, factual messages on branch `scope-v1`.
3. **Green Test Suite**: Full test suite executed with zero regressions. All non-cut tests continue to pass.
4. **Documentation Synchronization**: `docs/PLAN.md`, `DECISIONS.md`, and `docs/AUDIT.md` updated to reflect the phase's changes.
5. **Walkthrough Section Added**: Add a section to `docs/WALKTHROUGH.md` explaining what it does, why, how, and the exact test proving it.
6. **Review Summary**: Report what changed, test verification results, any unverified items, and 3 interview questions defending the phase's technical decisions.
7. **Stop and Wait**: Cease execution and await explicit user approval before proceeding to the subsequent phase.

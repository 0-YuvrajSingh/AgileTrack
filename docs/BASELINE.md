# Phase 0 — Baseline Freeze

Recorded before any domain change toward the engineering-delivery specialization.
Tag: `phase-0-baseline`. Work branch: `feature/engineering-delivery`.

## Recorded counts

| Metric | Value |
| --- | --- |
| Flyway migrations | 11 (`V1` … `V11`) |
| Backend tests (default `./mvnw test`) | 78, all passing |
| Frontend tests (`npx vitest run`) | 10, all passing |
| **Total** | **88 passing** |
| Backend build | `./mvnw -DskipTests compile` — green |
| Frontend build | `npm run build` (`tsc -b && vite build`) — green |

The 78/10/88 figures match the counts documented in the product plan.

## Environment fixes required to reproduce the baseline

The baseline was **not reproducible as received** on this machine. None of these
touch domain code, business rules, or the API; they only make the existing suite
runnable and deterministic.

1. **Lombok 1.18.34 → 1.18.48** (`pom.xml`). The Spring Boot 3.3.5 parent pins a Lombok
   whose annotation processor crashes on JDK 24+ (`ExceptionInInitializerError:
   com.sun.tools.javac.code.TypeTag :: UNKNOWN`). Only JDK 26 is installed here.
2. **Mockito → 5.23.0, ByteBuddy → 1.18.13** (`pom.xml`). Same cause: the parent's
   versions cannot instrument classes on JDK 26 (`Mockito cannot mock this class`),
   which failed every unit test.
3. **Testcontainers 1.20.1 → 1.21.4** (`pom.xml`). Docker Engine 29 rejects Docker API
   versions below 1.44; the bundled docker-java returned `Status 400` for every
   connection attempt.
4. **Removed a stale `~/.testcontainers.properties`** (machine config, not repo).
   It pinned `docker.client.strategy=NpipeSocketClientProviderStrategy`, i.e. the
   `docker_engine` pipe, while Docker Desktop runs on the `desktop-linux` context.
   A backup was kept; Testcontainers regenerates the file.
5. **Integration tests now own their database** (new `AbstractIntegrationTest`).
   Previously every `@SpringBootTest` fell through to `application.yaml`'s
   `localhost:5432/agiletrack_db` with `postgres/postgres`. On this machine an
   unrelated native PostgreSQL owns port 5432, so all 52 integration tests failed with
   `FATAL: password authentication failed`. The eight integration classes now extend a
   base class that starts one shared `postgres:16-alpine` Testcontainer per JVM and
   supplies the datasource via `@DynamicPropertySource`. Flyway still owns the schema;
   Hibernate still only validates it.
6. **`PerformanceBenchmarkTest` excluded from the default run** (`@Tag("benchmark")` +
   surefire `<excludedGroups>`). It is a measurement harness, not a test: no
   assertions, and it inserts ~1,111,000 tasks it never cleans up. Sharing a database
   with it made a later cascade delete hang the suite indefinitely. Run it
   deliberately with `./mvnw test -Dgroups=benchmark`. Excluding it is what makes the
   collected count 78 rather than 79 — i.e. it restores the documented baseline.

### Dead configuration left in place (not part of the baseline)

`src/test/resources/compose.yaml` and the `spring.docker.compose.*` block in
`application-test.yaml` are inert: the `spring-boot-docker-compose` dependency is not
on the classpath, so those properties were never read. Left untouched under the
"no unrelated refactors" rule; they are superseded by `AbstractIntegrationTest`.

## Current API behaviour (pre-change contract)

All endpoints are under `/api/v1` and require a `Bearer` access token except
`/api/v1/auth/**`. Authorization is enforced service-side by walking the
User → Workspace → Project → Task parent chain; a UUID alone never grants access.

### Auth — `/api/v1/auth`
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/register` | `201`, returns access + refresh token and user |
| POST | `/login` | `200`; bad credentials → `401` |
| POST | `/refresh` | Rotates the refresh token; invalid/expired → `403` |
| POST | `/logout` | Invalidates the stored refresh token |

Refresh tokens are persisted SHA-256 hashed; passwords are BCrypt.

### Workspaces — `/api/v1/workspaces`
| Method | Path | Required role |
| --- | --- | --- |
| POST | `/` | any authenticated user (becomes `OWNER`) |
| GET | `/` | member (lists own memberships) |
| GET | `/{id}` | member |
| PUT | `/{id}` | `ADMIN` or `OWNER` |
| DELETE | `/{id}` | `OWNER` |
| POST | `/{id}/members` | `ADMIN` or `OWNER`; cannot grant `OWNER` |
| GET | `/{id}/members` | member |
| DELETE | `/{id}/members/{memberId}` | `ADMIN` or `OWNER`; cannot remove the owner |

Roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`. `VIEWER` is rejected for every mutation
(`getWorkspaceForMutation`). Non-members get `403`; unknown workspace gets `404`.

### Projects — `/api/v1/workspaces/{workspaceId}/projects`
`POST /`, `GET /` (paged, `?search=`), `GET /{id}`, `PUT /{id}`,
`PATCH /{id}/status`, `DELETE /{id}`.

Status: `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`; new projects start
`PLANNING`. Transitions validated by `Project.canTransitionTo`. **Archived projects
reject every mutation** (`requireMutable`), including mutations to their tasks.

### Tasks — `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks`
`POST /`, `GET /` (paged, `?search=` ILIKE over title/description), `GET /{taskId}`,
`PUT /{taskId}`, `PATCH /{taskId}/status`, `PATCH /{taskId}/position`,
`PUT /{taskId}/assignee`, `DELETE /{taskId}`, `GET /{taskId}/activities`.

- Status: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`; transitions validated by
  `Task.canTransitionTo` (notably `TODO` cannot jump straight to `DONE`, and `DONE`
  may return to `IN_PROGRESS`).
- Priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- An assignee must be a member of the workspace.
- `position` (double) backs Kanban ordering.

### Activity history
`task_activities` is append-only, written by `TaskService.recordActivity` inside the
same `@Transactional` method as the mutation it describes. Types today:
`CREATED`, `ASSIGNED`, `STATUS_CHANGED`, `PRIORITY_CHANGED`, `COMPLETED`.

### Error mapping (`GlobalExceptionHandler`)
| Exception | Status |
| --- | --- |
| `*NotFoundException`, `UsernameNotFoundException` | `404` |
| `AccessDeniedException`, `TokenRefreshException` | `403` |
| `BadCredentials…`, `InternalAuthenticationService…` | `401` |
| `BusinessRuleException`, `IllegalArgumentException`, validation | `400` |
| `EmailAlreadyExistsException`, `IllegalStateException` | `409` |
| anything else | `500` |

## Open finding carried into Phase 1

**Stale writes do not currently return `409`.** `Task` and `Project` carry JPA
`@Version` and the frontend already handles `409` (`TaskBoard.tsx:84`,
`WorkspaceDetail.tsx:106`), but `GlobalExceptionHandler` has no mapping for
`ObjectOptimisticLockingFailureException`. It is a `DataAccessException`, so it falls
through to the catch-all `Exception` handler and returns `500`. No existing test
covers the conflict path.

This contradicts frozen business rule #10 ("stale writes fail with 409, never silently
overwrite"). It is a pre-existing gap, not a regression, and is deliberately **not**
fixed in Phase 0 to keep the baseline commit clean. It is the first item of Phase 1.

# AgileTrack

AgileTrack is an engineering delivery platform. Teams plan work items, group them into versioned releases, record what blocks what, and ask one question the tool answers deterministically:

> **Can this release ship — and if not, exactly why not?**

The answer is derived from committed database state on every request. There is no readiness flag to set, no endpoint that writes one, and no way for the verdict to disagree with the work items it summarises.

Projects belong to workspaces, which serve as multi-project collaboration containers.

---

## The delivery model

```
User -> Workspace -> Project -> Task / Release
Task --BLOCKS--> Task (same project, acyclic)
Release readiness (derived, never stored)
```

```mermaid
erDiagram
    USER ||--o{ WORKSPACE_MEMBER : acts_as
    WORKSPACE ||--o{ WORKSPACE_MEMBER : has
    WORKSPACE ||--o{ PROJECT : contains
    PROJECT ||--o{ TASK : contains
    PROJECT ||--o{ RELEASE : contains
    RELEASE ||--o{ TASK : scopes
    USER ||--o{ TASK : assigned_to
    TASK ||--o{ WORK_ITEM_DEPENDENCY : blocks

    WORKSPACE_MEMBER {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        string role "OWNER, MEMBER"
    }
    PROJECT {
        uuid id PK
        uuid workspace_id FK
        string status
        int version
    }
    RELEASE {
        uuid id PK
        uuid project_id FK
        string name "unique per project"
        string release_version "e.g. v2.1.0"
        string lifecycle_state "PLANNED, IN_PROGRESS, RELEASED"
        date target_date
        int version "optimistic lock counter"
    }
    TASK {
        uuid id PK
        uuid project_id FK
        uuid release_id FK "nullable"
        uuid assignee_id FK "nullable"
        string type "FEATURE, BUG, TECH_DEBT"
        string status "TODO, IN_PROGRESS, IN_REVIEW, DONE"
        double position
        int version
    }
    WORK_ITEM_DEPENDENCY {
        uuid id PK
        uuid source_work_item_id FK "the blocker"
        uuid target_work_item_id FK "the blocked item"
        string dependency_type "BLOCKS"
    }
```

`release_version` is the semantic string a human reads (`v2.1.0`); `version` is the JPA locking counter. They are separate columns for that reason.

**Work items** carry a type — `FEATURE`, `BUG`, `TECH_DEBT` — alongside status, priority, assignee and board position.

**Releases** are a versioned delivery scope inside a project, moving `PLANNED -> IN_PROGRESS -> RELEASED`. A release ships only when readiness evaluates `READY`. Scope freezes when a release leaves `PLANNED`. Both facts are returned as derived `scopeLocked` / `editable` fields so the UI never re-implements the rule.

**Dependencies** are directional `BLOCKS` edges between work items in the same project. The graph is kept acyclic, and an item with an unresolved blocker cannot be moved to `DONE` — by the server, whatever the UI allows.

**Readiness** is a computed verdict with three gates: `EMPTY_RELEASE`, `INCOMPLETE_WORK`, `BLOCKED_WORK`.

```jsonc
GET /api/v1/workspaces/{ws}/projects/{p}/releases/{r}/readiness

{
  "releaseName": "Q3 UI Refresh",
  "lifecycleState": "PLANNED",
  "status": "NOT_READY",
  "totalWorkItems": 3,
  "completedWorkItems": 0,
  "reasons": [
    { "code": "INCOMPLETE_WORK", "workItemTitle": "Build reusable component library",
      "detail": "\"Build reusable component library\" is IN_PROGRESS, not DONE" },
    { "code": "BLOCKED_WORK", "workItemTitle": "Drag-and-drop task board",
      "detail": "\"Drag-and-drop task board\" is blocked by \"Build reusable component library\" (IN_PROGRESS)" }
  ]
}
```

`NOT_READY` always carries at least one reason. Reasons are sorted by code, then title, then id, so identical database state always produces byte-identical output.

---

## Try it in five minutes

`docker-compose up --build`, then sign in as `demo@agiletrack.com` / `Demo@12345`.

The seed data is shaped so both verdicts are already visible:

| Where | Release | Verdict |
|---|---|---|
| Frontend Redesign | **Design System Baseline** (`IN_PROGRESS`) | `READY` — every gate passes, scope locked |
| Frontend Redesign | **Q3 UI Refresh** (`PLANNED`) | `NOT_READY` — `INCOMPLETE_WORK`, `BLOCKED_WORK` |
| API v2 | **API v2.1 Planning** (`PLANNED`) | `NOT_READY` — `EMPTY_RELEASE` |

Five things worth clicking, in order:

1. **Open Q3 UI Refresh.** Read the reasons. Then open *Design System Baseline* and watch the same panel say `READY`.
2. **Try to finish blocked work.** *Drag-and-drop task board* sits in In Review. Drag it to Done. Rejected — the service blocks completion while a blocker is unresolved.
3. **Resolve the blocker.** Move *Build reusable component library* to Done, then reload the release. `BLOCKED_WORK` is gone and the count moved — nothing was recomputed by hand, because nothing was stored.
4. **Try to create a cycle.** In API v2, open *Design database schema v2* and add *Deprecate v1 task endpoints* as a blocker. Rejected, with the path that would have closed the loop.
5. **Force a conflict.** Open one work item in two tabs, change it in both. The second save returns `409` and the UI rolls back rather than overwriting.

---

## Architecture

```mermaid
flowchart TD
    Client[React SPA - Vite / Axios] -->|JWT| Filter[Spring Security Filter Chain]
    Filter --> Controllers[REST Controllers - HTTP + DTO only]
    Controllers --> Services[Service layer - authorization, business rules, transactions]
    Services --> Derived[ReadinessService - derived verdict]
    Services --> Graph[DependencyCycleDetector - bounded BFS]
    Services -->|@Version| Repos[Spring Data JPA]
    Derived --> Repos
    Graph --> Repos
    Repos --> DB[(PostgreSQL - Flyway V1-V20)]
```

A modular monolith, deliberately. The domains are highly relational and every mutation spans the tenant chain, so splitting them would trade transactional integrity for distributed-systems overhead at a scale that does not need it.

**Layer responsibilities**

- **Controller** — HTTP mapping, DTO binding, status codes. No business logic.
- **Service** — authorization, business rules, transaction boundaries. Every rule below lives here.
- **Repository** — data access only.
- **React components** — UI coordination. **Hooks** own server state. **Services** own HTTP. No business rule is re-implemented in the browser; the readiness panel renders the server's verdict rather than deriving its own.

---

## Rules the server enforces

Each of these is covered by a test that fails if the rule is broken. None of them depend on the UI hiding a button.

| Rule | Enforced by | Failure mode |
|---|---|---|
| Mutations only within an authorized workspace → project → resource chain | Every service method, before any write | `404` |
| A UUID is an identifier, never an authorization grant | Parent-scoped lookups (`findByIdAndProjectId`) | `404` |
| A work item cannot reach `DONE` with an unresolved `BLOCKS` dependency | `BlockedCompletionGuard` | `400`, naming the blockers |
| A dependency cycle cannot be created | `DependencyCycleDetector`, inside the write transaction | `400`, naming the path |
| A work item cannot join a release in another project | `ReleaseService`, project-scoped lookup | `404` |
| A release cannot be mutated once its lifecycle forbids it | `ReleaseLifecycleState` guards | `400` |
| `IN_PROGRESS` cannot become `RELEASED` while readiness is `NOT_READY` | `ReleaseService` via `ReadinessService` | `400`, listing reasons |
| Readiness is derived, never user-editable | No write endpoint exists | — |
| Every `NOT_READY` carries explicit reasons | `ReadinessService` | — |
| Stale writes fail rather than overwrite | `@Version` + `OptimisticLockGuard` | `409` |
| Archived projects stay immutable | `ProjectService.requireMutable` | `400` |

Membership: `OWNER` manages workspace settings and members; `MEMBER` creates and edits work items, releases and dependencies. Both are checked in the service layer, so hiding or unhiding a button in React changes nothing.

Cross-tenant reads return `404`, not `403`. A `403` would confirm the resource exists.

---

## Engineering decisions

### Readiness is computed, not stored

A stored readiness flag has to be invalidated by three tables that change independently — work items, dependencies and releases. Every write path would have to remember to recompute it, and the day one path forgets, the platform's headline answer is silently wrong. Deriving it on read makes that class of bug unrepresentable. Nothing is cached, because nothing has been measured that says it needs to be: the evaluation is a bounded number of queries regardless of release size, and the blocked-work gate batches into one.

### Cycle detection rejects on uncertainty

Before an edge is written, a breadth-first search asks whether a path already runs from the proposed target back to the source. It expands a whole frontier per query rather than a node at a time, and the query returns both endpoints of each edge as a projection, so the path used in the rejection message is reconstructed without a second round of lookups.

The search is bounded — depth 100, 10,000 visited nodes — and **hitting either bound throws rather than returning "no cycle found."** An unbounded traversal is a denial-of-service surface; a bounded one that fails open silently corrupts the graph. The bounds are tested against synthetic graphs rather than by inserting a million rows.

The check runs inside the same transaction as the insert, so a concurrent writer cannot slip a conflicting edge between the check and the write.

### Optimistic locking is a contract, not just an annotation

`@Version` on the entity only protects concurrent server transactions. To protect a user who loaded a screen thirty seconds ago, the version has to travel: responses expose it, `PUT` requires it, and the service compares it before touching the row.

`PUT` requires a version because a full replace must be based on a real read. Status transitions honour a version when sent and skip the check when absent, which keeps drag-and-drop workable. Both halves are tested, so the looseness is deliberate and pinned rather than accidental.

The client never retries automatically. A retry would overwrite the other person's explicit intent without asking; a `409` and a reload asks.

### Blocked state is a query, not a field

Whether an item is blocked comes from a separate `/blocked-work-items` endpoint that answers for the whole project in one query, rather than a field on each work item that would cost a lookup per card on every board load.

### Search: `ILIKE` kept, `pg_trgm` rejected — on evidence

`EXPLAIN (ANALYZE, BUFFERS)` over a million generated tasks showed that because every query is anchored by `project_id`, even 10,000 tasks in a single project resolve in roughly 20 ms. A GIN trigram index would penalise every insert and update on a write-heavy board to improve a read latency nobody is waiting on. Deferred on measurement, not on taste.

---

## API surface

All resource routes are nested under the tenant chain — the path *is* the authorization scope.

```
POST   /api/v1/auth/register | login

       /api/v1/workspaces                                      CRUD + /{id}/members
       /api/v1/workspaces/{ws}/projects                        CRUD + /{id}/status

       /api/v1/workspaces/{ws}/projects/{p}/tasks              CRUD
                                          .../{t}/status       PATCH   (blocked-completion guard)
                                          .../{t}/position     PATCH
                                          .../{t}/assignee     PUT
                                          .../{t}/dependencies GET, POST, DELETE /{depId}
       /api/v1/workspaces/{ws}/projects/{p}/blocked-work-items GET

       /api/v1/workspaces/{ws}/projects/{p}/releases           GET, POST
                                       .../{r}                 GET, PUT, DELETE
                                       .../{r}/lifecycle       PATCH
                                       .../{r}/work-items      GET
                                       .../{r}/work-items/{t}  PUT, DELETE
                                       .../{r}/readiness       GET     ← no write verb, by design
```

`GET /tasks` accepts `search` and `type` query parameters, and is paginated.

---

## Testing

**219 tests: 154 backend, 65 frontend.** Backend integration tests run against real PostgreSQL via Testcontainers — H2 would not exercise the Flyway migrations, the check constraints or the dialect behaviour that production actually runs.

Coverage is organised around the rules rather than the classes:

- **Tenant isolation** — every new endpoint is probed with a valid UUID from another tenant, and must answer `404`.
- **Dependencies** — direct, transitive and self cycles rejected; both traversal bounds; blocked completion refused at the service layer even when the request is otherwise valid.
- **Readiness** — each gate in isolation, gates in combination, and reason ordering asserted so the output is reproducible.
- **Concurrency** — genuine stale writes against tasks, projects and releases, asserted as `409` end to end rather than mocked.
- **Frontend** — services, hooks, the Engineering Release Dashboard, and panels that render server verdicts, including that the readiness panel preserves server ordering instead of re-sorting.

```bash
cd backend  && ./mvnw test          # 154 (needs Java 21; or the Docker command in AGENTS.md)
cd frontend && npm run test:ci       # 65 (needs Node 24+)
```

---

## Security

- **Passwords** — BCrypt: salted and deliberately slow, because human-chosen passwords are low-entropy.
- **No refresh tokens** — authentication is register/login plus a stateless JWT access token. There is no silent renewal: when the access token expires, the user re-authenticates with email and password.
- **Access tokens** — validated statelessly on every request. The `prod` profile defaults to a 60-minute lifetime; the default profile defaults to 24 hours. `docker-compose.yml` uses the 60-minute default; **set `JWT_EXPIRATION` explicitly for any real deployment** rather than relying on defaults.
  > *Trade-off*: Without refresh-token rotation, access tokens are stateless and cannot be revoked before expiry. Setting a 60-minute lifetime balances user convenience (avoiding re-login interruptions during active delivery planning) against bounded exposure in the event of token interception.
- **Authorization** — enforced in the service layer against the parent chain, never by the presence of a UUID and never by the UI.
- **SQL injection** — parameterized throughout via Spring Data JPA.
- **CORS** — production reads a single permitted origin from `FRONTEND_ORIGIN`; no hardcoded localhost fallbacks in the prod profile.

**Known exposure, stated plainly:** tokens are held in browser storage. **Browser storage is not XSS-safe.** Any script that executes in the page can read them, and nothing in this codebase changes that. Moving to `HttpOnly; Secure` cookies with CSRF protection is a real hardening path and is **not** implemented — nothing here should be read as claiming cookie-level protection.

---

## What is not built

Stated explicitly so nothing above is read as more than it is.

- **Change governance and approvals.** No `CHANGE` type, risk levels, approval workflows, or approval gates. Cut to eliminate overlap with the system that owns access control.
- **Cancelled releases.** No `CANCELLED` state; the lifecycle is `PLANNED -> IN_PROGRESS -> RELEASED`.
- **Activity and audit trails.** No task history endpoint; mutations change domain state only.
- **Refresh-token rotation.** No `/refresh` or `/logout`; expired access tokens mean re-login.
- **Roles beyond Owner and Member.** No admin/viewer split.
- **Incident semantics.** No incident type, severity or MTTR tracking.
- **Release editing in the UI.** The API supports renaming a release and changing its target date; the UI currently exposes create, lifecycle transitions and scope only.
- **Dependency types beyond `BLOCKS`.** `RELATES_TO` and friends would be edges that do not gate anything, and nothing currently needs them.
- **Real-time updates, background jobs, caching, search infrastructure.** No WebSockets, no Redis, no message broker, no Elasticsearch. Each would be added against a measurement, not in advance of one.
- **External notifications.** No email, Slack, or webhook dispatching.
- **Seed data guarding.** `DataSeeder` runs when `agiletrack.seed-demo-data` is `true` (the default, so the Docker demo works out of the box) and skips when the database already has users. Set `AGILETRACK_SEED_DEMO_DATA=false` for any real production deployment.

---

## Running locally

**Docker (recommended)** — this is the path the demo above assumes.

```bash
docker-compose up --build
```

- App: `http://localhost:3000`
- API: `http://localhost:3000/api/v1`
- Sign in: `demo@agiletrack.com` / `Demo@12345`

**Backend and frontend separately**

```bash
cd backend  && ./mvnw spring-boot:run     # :8080, needs PostgreSQL on :5432
cd frontend && npm install && npm run dev # :5173
```

Running the backend test suite requires a working Docker daemon for Testcontainers.

### Production environment variables

```env
# backend
DATABASE_URL=jdbc:postgresql://<host>:5432/<db>
DATABASE_USERNAME=...
DATABASE_PASSWORD=...
JWT_SECRET=...                      # 256-bit key; the prod profile has no fallback
FRONTEND_ORIGIN=https://<your-ui>   # strictly enforced CORS

# frontend
VITE_API_URL=https://<your-api>/api/v1
```

---

## Repository layout

```
backend/src/main/java/com/agiletrack/backend/
  auth/  user/  workspace/  project/       # tenancy and identity
  task/                                    # work items (FEATURE, BUG, TECH_DEBT)
  release/                                 # delivery scope and lifecycle
  dependency/                              # BLOCKS graph, cycle detection
  readiness/                               # derived verdict
  common/  security/                       # base entity, exceptions, concurrency guard, JWT
backend/src/main/resources/db/migration/   # Flyway V1-V20, the schema source of truth
frontend/src/
  pages/ components/ hooks/ services/ types/
docs/BASELINE.md                           # pre-specialization baseline, kept for comparison
```

Flyway is the single source of schema truth. Hibernate validates the schema; it never mutates it.

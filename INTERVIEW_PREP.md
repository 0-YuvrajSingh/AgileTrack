# AgileTrack — Interview Preparation Guide

This guide describes **only what is actually implemented**. Do not claim features that do not exist: there is no Redis, Kafka, WebSocket layer, GraphQL, event sourcing, Elasticsearch, HttpOnly-cookie auth, or arbitrary workflow engine. Where something is deliberately not built, this guide says so — being able to explain what you *didn't* build, and why, is worth more than an inflated feature list.

**Current state:** Phases 0–6 complete. 284 tests (208 backend, 76 frontend). Flyway V1–V15. Change governance (approvals), deterministic release readiness gating, and the Engineering Release Dashboard are fully implemented.

---

# PART 1 — WHAT IT IS

**One line:** AgileTrack is a multi-tenant engineering delivery and change management platform that answers one question deterministically — can this release ship, and if not, exactly why not?

**30 seconds:** It started as a Kanban board and I specialised it into a delivery platform. Teams create work items, group them into releases, record dependencies between them, and govern changes based on risk. The system then derives a release readiness verdict: `READY`, or `NOT_READY` with a machine-readable reason for every gate that failed. Readiness is computed on every read from committed database state — there is no readiness column and no endpoint that writes one, so the verdict can never disagree with the data it summarises.

**60 seconds:** AgileTrack is a multi-tenant engineering delivery platform in React, TypeScript and Spring Boot. The domain is work items → releases → dependencies → change approvals → readiness. The interesting engineering is in four places. First, dependency correctness: `BLOCKS` edges form a graph I keep acyclic with a bounded breadth-first search that runs inside the write transaction, and an item with an unresolved blocker cannot be moved to `DONE` regardless of what the UI offers. Second, change governance: `CHANGE` work items have strict risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), where `HIGH` and `CRITICAL` require formal approval evaluated server-side. Third, derived state: release readiness is recomputed on every request rather than stored, evaluating 5 deterministic gates (`RELEASE_CANCELLED`, `EMPTY_RELEASE`, `INCOMPLETE_WORK`, `BLOCKED_WORK`, `APPROVAL_REQUIRED`), making a whole class of stale-flag bugs unrepresentable. Fourth, correctness under concurrency and multi-tenancy: every mutation validates the full workspace → project → resource chain server-side, and optimistic locking is a real API contract. **60 seconds:** AgileTrack is a multi-tenant engineering delivery platform in React, TypeScript and Spring Boot. The domain is work items → releases → dependencies → change approvals → readiness. The interesting engineering is in four places. First, dependency correctness: `BLOCKS` edges form a graph I keep acyclic with a bounded breadth-first search that runs inside the write transaction, and an item with an unresolved blocker cannot be moved to `DONE` regardless of what the UI offers. Second, change governance: `CHANGE` work items have strict risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), where `HIGH` and `CRITICAL` require formal approval evaluated server-side. Third, derived state: release readiness is recomputed on every request rather than stored, evaluating 5 deterministic gates (`RELEASE_CANCELLED`, `EMPTY_RELEASE`, `INCOMPLETE_WORK`, `BLOCKED_WORK`, `APPROVAL_REQUIRED`), making a whole class of stale-flag bugs unrepresentable. Fourth, correctness under concurrency and multi-tenancy: every mutation validates the full workspace → project → resource chain server-side, and optimistic locking is a real API contract. It is backed by 284 tests, with the backend running against real PostgreSQL via Testcontainers.

**What problem it solves:** A task board tells you what people are doing. It does not tell you whether you can ship. Release decisions in most teams are made from a spreadsheet and a meeting — someone eyeballs a list of tickets and declares it fine. AgileTrack makes that decision derived and explainable: the same data always produces the same verdict, with the same reasons in the same order.

**Why it is more than CRUD:**
- CRUD apps let two users overwrite each other. This one returns `409` and makes the client reconcile.
- CRUD apps leak data through guessable identifiers. Here a UUID is an identifier, never an authorization grant — every lookup is scoped by its parent chain.
- CRUD apps store a "ready" boolean that drifts. This one derives it.
- CRUD apps let you close a ticket that is blocked. This one refuses, in the service layer.
- CRUD apps trust the frontend to declare who approved a change. This one resolves approver identity server-side from session context.

---

# PART 2 — THE DOMAIN MODEL

```
Workspace → Project → Work item ──┬── belongs to a Release
                                  ├── BLOCKS / is blocked by other work items
                                  └── governed by Change Approvals (for CHANGE items)
                                           ↓
                                  Release readiness (derived: 5 gates)
```

**Work item** (`tasks` table) — type (`FEATURE`, `BUG`, `CHANGE`, `TECH_DEBT`), status (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`), priority, risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL` for `CHANGE` only), assignee, board position, optional release.

**Release** — a versioned delivery scope inside a project. Lifecycle: `PLANNED → IN_PROGRESS → RELEASED`, with `CANCELLED` reachable from either non-terminal state. `RELEASED` and `CANCELLED` are terminal.

**Dependency** — a directional `BLOCKS` edge between two work items in the same project. Immutable once written: the API creates and deletes edges but never edits them, because editing an edge's endpoints is indistinguishable from delete-plus-create and would skip the cycle check.

**Change Approval** — a governance record on a `CHANGE` work item storing an `APPROVED` or `REJECTED` decision, the server-derived approver ID, and comments. `LOW` and `MEDIUM` risk changes bypass approval; `HIGH` and `CRITICAL` changes require an active `APPROVED` decision.

**Readiness** — derived. Gates evaluated: `RELEASE_CANCELLED`, `EMPTY_RELEASE`, `INCOMPLETE_WORK`, `BLOCKED_WORK`, `APPROVAL_REQUIRED`. All 5 gates run deterministically against database state.

### Why work items share one table

Every kind of engineering work carries the same fields. A `CHANGE` differs from a `FEATURE` by its `type`, not by its lifecycle, its authorization rule or its audit trail. Splitting them would produce four tables with identical columns and a join on every board load.

Releases and dependencies *are* separate tables, by the same test applied in the other direction: a release has its own lifecycle state machine, its own scope-lock rule and its own optimistic-locking counter; a dependency is a relationship with its own uniqueness constraint and its own audit events. Each earns its table.

**If asked "why not rename `Task` to `WorkItem`?"** Because it would be a large mechanical diff across entity, table, package and API names that a reviewer cannot see the value of, and renaming a table in a Flyway-managed schema means a migration whose only benefit is vocabulary. The type field carries the meaning.

---

# PART 3 — ARCHITECTURE

**Request flow:** React SPA → Axios (interceptor refreshes on `401`) → Spring Security filter (JWT validation) → Controller (HTTP + DTO only) → Service (authorization, business rules, transaction boundary) → Repository → PostgreSQL.

**Layer discipline**

- **Controller** — mapping, binding, status codes. No business logic, ever.
- **Service** — the only place a business rule lives. Authorization, lifecycle guards, cycle detection, readiness, activity recording.
- **Repository** — data access.
- **React components** — UI coordination. **Hooks** own server state. **Services** own HTTP.

The last one matters and is easy to get wrong. The readiness panel renders the server's verdict; it does not re-derive readiness in the browser. Re-deriving is exactly how a UI ends up confidently disagreeing with the backend.

**Backend packages**

```
auth/ user/ workspace/ project/   tenancy and identity
task/                             work items, activity history
approval/                         change governance, risk policy, approvals
release/                          delivery scope and lifecycle
dependency/                       BLOCKS graph, cycle detection, blocked-completion guard
readiness/                        derived verdict
common/                           base entity, exception handling, OptimisticLockGuard
```

**Why a modular monolith?** The domains are highly relational and nearly every mutation spans the tenant chain in one transaction. Microservices would replace a local transaction with a distributed one and add network latency, eventual consistency and deployment complexity, in exchange for independent scalability nothing here needs. This is the correct choice at this scale, and saying so is a stronger answer than pretending the scale justifies more.

---

# PART 4 — TECHNOLOGY CHOICES

| Choice | Why | Alternative and trade-off |
|---|---|---|
| Spring Boot / Java 21 | Declarative transactions, mature JPA, static typing | Node/Express — faster to start, weaker transaction and typing story |
| PostgreSQL | ACID, real constraints (`CHECK`, `UNIQUE`, FK cascades), strong concurrency | MongoDB — no relational integrity across the tenant hierarchy |
| Flyway | Schema is versioned, reviewable and reproducible; Hibernate *validates*, never mutates | `ddl-auto=update` — convenient and undiagnosable |
| React / Vite / TypeScript | Optimistic UI with compile-time safety on API shapes | — |
| Axios | Interceptors make the refresh-token queue clean and keep it out of components | `fetch` — would need the same logic written by hand |
| Testcontainers | Tests run against real Postgres, so migrations and constraints are exercised | H2 — faster, but silently different dialect and no Flyway parity |

---

# PART 5 — DATABASE

| Table | Purpose |
|---|---|
| `users` | Credentials; passwords BCrypt-hashed |
| `workspaces` | The tenant boundary |
| `workspace_members` | User ↔ workspace with `OWNER / ADMIN / MEMBER / VIEWER` |
| `projects` | Scoped to a workspace; `PLANNING / ACTIVE / ON_HOLD / COMPLETED / ARCHIVED`; `@Version` |
| `tasks` | Work items; `type`, `risk_level`, `status`, `position`, nullable `release_id`, `@Version` |
| `change_approvals` | Append-only governance decisions (`APPROVED` / `REJECTED`) for `CHANGE` items |
| `releases` | `lifecycle_state`, `target_date`, `release_version`, `@Version`; name unique per project |
| `work_item_dependencies` | `source` blocks `target`; unique edge; `CHECK (source <> target)` |
| `task_activities` | Append-only audit ledger |
| `refresh_tokens` | SHA-256 hash of the token |

**Two columns named "version".** `releases.release_version` is the semantic string a human reads (`v2.1.0`). `releases.version` is the JPA optimistic-locking counter. They are different concepts and I gave them different columns rather than overloading one — a question worth pre-empting, because a reviewer will notice.

**Constraints pushed into the database:**
- `uq_release_name_per_project` — two releases in one project cannot share a name.
- `uq_dependency_edge` — duplicate edges carry no meaning and would distort traversal.
- `ck_dependency_not_self` — a self-edge is the degenerate cycle. Enforced in the service *and* the schema, because it must never reach the table by any route, including a future bulk import.
- `ck_tasks_risk_level` — ensures `risk_level` is only `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
- `ck_tasks_change_risk` — ensures non-`CHANGE` work items have `risk_level IS NULL` and `CHANGE` items have `risk_level IS NOT NULL`.
- `ON DELETE CASCADE` on dependency endpoints and change approvals; `ON DELETE SET NULL` on `tasks.release_id`, because deleting a release must not delete the work.

**Why UUIDs?** They prevent enumeration and do not leak volume. **But a UUID is an identifier, not an authorization mechanism** — that distinction is the single most important security idea in this codebase, and Part 8 covers it.

---

# PART 6 — INDEXES

| Index | Why |
|---|---|
| `idx_tasks_project_id_status_position` | The board query: equality on `project_id` and `status`, then ordered by `position`. Equality columns must precede the sort column for a B-tree to serve both without a sort step. |
| `idx_tasks_release_id` | Loading a release's scope, and the readiness evaluation's first query. |
| `idx_tasks_risk_level` | Filtering work items by governance risk level. |
| `idx_change_approvals_task_id` | Fast lookup of approval history and latest decision per change item. |
| `idx_releases_project_id` | Listing releases in a project. |
| `idx_releases_lifecycle_state` | Filtering by lifecycle. |
| `idx_dependencies_source` | Cycle detection walks *outgoing* edges. |
| `idx_dependencies_target` | The blocked-completion check reads *incoming* edges. |
| `idx_task_activities_task_id` | History load for one work item. |

Both dependency directions are indexed because the graph is traversed forwards and queried backwards, and neither index serves the other.

---

# PART 7 — AUTHENTICATION

- **Access token** — JWT validated statelessly on every request by `JwtAuthenticationFilter`. The `prod` profile defaults to 15 minutes; the default profile defaults to 24 hours. Worth knowing before you claim "short-lived": `docker-compose.yml` currently passes the 24-hour value even under the prod profile, so the deployed default is 24 hours unless `JWT_EXPIRATION` is set. If asked, say that — it is a configuration smell I know about, not one I would defend.
- **Refresh rotation** — Axios catches a `401`, pauses the request queue, posts the refresh token; the server issues a new access token *and* a new refresh token, invalidating the old one. A stolen refresh token has a bounded useful life.

**BCrypt for passwords, SHA-256 for refresh tokens — the classic question.** It comes down to entropy and lookup. Passwords are low-entropy because humans choose them, so they need a slow, salted hash that defeats rainbow tables and brute force. Refresh tokens are high-entropy random values — unguessable already — but the server must find one by value on every refresh. BCrypt produces a different hash per call, so `WHERE token_hash = ?` is impossible; you would have to load and compare every row. SHA-256 is fast and deterministic, so the column can be indexed, and it still means a dumped database yields no usable tokens. Different threat, different tool.

---

# PART 8 — AUTHORIZATION AND TENANT ISOLATION

**The rule: a UUID is an identifier, never an authorization grant.**

The naive version of this app validates that an ID is a well-formed UUID and then loads it. That is an IDOR waiting to happen — possession of an identifier becomes permission to use it. Here every lookup is scoped by its parent:

```java
taskRepository.findByIdAndProjectId(taskId, projectId)
```

A work item from another project is not "rejected"; it is never found. The check cannot be forgotten, because there is no unscoped query to forget it in.

Every mutation walks the chain: **work item → project → workspace → membership → role**. Applied uniformly to releases, dependencies and readiness, not just to the endpoints that existed first.

**Roles:** `OWNER` renames and deletes the workspace; `OWNER` and `ADMIN` manage members; `MEMBER` creates and edits work; `VIEWER` is refused every mutation. Checked in the service layer. If a `VIEWER` un-hides a button in devtools and posts, the service throws `AccessDeniedException` → `403`.

**Why `404` and not `403` for cross-tenant access?** A `403` confirms the resource exists. That turns UUID guessing into an existence oracle. `404` reveals nothing. The distinction: `403` is for "you are in this workspace but your role is too low" — a fact you already know. `404` is for "this is not yours" — a fact you should not learn.

**Tested by spoofing, not by assertion.** Every new endpoint has a test that presents a genuinely valid UUID belonging to another tenant and asserts `404`. That is a different test from "an invalid UUID is rejected", and it is the one that matters.

---

# PART 9 — BUSINESS RULES (the frozen set)

Each is enforced in the service layer and covered by a test that fails if it breaks.

1. Mutations only within an authorized workspace/project chain.
2. UUIDs never substitute for an authorization check.
3. A work item cannot be `DONE` while an unresolved `BLOCKS` dependency remains.
4. A dependency cycle cannot be created.
5. A work item cannot be assigned to a release belonging to another project.
6. A release cannot be mutated once its lifecycle forbids that mutation.
7. Release readiness is derived, never user-editable.
8. Every `NOT_READY` result contains explicit reasons.
9. Required approval before a controlled change contributes to `READY` (HIGH and CRITICAL changes require approval).
10. Stale writes fail with `409`, never silently overwrite.
11. Activity history is written in the same transaction as the mutation it describes.
12. Archived and closed entities stay protected by backend rules even when the UI hides the controls.

Rule 12 is the one to emphasise. The UI hides the "add work item" button on a locked release — and the server rejects the request anyway. A UI that hides a control is a courtesy; a server that refuses it is a rule.

---

# PART 10 — RELEASES AND LIFECYCLE

**States:** `PLANNED → IN_PROGRESS → RELEASED`; `CANCELLED` from either non-terminal state; `RELEASED` and `CANCELLED` are terminal.

**Two different locks, deliberately separated:**

- **Scope lock** — the set of work items freezes when the release leaves `PLANNED`. Once execution starts, quietly adding scope is how releases slip without anyone recording that they did.
- **Field edit lock** — the release's own fields (name, target date) stay editable until a terminal state.

Freezing everything at execution start makes a real release unmanageable; freezing nothing until ship makes the lock meaningless. Both flags are returned as derived `scopeLocked` and `editable` fields, so the UI shows the right controls without re-implementing the state machine.

**Why no separate `archived` flag?** The brief asked for "CRUD + archive". A boolean archive on top of a four-state lifecycle would be a second way to say `CANCELLED`, and then someone has to answer what archived-and-not-cancelled means. Instead: `CANCELLED` is the archive path, and hard delete is permitted only while `PLANNED`. Deleting detaches the scope explicitly rather than relying on the FK, so each work item's history records that it left the release.

**Cross-project assignment** is impossible because the work item is resolved through the release's project, not looked up globally and checked afterwards.

---

# PART 11 — THE DEPENDENCY GRAPH

This is the strongest technical piece to talk about.

**The edge:** `source BLOCKS target` — the target cannot complete while the source is unresolved. A blocker counts as resolved once it is `DONE`.

**Cycle detection.** Before writing `blocker → blocked`, a breadth-first search asks whether a path already runs from `blocked` back to `blocker`. If one does, the new edge would close a loop, and the request is rejected with the actual path in the message rather than a bare "cycle detected".

Three details worth explaining:

**1. It expands a frontier per query, not a node per query.** The naive version issues one query per visited node — an N+1 in the middle of a hot path. The repository query takes a *collection* of source ids and returns both endpoints of each matching edge as a projection:

```java
@Query("""
    SELECT d.source.id AS sourceId, d.target.id AS targetId FROM WorkItemDependency d
    WHERE d.source.id IN :sourceIds
      AND d.dependencyType = :type
      AND d.source.project.id = :projectId
    """)
List<EdgeView> findEdgesBySourceIds(...);
```

One query per BFS *level*. Returning both endpoints also means the predecessor map used to reconstruct the rejection path is built for free — no second lookup pass. Work item titles are resolved only on the rejection path, so the success path never pays for a message nobody reads.

**2. It is bounded, and the bounds throw.** Depth 100, 10,000 visited nodes. An unbounded traversal on user-supplied graph shape is a denial-of-service surface. But the important part is what happens at the limit: **it throws rather than returning "no cycle found."** A bounded search that fails open silently corrupts the graph, which is worse than refusing an unusual request. This is the design decision I would most want to be asked about.

**3. It runs inside the write transaction.** Checking outside the transaction leaves a window for a concurrent writer to insert the edge that closes the loop between the check and the write.

**Blocked completion.** `BlockedCompletionGuard` refuses to move an item to `DONE` while any blocker is unresolved, and names them. It is called from the service, not the controller, so it applies to every path that changes status.

**Both ends are audited.** Adding an edge writes `DEPENDENCY_ADDED` to *both* work items — "Blocked by X" on one, "Now blocks Y" on the other. Each item's own history should explain why it is waiting, or what is waiting on it.

**Why only `BLOCKS`?** `RELATES_TO` and similar are edges that do not gate anything. Adding a type that changes no behaviour adds schema and UI for nothing. The column is an enum, so adding one later is a value, not a migration of shape.

---

# PART 12 — DERIVED READINESS

**The verdict is computed on every read. There is no readiness column, no setter, and no write endpoint.** The `ReadinessController` exposes `GET` only, and the absence of a write verb *is* the enforcement of the rule.

**Why derived rather than stored?** A stored flag depends on tables that change independently — work items, dependencies, approvals, and releases. Every write path in the system would have to remember to recompute it. The day one path forgets, the platform's headline answer is silently wrong, and nothing fails loudly. Deriving it makes that whole class of bug unrepresentable: resolve a blocker or approve a change, and readiness updates with no second write anywhere.

**Why deterministic ordering?** Reasons are sorted by reason code, then work item title, then id, then detail. Without an explicit sort, output order follows whatever the database returned, which makes the response untestable and makes two identical states look different to a human comparing them. The sort is total — id breaks ties between identical titles — so identical state always produces byte-identical output.

**The five readiness gates:**
1. `RELEASE_CANCELLED` — A cancelled release can never ship.
2. `EMPTY_RELEASE` — An empty release is `NOT_READY`. "Nothing to ship, therefore ready to ship" is a bad answer.
3. `INCOMPLETE_WORK` — Every work item in scope must be `DONE`.
4. `BLOCKED_WORK` — No item in scope can have an unresolved blocker (even blockers outside the release count, as they prevent completion).
5. `APPROVAL_REQUIRED` — Any `CHANGE` work item with `HIGH` or `CRITICAL` risk must have an active `APPROVED` decision. Unapproved or rejected changes block release readiness.

**Why no caching?** Four independently changing inputs means a real invalidation problem, and nothing has been measured that says it is needed. The evaluation is a bounded number of queries regardless of release size — the blocked-work gate batches into one query, and the approval gate batches all scoped change approvals into one query rather than looping. Adding a cache would trade a real correctness risk for an unmeasured performance gain.

---

# PART 13 — OPTIMISTIC LOCKING AS AN API CONTRACT

**The problem:** two users open the same work item. A moves it to `DONE`; B moves it to `IN_PROGRESS`. Without locking, B's write silently discards A's.

**`@Version`:** Hibernate issues `UPDATE tasks SET ... , version = 6 WHERE id = ? AND version = 5`. If A already advanced it, B updates zero rows, Hibernate throws, and a `@ExceptionHandler` maps it to `409 Conflict`.

**The part that is easy to get wrong — and that I got wrong first.** `@Version` on the entity only protects two *server transactions* racing. It does nothing for a user who loaded a screen thirty seconds ago, because their stale value never reaches the server. For that, the version has to travel: responses expose it, requests carry it, and the service compares the client's expected version against the row before touching it.

`OptimisticLockGuard` does that comparison in one place rather than repeating it in five services:

```java
public static void requireCurrentVersion(Class<?> entityType, Object id, Long actual, Long expected) {
    if (expected != null && !expected.equals(actual)) {
        throw new ObjectOptimisticLockingFailureException(entityType, id);
    }
}
```

**`PUT` requires a version; `PATCH` on status honours one if sent.** A full replace must be based on a real read, so the version is mandatory. Status transitions accept it optionally, which keeps drag-and-drop workable. Both halves are tested, so the looseness is deliberate and pinned rather than accidental — and being able to say *why* the two differ is the point.

**Why not pessimistic locking?** It holds real row locks. A user who opens a browser tab and goes to lunch would hold one.

**Why not retry silently?** A retry overwrites the other person's explicit intent without asking. The `409` and a reload asks.

**Frontend:** the board updates optimistically for responsiveness; on `409` it rolls back to the previous snapshot and shows a toast. Tested by mocking a `409` on drop and asserting the card returns to its original column.

---

# PART 14 — ACTIVITY HISTORY

Append-only. Types: `CREATED`, `ASSIGNED`, `STATUS_CHANGED`, `PRIORITY_CHANGED`, `TYPE_CHANGED`, `RELEASE_ASSIGNED`, `RELEASE_UNASSIGNED`, `DEPENDENCY_ADDED`, `DEPENDENCY_REMOVED`, `COMPLETED`, `APPROVAL_GRANTED`, `APPROVAL_REJECTED`, `RISK_CHANGED`.

**Transactionality is the whole point.** History is written by `TaskActivityRecorder` inside the same `@Transactional` service method as the mutation. If the write rolls back — a `409`, a validation failure, a rejected cycle — the history entry rolls back with it. There is no out-of-band writer, no event listener and no async publisher, so a record saying "moved to DONE" can never survive a move the database refused.

`TaskActivityRecorder` is a single shared component precisely so the rule lives in one place. `TaskService`, `ReleaseService`, `DependencyService`, and `ApprovalService` all record through it; none of them writes an activity row directly.

**Seeded data has no history,** because history records what people did and nobody did it. Fixtures are written straight through the repositories.

---

# PART 15 — CHANGE GOVERNANCE & APPROVAL WORKFLOW

**The problem:** High-risk production changes slipping into releases unreviewed. In a delivery platform, knowing that all work items are `DONE` and unblocked is insufficient if a high-risk schema change or security migration has not been reviewed and approved by an authorized engineering lead.

**The model:**
- `RiskLevel` enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- Pushed to the database: `tasks.risk_level` with `ck_tasks_risk_level` and `ck_tasks_change_risk` check constraints (ensuring only `type = 'CHANGE'` carries a risk level, and defaulting to `LOW`).
- Dedicated `change_approvals` table: `id`, `work_item_id`, `decision` (`APPROVED` or `REJECTED`), `approver_id`, and `created_at`.
- Transactional audit log: `APPROVAL_GRANTED`, `APPROVAL_REJECTED`, `RISK_CHANGED` written in the same transaction.

**The policy (Fixed, deterministic):**
- `LOW` & `MEDIUM`: Do not require approval.
- `HIGH` & `CRITICAL`: Require an active `APPROVED` decision.
- Why fixed policy rather than a workflow engine? A dynamic workflow engine (custom approval chains, multi-stage matrix, conditional rules) introduces immense state machine complexity and operational fragility. A deterministic policy hardcodes the rule in a clean, tested domain component (`ChangeRiskPolicy`), making behavior predictable and fast.

**Key design decisions:**
1. **Server-side approver derivation:** The client never sends an approver ID or email. The identity is derived from the authenticated security context via `CurrentUserService`. This makes approver spoofing impossible.
2. **Strict RBAC:** `VIEWER` users cannot submit approvals. Attempting to approve yields `403 Forbidden`.
3. **Latest decision wins:** An approved change can subsequently be rejected if new risks emerge, or a rejected change can be approved after fixes. The readiness gate evaluates the most recent decision by timestamp.
4. **Derived readiness gate integration:** The 5th gate, `APPROVAL_REQUIRED`, is emitted when a `HIGH` or `CRITICAL` change has no approval or has been rejected. It batches the lookup across all scoped change items in a single query.

---

# PART 16 — ENGINEERING RELEASE DASHBOARD

**Why a release dashboard rather than generic analytics charts?**
Most task trackers offer burndown charts, velocity graphs, and cumulative flow diagrams. Those measure *team activity*, but they fail to answer whether software can actually ship. A team can burn down 50 story points while leaving 2 critical schema migrations unreviewed and a dependency cycle in place.

The **Engineering Release Dashboard** replaces generic workspace counters with a focused release cockpit that answers the core product question across all projects:
1. **Derived Readiness Verdict:** Prominent `READY TO SHIP` or `NOT READY` verdict badge driven by server evaluation.
2. **Work Completion Progress:** `X / Y complete` with visual percentage bar.
3. **Unresolved Blockers Count:** Immediate visibility into `BLOCKED_WORK` dependencies holding up the release.
4. **Pending Change Approvals:** Count of `HIGH` or `CRITICAL` changes awaiting review or rejected.
5. **Scope Breakdown:** Work item distribution across `Features`, `Bugs`, `Changes`, and `Tech Debt`.
6. **Actionable Readiness Blockers List:** Displays machine-readable reason codes (`INCOMPLETE_WORK`, `BLOCKED_WORK`, `APPROVAL_REQUIRED`, `RELEASE_CANCELLED`, `EMPTY_RELEASE`) and plain English explanations with one-click navigation directly to the Release Cockpit.

---

# PART 17 — KANBAN POSITIONING

Positions are doubles with gaps. Dropping between 1000 and 2000 yields 1500 — one row update instead of renumbering the column. If gaps halve toward zero, a rebalance recalculates the column.

---

# PART 18 — PERFORMANCE

**The measurement:** `EXPLAIN (ANALYZE, BUFFERS)` over one million generated tasks, searching with `ILIKE '%term%'`.

**Why B-tree cannot help:** a leading wildcard defeats it.

**Why `pg_trgm` was rejected anyway:** every query is anchored by `project_id`, so Postgres prunes to one tenant before scanning. Even with 10,000 tasks in a single project, the scan resolves in roughly 20 ms. A GIN trigram index recalculates trigrams on every insert and update — a real cost on a write-heavy board — to improve a read latency nobody is waiting on. Deferred on evidence, not on taste. If cross-project global search ever becomes a requirement, the anchor disappears and the calculation changes.

**Readiness cost:** bounded queries per evaluation regardless of release size. Cycle detection: one query per BFS level, not per node.

---

# PART 19 — TESTING

**284 tests: 208 backend, 76 frontend.** Backend integration tests run against real PostgreSQL through Testcontainers, so Flyway migrations, `CHECK` constraints and Postgres dialect behaviour are all exercised. H2 would test none of them.

Tests are organised around rules rather than classes:

- **Tenant isolation** — every new endpoint probed with a valid UUID from another tenant, asserting `404`. Spoofing, not just validation.
- **Dependencies** — direct, transitive and self cycles; both traversal bounds (against synthetic graphs, not a million inserted rows); blocked completion refused at the service layer.
- **Change Governance** — risk level assignment, check constraints, fixed policy unit tests, approval RBAC (`403` for `VIEWER`), approver context derivation, optimistic concurrency on approvals, and full activity auditing.
- **Releases** — nested suites for CRUD, lifecycle transitions, scope lock, cross-tenant isolation and concurrency.
- **Readiness** — each gate alone (including `APPROVAL_REQUIRED`), gates in combination, reason ordering asserted explicitly, and a test that there is no route to *set* readiness.
- **Concurrency** — real stale writes through the API asserting `409`, not mocked exceptions.
- **Frontend** — services, hooks, modals, and the panels that render server verdicts, including that the readiness panel preserves server ordering rather than re-sorting.
- **Frontend** — services, hooks, modals, the Engineering Release Dashboard, and panels that render server verdicts, including that the readiness panel preserves server ordering rather than re-sorting.

`AbstractIntegrationTest` starts one PostgreSQL container as a static singleton shared across all integration classes, wired in through `@DynamicPropertySource`. It is never explicitly stopped — Testcontainers' Ryuk reaper removes it at JVM exit, and reusing one container keeps the suite fast.

`PerformanceBenchmarkTest` is tagged `benchmark` and excluded from the default run. It inserts about 1.1 million rows, asserts nothing and cleans up nothing — it is a measurement harness, not a test. Run it deliberately with `-Dgroups=benchmark`.

---

# PART 20 — REAL DEBUGGING STORIES

**1. Optimistic locking that could not actually be triggered.**
*Symptom:* I set out to write an end-to-end test for the `409` path and could not make one fail. Two sequential API calls with stale data both succeeded.
*Root cause:* `@Version` was on the entity, and the entity-level protection worked — but the version never left the server. `TaskResponse` did not expose it, and no request DTO accepted it. So a client could not send a stale version even in principle, which meant the frontend's carefully written `409` rollback handler was unreachable code. The feature looked implemented and was, in practice, absent.
*Fix:* Made the version part of the API contract — exposed in responses, required on `PUT`, honoured on status `PATCH` — and centralised the comparison in `OptimisticLockGuard`.
*Lesson:* An annotation is not a feature. Concurrency control that never crosses the wire only protects against a race the client cannot cause.

**2. My own N+1, inside the cycle detector.**
*Symptom:* Nothing failed. I noticed it reading my own code back.
*Root cause:* The first BFS asked for one node's predecessor per candidate — a query per visited node, in the middle of the write path for every new dependency.
*Fix:* Rewrote the repository query to take the whole frontier as a collection and return both edge endpoints as a projection, so one query serves an entire BFS level and the predecessor map falls out of the same result.
*Lesson:* N+1 hides most easily in code you just wrote, because it passes every test.

**3. A test I wrote caught a pre-existing 500.**
*Symptom:* Posting an unknown enum value returned `500`, not `400`.
*Root cause:* Jackson throws `HttpMessageNotReadableException` on an unparseable body, and nothing mapped it. This affected `status` and `priority` too, so it predated my changes — a malformed body was a server error rather than a client error across the whole API.
*Fix:* Mapped it in `GlobalExceptionHandler` to `400`.
*Lesson:* Writing tests for a new field surfaced a defect in fields that had shipped long before.

**4. The suite hung for ten minutes.**
*Symptom:* Tests stopped producing output and never finished.
*Diagnosis:* `jstack` on the running JVM showed Hibernate parked in `AbstractDeleteCoordinator` during a flush.
*Root cause:* A benchmark class inserting 1.1 million rows with no cleanup; a later cascade delete had to walk all of them.
*Fix:* Tagged it `benchmark` and excluded it from the default run. As a side effect the suite's collected count returned to the documented baseline — the benchmark had been inflating it.
*Lesson:* A "test" that asserts nothing is a harness, and running it by default costs everyone time.

**5. Testcontainers refusing to start.**
*Symptom:* Every integration test failed with `password authentication failed for user "postgres"`, then later with an HTTP 400 from the Docker daemon.
*Root causes, in sequence:* an unrelated native PostgreSQL owned port 5432 while the declared compose config was inert; a stale `~/.testcontainers.properties` pinned a socket strategy that no longer matched the active Docker context; and the pinned Testcontainers version shipped a docker-java too old for a Docker Engine that rejects API versions below 1.44.
*Fix:* Introduced `AbstractIntegrationTest` with an explicit singleton container, removed the stale properties file, and bumped Testcontainers.
*Lesson:* "Works on my machine" usually means an implicit dependency on local state. Make it explicit in the test code.

---

# PART 21 — DEPLOYMENT

`application-prod.yaml` removes every insecure default: no fallback JWT secret, no hardcoded CORS origin. Secrets come from `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_SECRET`, `FRONTEND_ORIGIN`. The frontend is a static Vite build with `VITE_API_URL` baked in. `docker-compose up --build` brings up Postgres, backend and frontend with health-check gating.

---

# PART 22 — SECURITY REVIEW

| Threat | Control |
|---|---|
| SQL injection | Parameterized queries throughout Spring Data JPA |
| IDOR / cross-tenant access | Parent-scoped lookups; `404` on foreign resources; spoofing tests |
| Privilege escalation | Role checks in the service layer, never the UI |
| Password cracking | BCrypt, salted and slow |
| Database dump | Refresh tokens stored as SHA-256 hashes, and rotated |
| Stolen access token | Bounded expiry (15 min under the prod profile's own default; see Part 7) |
| XSS output | React escapes interpolated values in JSX |
| Cross-origin abuse | Single permitted origin from `FRONTEND_ORIGIN` in prod |

**The honest limitation — say this before you are asked.** Tokens are held in browser storage. **Browser storage is not XSS-safe.** Any script executing in the page can read them, and nothing in this codebase changes that. Hashing refresh tokens server-side limits the blast radius of a *database* compromise; it does nothing for a *client* compromise. `HttpOnly; Secure` cookies with CSRF protection are the real hardening path and are not implemented. Do not describe the current storage as cookie-level security — volunteering the gap reads as competence, and claiming otherwise fails the first follow-up question.

---

# PART 23 — WHAT IS DELIBERATELY NOT BUILT

- **Arbitrary workflow engines & approval matrices.** Approvals use a clear, deterministic fixed policy (LOW/MEDIUM bypass; HIGH/CRITICAL require approval). Configurable dynamic workflow rules and multi-stage sign-off matrices are intentionally not built.
- **Incident semantics.** No incident type, severity or MTTR.
- **Release editing in the UI.** The API supports it; the UI exposes create, lifecycle and scope only.
- **Real-time collaboration.** No WebSockets. REST plus optimistic locking gives correctness under concurrency without persistent stateful connections; what it does not give is live presence.
- **Caching, message brokers, search infrastructure.** Each would be justified by a measurement, and none has been measured.
- **Seed guarding.** `DataSeeder` runs on any profile, guarded only by a "no users yet" check. Fine for a demo, would need a profile guard for real production use.

---

# PART 24 — DESIGN TRADE-OFFS, IN ONE LINE EACH

- **Monolith over microservices** — traded independent scaling for transactional integrity and zero network boundaries.
- **Fixed policy over a configurable workflow engine** — traded infinite customizability for a simple, deterministic rule with zero configuration overhead.
- **Derived readiness over a stored flag** — traded per-request computation for the impossibility of a stale verdict.
- **Bounded BFS that throws** — traded serving unusual graphs for never writing an incorrect one.
- **`CANCELLED` over a separate archive flag** — traded a familiar boolean for one unambiguous lifecycle.
- **Scope locks before field editing does** — traded a simpler rule for a usable one.
- **Blocked state as a query** — traded a convenient field for one query per board instead of one per card.
- **REST + optimistic locking over WebSockets** — traded live presence for a far simpler system.
- **`ILIKE` over `pg_trgm`** — traded 20 ms of read latency for write throughput, on evidence.

---

# PART 25 — RAPID FIRE

- **Why Postgres?** ACID and real constraints across a tenant hierarchy.
- **Why Flyway?** Versioned, reviewable schema; Hibernate validates and never mutates.
- **Why UUIDs?** No enumeration, no volume leak — but they are identifiers, not permissions.
- **Why `404` not `403` cross-tenant?** `403` confirms existence.
- **Why is readiness not a column?** Four independent inputs; a stored flag drifts silently.
- **Why does `NOT_READY` always carry reasons?** A verdict nobody can act on is not worth returning.
- **Why sort the reasons?** Determinism — otherwise the response is untestable.
- **Why does the cycle check throw at its bounds?** Failing open would write a cycle.
- **Why is the cycle check inside the transaction?** Otherwise a concurrent writer closes the loop between check and write.
- **Why is the version in the API?** `@Version` alone cannot catch a stale *client*.
- **Why 409 and not auto-retry?** A retry discards the other person's intent without asking.
- **Why is activity written in the same transaction?** So a rolled-back change leaves no record claiming it happened.
- **Why does `GET /readiness` have no `PUT`?** The missing verb *is* the rule.
- **Why one `tasks` table for four work item types?** Same fields, same lifecycle; only the `type` differs.
- **Why derive approver identity server-side?** Never trust client-supplied credentials or claims for governance sign-offs.
- **Why latest decision wins?** Allows correcting decisions when risks or requirements evolve without mutating immutable audit history.
- **Why an Engineering Release Dashboard instead of charts?** Velocity measures activity; readiness determines if software can ship.
- **Why Testcontainers?** H2 does not run the migrations or the constraints that production runs.
- **Why is the benchmark excluded?** It asserts nothing and inserts 1.1 million rows.

---

# PART 26 — FIVE ANSWERS WORTH REHEARSING

**1. "Walk me through the most interesting thing you built."**

"Cycle detection in the dependency graph. When you add a `BLOCKS` edge, I run a breadth-first search asking whether a path already runs from the target back to the source — if it does, the new edge would close a loop. Three things make it more than a textbook BFS. It expands a whole frontier per query rather than one node per query, because the naive version is an N+1 sitting in a write path; the query returns both endpoints of each edge as a projection, so the predecessor map I need to report the offending path comes back for free. It runs inside the write transaction, so a concurrent writer can't insert the closing edge between my check and my insert. And it's bounded — depth 100, ten thousand nodes — where hitting a bound *throws* rather than returning 'no cycle found'. That last one is the real decision: a bounded search that fails open silently corrupts the graph, and I'd much rather refuse an unusual request than write a cycle I can never detect again."

**2. "How do you know a user can't access another tenant's data?"**

"Because there is no query that could let them. Every lookup is scoped by its parent — `findByIdAndProjectId`, not `findById` — so a work item from another project isn't rejected, it's never found. The check can't be forgotten because there's no unscoped query to forget it in. The principle I hold to is that a UUID is an identifier, never an authorization grant; validating that an ID is well-formed and then loading it is exactly the IDOR bug. And I test it by spoofing rather than asserting: every new endpoint has a test that presents a genuinely valid UUID belonging to another tenant and expects a `404`. Not `403` — a `403` would confirm the resource exists and turn ID guessing into an existence oracle."

**3. "Why compute readiness instead of storing it?"**

"Because a stored flag depends on three tables that change independently — work items, dependencies and releases — so every write path in the system would have to remember to recompute it. The day one path forgets, the headline answer of the product is silently wrong and nothing fails loudly. Deriving it on read makes that class of bug unrepresentable: resolve a blocker, and readiness changes with no second write anywhere. The costs are real and I accepted them deliberately. It's computed per request, so I made the evaluation a bounded number of queries — the blocked-work gate batches the whole release into one query rather than looping. And I sort the reasons explicitly by code, then title, then id, so identical state always produces identical output; without that, ordering follows whatever Postgres returned and the response isn't testable. I didn't cache it, because caching a value with three independent inputs is a real invalidation problem and nothing has been measured that says it's needed."

**4. "Tell me about a bug you found in your own work."**

"I set out to write an end-to-end test for the `409` conflict path and couldn't make it fail. Two sequential API calls with stale data both succeeded. The cause was that `@Version` was on the entity and worked correctly — but the version never left the server. The response DTO didn't expose it and no request DTO accepted it, so a client couldn't send a stale version even in principle. Which meant the frontend's `409` rollback handler, which I'd written and which looked fine, was unreachable code. The feature looked implemented and was effectively absent. I fixed it by making the version part of the API contract — returned in responses, required on `PUT`, honoured on status `PATCH` — and centralising the comparison in one guard rather than repeating it in five services. The lesson I took is that an annotation isn't a feature: concurrency control that never crosses the wire only protects against a race the client can't cause."

**5. "How does the Engineering Release Dashboard tie the whole product together?"**

"Task management dashboards typically throw up velocity charts, burndown curves, and pie charts of ticket statuses. That answers what engineers were busy with last sprint, but it fails to answer whether the release can safely ship to production today. In AgileTrack, the Engineering Release Dashboard aggregates the four critical delivery signals for any release across projects: work completion percentage, unresolved blocker count, pending high-risk change approvals, and the exact deterministic readiness verdict. If a release is NOT READY, it does not just show a red icon — it lists the machine-readable reason codes and human-readable blockers, linking directly to the Release Cockpit where leads can unblock dependencies or grant change approvals."

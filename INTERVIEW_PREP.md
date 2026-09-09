# AgileTrack Complete Interview Preparation Guide

This guide is explicitly tailored to the actual implementation of AgileTrack. Do not claim features that do not exist (e.g., Redis, Kafka, WebSockets, or HttpOnly cookies).

---

# PART 1 — PROJECT UNDERSTANDING

### 1. What is AgileTrack?
**One-line:** AgileTrack is a multi-tenant Kanban project management application built with React and Spring Boot.
**30-second:** It’s a full-stack Agile project manager engineered for strict data isolation. It features secure stateless JWT authentication, role-based access control, and a PostgreSQL database. It specifically handles concurrent workflow scenarios using optimistic locking to prevent data loss when multiple users modify tasks simultaneously.
**60-second:** AgileTrack is a production-ready, multi-tenant Kanban platform modeled after Jira or Trello. I built it with React, TypeScript, and Spring Boot to solve not just basic CRUD, but real-world concurrency and security challenges. It features strict tenant isolation at the service layer to prevent UUID spoofing, role-based access control, and stateless JWT authentication with SHA-256 hashed refresh tokens. To handle simultaneous drag-and-drop collisions, I implemented JPA `@Version` optimistic locking, which catches `409 Conflicts` and safely rolls back optimistic UI updates. It’s thoroughly tested with 78+ PostgreSQL integration tests via Testcontainers.
**Detailed:** (See architecture and features below).

### 2. What problem does AgileTrack solve?
**The real problem:** Task management in a collaborative environment inherently introduces race conditions (lost updates) and data-leakage risks (cross-tenant spoofing). AgileTrack provides a secure, isolated workspace for teams where concurrent drag-and-drops are handled deterministically without data corruption. 
**Target users:** Agile teams and project managers who need isolated workspaces to manage tasks across different projects.
**Why it’s more than CRUD:** Simple CRUD apps break when two users update the same record. AgileTrack implements optimistic locking. Simple CRUD apps leak data via predictable IDs. AgileTrack enforces a strict `Task -> Project -> Workspace -> User Role` validation chain before executing mutations.

### 3. Main Features
- **Stateless Secure Auth:** JWT access tokens + SHA-256 hashed refresh tokens.
- **Tenant Isolation & RBAC:** strict workspace boundaries and `OWNER/MEMBER/VIEWER` roles.
- **Project/Task Lifecycles:** Enforced state machines (e.g., archived projects are immutable).
- **Optimistic Locking:** `@Version` catches simultaneous mutations, firing `409 Conflict`.
- **Task Activity History:** Append-only transactional audit trail.

### 4. Complete User Workflow
`Registration (BCrypt hash)` → `Login (JWT issued)` → `Workspace (Create/View)` → `Members (Invite with RBAC)` → `Project (Create)` → `Tasks (Create)` → `Kanban (Drag-and-drop, optimistic UI)` → `Assignment` → `Activity History (View transactional logs)`.

### 5. What exactly did I build?
- **Backend:** Spring Boot service architecture, strict hierarchy validation, custom exceptions.
- **Frontend:** React/Vite SPA, custom hooks, isolated API services, Axios interceptors for token rotation.
- **Database:** PostgreSQL schema, Flyway migrations (V1-V11), composite indexes.
- **Security:** Spring Security filter chains, SHA-256 refresh hashing, CORS lockdown.
- **Testing:** Testcontainers integration tests, Vitest/RTL frontend behavioral testing.
- **Performance:** `EXPLAIN ANALYZE` driven index validation.

---

# PART 2 — 60-SECOND ANSWER
"AgileTrack is a multi-tenant Kanban project management platform I built using React, TypeScript, and Spring Boot. I wanted to build something more complex than a basic CRUD app, so I focused heavily on concurrency and security. The core problem it solves is allowing collaborative teams to manage workflows in completely isolated workspaces without risking data leaks or lost updates. 

Technically, it uses stateless JWT authentication where refresh tokens are stored as SHA-256 hashes to mitigate database compromise. To handle concurrent drag-and-drop actions on the Kanban board, I implemented JPA `@Version` optimistic locking. If two users move a task simultaneously, the backend rejects the stale request with a `409 Conflict`, and the frontend catches it to safely roll back the optimistic UI. The entire system is validated by 78 integration tests running against a real PostgreSQL instance via Testcontainers to ensure my Flyway migrations and database constraints are airtight."

---

# PART 3 — ARCHITECTURE

**Flow:** React SPA → Axios (intercepts 401s for refresh) → Spring Security Filter (JWT validation) → Controller (HTTP mapping, DTO validation) → Service (Business rules, RBAC, tenant isolation) → Repository (Spring Data JPA) → PostgreSQL.

- **Controller:** Only handles HTTP status codes, routing, and DTO parsing. NO business logic.
- **Service:** Handles the "rules" (Can this user modify this task? Is the project archived?).
- **Repository:** Strictly data access.

**Why Modular Monolith over Microservices?**
AgileTrack’s domains (Users, Workspaces, Projects, Tasks) are highly relational. Splitting them into microservices would introduce extreme complexity (distributed transactions, network latency, eventual consistency) for zero benefit at this scale. A modular monolith provides strong compile-time guarantees, transactional integrity, and simple deployment, which is the correct engineering choice for this project scope.

---

# PART 4 — TECHNOLOGY CHOICES

- **Spring Boot / Java 21:** Chosen for enterprise-grade dependency injection, robust transaction management, and static typing. Alternative: Node.js/Express. Trade-off: Spring has a steeper learning curve and higher memory footprint, but prevents runtime type errors and handles complex JPA mapping seamlessly.
- **PostgreSQL:** Chosen for ACID compliance, strong relational constraints (`ON DELETE CASCADE`), and excellent concurrency control. Alternative: MongoDB. Trade-off: Postgres requires strict schema management (Flyway) but guarantees relational integrity across tenant hierarchies.
- **React / Vite / TypeScript:** Chosen for building a highly reactive, optimistic Kanban UI. Vite provides massive build speed improvements over Webpack.
- **Axios:** Chosen over `fetch` because of its powerful interceptor API, which is critical for cleanly handling the JWT refresh rotation queue without polluting component logic.
- **Testcontainers:** Chosen to run integration tests against a real PostgreSQL instance inside Docker. Alternative: H2 in-memory DB. Trade-off: Testcontainers is slightly slower to boot but guarantees 100% parity with production schema behavior.

---

# PART 5 — DATABASE

- **users:** Stores credentials. Passwords are BCrypt hashed.
- **workspaces:** The root tenant boundary.
- **workspace_members:** Junction table linking users to workspaces with a `role` (OWNER, MEMBER, VIEWER).
- **projects:** Bound to a workspace. Has an `ACTIVE` or `ARCHIVED` status.
- **tasks:** Bound to a project. Contains `status`, `position`, and `version` (for locking).
- **refresh_tokens:** Links to a user. Stores the SHA-256 hash of the token.
- **task_activities:** Immutable append-only ledger linked to a task.

**UUIDs:** Used to prevent Insecure Direct Object Reference (IDOR) attacks and enumeration. Integers reveal scale and are easily guessable.
**Cascades:** `ON DELETE CASCADE` is set on tasks when a project is deleted. Enforced at the DB level to prevent orphaned records if a query bypasses JPA.

---

# PART 6 — INDEXES
- **`idx_tasks_project_id_status_position` (Composite):** Optimizes the Kanban board fetch. The query filters by `project_id` and `status`, then orders by `position`. Column order matters: equality filters (`project_id`, `status`) must precede sort columns (`position`) for the B-Tree to traverse efficiently.
- **`idx_task_activities_task_id`:** Speeds up the history load for a specific task. Without it, loading history would require a full sequential scan of the activities table.

---

# PART 7 — AUTHENTICATION

- **JWT:** Short-lived access token (15m). Validated statelessly on every request via `JwtAuthenticationFilter`.
- **Refresh Token Rotation:** When access expires, Axios catches `401`, pauses the queue, and posts the refresh token. The server verifies it, issues a new JWT and a NEW refresh token (rotation), invalidating the old one. This limits the window of a stolen refresh token.
- **BCrypt vs SHA-256 (CRITICAL):** 
  - **Passwords** use BCrypt because they are low-entropy (humans pick weak passwords). BCrypt salts the hash and is intentionally slow (compute-heavy) to prevent brute-force/rainbow table attacks. 
  - **Refresh Tokens** use SHA-256 because they are high-entropy (random 128-bit UUIDs) and unguessable. We need fast, deterministic lookups (`SELECT * WHERE token_hash = ?`). BCrypt generates a different hash every time, making indexed lookups impossible. SHA-256 solves the DB compromise threat without breaking indexed lookups.

---

# PART 8 — AUTHORIZATION
**Roles:** `OWNER` (can manage members/delete workspace), `MEMBER` (can create/edit tasks and projects), `VIEWER` (read-only).
Authorization is checked in the **Service Layer**, not just the UI. If a `VIEWER` unhides a button in React and submits a POST request, the Spring Boot Service intercepts the command, checks `workspaceMemberRepository.findByUserAndWorkspace`, sees the `VIEWER` role, and throws an `AccessDeniedException` (mapped to `403 Forbidden`).

---

# PART 9 — TENANT ISOLATION
Every service mutation executes a parent-chain validation:
1. Does the task belong to the requested project?
2. Does the project belong to the requested workspace?
3. Does the workspace belong to the user?
**Why 404 instead of 403?** If User A guesses the UUID of User B's project, returning `403 Forbidden` tells User A "This project exists, you just can't see it" (existence leakage). Returning `404 Not Found` acts as a black hole, preserving absolute privacy.

---

# PART 10 — BUSINESS RULES
- **Archived Projects:** If a project is `ARCHIVED`, it becomes immutable. The service layer throws a `400 Bad Request` if anyone attempts to add, move, or modify tasks within it. This guarantees historical record integrity.
- **Transitions:** Tasks can only flow through defined states (`TODO -> IN_PROGRESS -> IN_REVIEW -> DONE`).

---

# PART 11 — RESPONSIBILITIES
- **DTO:** Data transfer. Contains `@NotBlank` basic validation (e.g., string length).
- **Controller:** Maps HTTP (`@PostMapping`), extracts headers, calls Service, returns `201 Created`.
- **Service:** Business validation. "Is this project archived? Does this user have MEMBER role? Does this task belong to this workspace?"
- **Repository:** Interface to PostgreSQL.

---

# PART 12 — OPTIMISTIC LOCKING
**The Problem:** User A and User B open Task X. User A moves it to DONE. User B moves it to IN_PROGRESS. Without locking, User B's request overwrites User A's (Lost Update).
**`@Version`:** The `version` column acts as a tracker.
**DB Behavior:** `UPDATE tasks SET status='IN_PROGRESS', version=6 WHERE id=... AND version=5;`
If User A already made it version 6, User B's query updates 0 rows. Hibernate throws `OptimisticLockException` → `409 Conflict`.
**Frontend:** The React board *optimistically* updates the UI instantly for good UX. When the `409` arrives, the `catch` block reverts the React state to its previous snapshot and shows a toast warning.
**Why not pessimistic?** Pessimistic locking holds actual database row locks. In a web app where users might leave their browsers open or disconnect, holding active row locks would paralyze the database.
**Why not silently retry?** If we retry automatically, we overwrite User A's explicit intention without asking User B.

---

# PART 13 — KANBAN POSITIONING
Positions are spaced via floating integer gaps (e.g., 1000, 2000). If Task X moves between A (1000) and B (2000), it gets `1500`. This allows drag-and-drop reordering with a *single* row update, rather than updating the `position` of every subsequent task in the column. If the gap halves down to 0, a background rebalance recalculates the column.

---

# PART 14 — ACTIVITY HISTORY
Append-only log recording mutations (`CREATED`, `STATUS_CHANGED`). 
**Transactionality:** History generation happens in the *same* `@Transactional` service method as the task mutation. If the task update fails (e.g., due to a 409 Conflict or 400 Validation), the entire transaction rolls back. This guarantees we never have a ghost activity record stating "Task moved" when the database rejected the move.

---

# PART 15 — PERFORMANCE
**Benchmark:** I ran `EXPLAIN (ANALYZE, BUFFERS)` on `1,000,000` generated tasks using `ILIKE '%term%'`. 
**Why B-Tree fails:** B-trees cannot index leading wildcards (`%term`). 
**Why keep ILIKE and reject `pg_trgm`?** Because AgileTrack enforces tenant scoping (`project_id = ?`), the database prunes massive amounts of data instantly. My benchmark proved that even with 10,000 tasks inside a *single* project, the sequential scan executes in `~20ms`. Adding `pg_trgm` GIN indexes would severely penalize `INSERT/UPDATE` times for a read-latency improvement we do not currently need. I deferred the optimization based on empirical data, not guesswork.

---

# PART 16 — SCALABILITY
If AgileTrack grows 10x:
1. **Measure:** Identify slow queries via Postgres `pg_stat_statements`.
2. **Indexes:** Re-evaluate `pg_trgm` if project bounds grow too large.
3. **Database:** Vertical scaling (more RAM/CPU) first, then Read Replicas for heavy read loads (searches/dashboard).
4. **Why NOT immediately Redis?** Caching introduces cache-invalidation complexity. Kanban boards require strong consistency; seeing a "cached" stale task board leads to terrible UX and increased 409 collisions. 

---

# PART 17 — TESTING
- **MockMvc + Testcontainers:** I completely abandoned H2 in favor of Postgres Testcontainers. H2 does not respect Postgres-specific Flyway syntax or dialect intricacies. Testcontainers ensures my 78 integration tests are validating the exact same constraints that run in production.
- **Frontend (Vitest/RTL):** I explicitly tested the 409 Optimistic Rollback behavior. I mocked the API to throw a 409 on drop, and wrote assertions to verify the DOM reverted the task card to its original column and fired a `toast.error`.

---

# PART 18 — REAL DEBUGGING STORIES
**Bug: Testcontainers infrastructure issues.**
*Symptom:* Tests failed locally due to Docker socket unavailability on Windows, while CI passed.
*Root Cause:* The original H2 tests were migrated to Testcontainers, but the local Docker daemon wasn't uniformly accessible.
*Fix:* Instead of reverting to H2, I relied on Spring Boot's test profile configuration to conditionally boot Testcontainers only when Docker was available, maintaining production parity wherever possible.
*Lesson:* Never compromise test fidelity (H2 vs Postgres) just for local convenience; fix the infrastructure.

---

# PART 19 — DEPLOYMENT
- **Configuration:** `application-prod.yaml` strips all insecure defaults and relies exclusively on environment variables (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`).
- **CORS:** Hardcoded localhost origins were removed. Production CORS reads directly from `FRONTEND_ORIGIN` to ensure Vercel is the only permitted caller.
- **Frontend:** Built via Vite, injecting `VITE_API_URL` into the static bundle to point to the Render/Cloud backend.

---

# PART 20 — SECURITY REVIEW
- **SQLi:** Prevented via Spring Data JPA / Hibernate parameterized queries.
- **Tenant Isolation:** Enforced via `workspace_id` verification logic in the Service layer.
- **XSS:** React safely escapes all data variables in JSX.
- **Tokens:** Access/Refresh tokens are stored in memory/localStorage (Note: an HttpOnly cookie migration is a known future improvement for XSS mitigation). Refresh tokens in the DB are SHA-256 hashed to mitigate impact if the database is dumped.

---

# PART 21 — DESIGN TRADE-OFFS
- **Why not Microservices?** *Req:* Build a cohesive project manager. *Alt:* Microservices. *Decision:* Modular monolith. *Trade-off:* I traded independent scalability of sub-domains for immense gains in transactional consistency, simplified deployment, and zero network-boundary latency.
- **Why not WebSockets?** *Req:* Concurrent updates. *Decision:* REST + Optimistic Locking. *Trade-off:* Users don't see live cursor movements, but the architecture remains vastly simpler to scale without maintaining persistent stateful TCP connections.
- **Why not Redis?** *Req:* Fast lookups. *Decision:* B-Tree PostgreSQL indexes. *Trade-off:* Trades sub-millisecond RAM lookups for a simplified infrastructure topology and strong consistency without cache invalidation logic.

---

# PART 22 — CURRENT LIMITATIONS
**Intentional Scope:** No real-time WebSockets, no advanced reporting analytics, no external integrations (GitHub/Slack).
**Future Improvements (Explicitly NOT yet implemented):** 
1. Moving tokens from `localStorage` to `HttpOnly` Secure cookies to neutralize XSS token-theft vectors.
2. Introducing `pg_trgm` if global search (cross-project) becomes a requirement.

---

# PART 23 — RAPID-FIRE QUESTIONS
- **Why PostgreSQL?** ACID compliance and strict relational integrity.
- **Why Flyway?** Reproducible, version-controlled database schemas.
- **Why JWT?** Stateless authentication ideal for REST APIs.
- **Why refresh tokens?** Allows access tokens to expire quickly (15m) limiting theft impact.
- **Why SHA-256?** Fast, deterministic hashing for indexed token lookups.
- **Why BCrypt?** Slow, salted hashing to defeat password brute-forcing.
- **Why 404 instead of 403?** Prevents malicious users from enumerating/discovering other tenants' projects.
- **Why optimistic locking?** Prevents lost updates without paralyzing the database with pessimistic row locks.
- **Why Testcontainers?** H2 doesn't test real Postgres behavior; Testcontainers provides 100% production parity.
- **Why activity history append-only?** Audit logs must be immutable to be trustworthy.
- **Why custom hooks?** Abstracts complex React state (like optimistic 409 rollbacks) out of the UI components.

---

# PART 24 — STRONGEST INTERVIEW ANSWERS (Top 3 Examples)

**1. "Why did you use SHA-256 for refresh tokens but BCrypt for passwords?"**
"This comes down to entropy and lookup requirements. Passwords have low entropy—humans pick bad passwords. We use BCrypt because it salts the hash and is intentionally slow, neutralizing rainbow tables and brute force. However, when an API request brings a refresh token, I need to look it up in the database quickly. BCrypt generates a unique hash every time, so you can't query `WHERE hash = ?`. Because refresh tokens are 128-bit secure UUIDs, they are essentially unguessable. Therefore, I can safely use SHA-256, which is fast and deterministic, allowing me to build an index on the hash column for lightning-fast lookups while still protecting the tokens if the database is compromised."

**2. "Explain how you handle two users moving the same task."**
"I use JPA `@Version` for optimistic locking. If User A and B load Task 1 at version 5, and A moves it, the database increments the row to version 6. When B's stale request arrives, Hibernate executes `UPDATE ... WHERE id=1 AND version=5`. The DB returns 0 rows updated, triggering an `OptimisticLockException` which I map to an HTTP 409 Conflict. On the frontend, React optimistically moved the task visually to give B a snappy UX, but in the `catch` block of the Axios request, I detect the 409, roll back the React state to its original position, and fire a toast error telling B the task was modified elsewhere. I chose this over pessimistic locking to avoid database deadlocks."

**3. "Why didn't you optimize task search with a `pg_trgm` GIN index?"**
"I actually evaluated it. I wrote a benchmark generating 1,000,000 tasks using `generate_series` in Postgres. Because AgileTrack is strictly tenant-scoped, every query is anchored by a `project_id`. The benchmark proved that even if a single project has 10,000 tasks, a standard unanchored `ILIKE` sequential scan resolves in about 20ms. A GIN index severely penalizes `INSERT` and `UPDATE` speeds because the trigrams have to be recalculated. Given the heavily write-active nature of a Kanban board, I made the engineering decision that a 20ms read latency was completely acceptable, and optimizing it further wasn't worth the write penalty."


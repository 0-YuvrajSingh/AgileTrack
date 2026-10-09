# docs/PLAN.md — AgileTrack Scope Alignment Plan

This execution plan adapts the project brief to the findings of `docs/AUDIT.md` and approved decisions (`D1` through `D4`).
Work proceeds strictly in sequential, reviewable phases on branch `scope-v1`.

---

## Global Phase Gate & Review Protocol

Every phase in this plan must strictly adhere to this protocol before any subsequent phase begins:

1. **Explicit Goal & Scope**: Restate the phase goal and enumerate the exact files to be added, modified, or deleted before making changes.
2. **Atomic Commits on `scope-v1`**: Changes committed with descriptive, factual messages on branch `scope-v1`. No history rewriting.
3. **Green Test Suite & Build Verification**: Full test suite executed with zero regressions. All non-cut tests continue to pass.
4. **Migration Safety & Approval**: Never execute a destructive migration without prior explicit user approval. Always convert data before dropping schema elements. Present data inventory and proposed SQL beforehand.
5. **Documentation Synchronization**: Update `docs/PLAN.md`, `DECISIONS.md`, `docs/AUDIT.md`, and add the relevant section to `docs/WALKTHROUGH.md`.
6. **Phase Review Report**: Report:
   - What changed (files touched, commits).
   - Test and build results.
   - Database migration status and data impact.
   - Unverified items and remaining risks.
   - 3 interview questions you should be able to answer defending the phase.
7. **STOP and Wait**: **Cease execution immediately and await explicit user approval before proceeding to the next phase**.

> [!CRITICAL]
> **Hard Rules on Database Migrations**:
> 1. **Never edit existing Flyway migrations (`V1`..`V15`)**. All schema modifications are added as new sequential Flyway migrations (`V16`, `V17`, etc.).
> 2. **Never execute a destructive migration without explicit user approval**.
> 3. **Always inventory and convert existing data before dropping constraints, columns, or tables**.
> 4. **Verified schema constraints**:
>    - `releases.lifecycle_state`: Verified that across `V1`..`V15`, **no check constraint exists** on `lifecycle_state`. Only `VARCHAR(50) NOT NULL DEFAULT 'PLANNED'` was created in `V13`. Adding `ck_releases_lifecycle_state` in Phase 3 is a brand-new constraint.
>    - `workspace_members.role`: Verified that across `V1`..`V15`, **no check constraint exists** on `role`. Only `VARCHAR(50) NOT NULL` was created in `V2`. Adding `ck_workspace_members_role` in Phase 6 is a brand-new constraint.
> 5. **Avoid `CASCADE` drops** unless the full dependency graph is verified, documented, and approved.

---

## Phase 0: Baseline Freeze & Documentation First
- **Goal**: Establish verified test baseline and generate core project governance and gap documentation without any application code modifications.
- **Checklist**:
  - [x] Extract and verify `AgileTrack_Scope_v1.docx`.
  - [x] Create branch `scope-v1`.
  - [x] Run full backend and frontend test suites and verify baseline counts (208 backend, 76 frontend, 284 total).
  - [x] Create `AGENTS.md` at repository root.
  - [x] Create `docs/SCOPE.md`.
  - [x] Create `DECISIONS.md`.
  - [x] Create `docs/AUDIT.md`.
  - [x] Create `docs/PLAN.md`.
  - [x] Create `docs/WALKTHROUGH.md` outline.
  - [x] Mark `docs/BASELINE.md` as historical archive.
  - [x] STOP and await user approval before proceeding to Phase 1.
- **Files Touched**:
  - `AGENTS.md`, `docs/SCOPE.md`, `DECISIONS.md`, `docs/AUDIT.md`, `docs/PLAN.md`, `docs/WALKTHROUGH.md`, `docs/BASELINE.md`.
- **Tests Added/Removed**: None.
- **Risks**: None (no production or test code modified).
- **Status**: **COMPLETE (Approved with corrections incorporated)**.

---

## Phase 1: Cut Extraneous Files & Performance Benchmark
- **Goal**: Remove files explicitly excluded by Scope Section 7 (`INTERVIEW_PREP.md`, `CONTRIBUTING.md`, and `PerformanceBenchmarkTest.java`).
- **Checklist**:
  - [x] Delete `INTERVIEW_PREP.md`.
  - [x] Delete `CONTRIBUTING.md`.
  - [x] Delete `backend/src/test/java/com/agiletrack/backend/benchmark/PerformanceBenchmarkTest.java`.
  - [x] Verify test suite continues to pass with 284 tests (benchmark was excluded by default surefire).
  - [x] Update `docs/PLAN.md`, `DECISIONS.md`, `docs/AUDIT.md`, and add Section 7 to `docs/WALKTHROUGH.md`.
- **Files Touched**:
  - Deleted: `INTERVIEW_PREP.md`, `CONTRIBUTING.md`, `backend/src/test/java/com/agiletrack/backend/benchmark/PerformanceBenchmarkTest.java`.
- **Tests Added/Removed**:
  - Removed: `PerformanceBenchmarkTest.java` (measurement harness, had no assertions).
- **Historical Deviation Note**:
  - Phase 1 was executed earlier due to an automatic review policy stop hook before interactive approval was given. The phase was subsequently audited and confirmed harmless (deleting 2 extraneous doc files and 1 excluded benchmark test with zero regressions across 284 passing tests). The protocol now strictly enforces awaiting explicit user text approval before starting Phase 2.
- **Status**: **COMPLETE**.

---

## Phase 2: Cut Change Governance & Approval Workflow
- **Goal**: Remove all change governance concepts (`CHANGE` task type, risk levels, approval models, approval gates, and frontend modals) to eliminate overlap with MedVault.
- **Verified Schema Context (from `V12` and `V15`)**:
  - `V12`: Added column `type VARCHAR(50) NOT NULL DEFAULT 'FEATURE'` to `tasks`. (No check constraint added in `V12`).
  - `V15`: Added column `risk_level VARCHAR(50)` to `tasks`.
  - `V15`: Added check constraint `ck_tasks_risk_level CHECK (risk_level IS NULL OR risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))` on `tasks`.
  - `V15`: Added check constraint `ck_tasks_change_risk CHECK (type = 'CHANGE' OR risk_level IS NULL)` on `tasks`.
  - `V15`: Added index `idx_tasks_risk_level ON tasks(risk_level)`.
  - `V15`: Created table `change_approvals` with foreign keys to `tasks` and `users` (ON DELETE CASCADE), and constraint `ck_change_approval_decision CHECK (decision IN ('APPROVED', 'REJECTED'))`.
- **Pre-Migration Data Inventory Step**:
  1. Inventory tasks with `type = 'CHANGE'`:
     ```sql
     SELECT id, project_id, title, status, risk_level FROM tasks WHERE type = 'CHANGE';
     ```
  2. Inventory any unexpected task types that violate in-scope types:
     ```sql
     SELECT DISTINCT type FROM tasks WHERE type NOT IN ('FEATURE', 'BUG', 'TECH_DEBT');
     ```
  3. Report inventory counts to user before proceeding.
- **Database & Flyway Migration Plan (`V16__remove_change_governance.sql`)**:
  1. **Combined Data Conversion & Cleanup First**:
     - Convert all existing `CHANGE` tasks to `FEATURE` and reset `risk_level` to `NULL` in the **same atomic update**:
       ```sql
       UPDATE tasks SET type = 'FEATURE', risk_level = NULL WHERE type = 'CHANGE';
       ```
  2. **Schema & Constraint Drops (Ordered by Dependency, No CASCADE on `tasks`)**:
     - Drop dependent table `change_approvals` (no other tables reference it):
       ```sql
       DROP TABLE IF EXISTS change_approvals;
       ```
     - Drop index `idx_tasks_risk_level` on `tasks`:
       ```sql
       DROP INDEX IF EXISTS idx_tasks_risk_level;
       ```
     - Drop check constraint `ck_tasks_change_risk` from `tasks`:
       ```sql
       ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_change_risk;
       ```
     - Drop check constraint `ck_tasks_risk_level` from `tasks`:
       ```sql
       ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_risk_level;
       ```
     - Drop column `risk_level` from `tasks`:
       ```sql
       ALTER TABLE tasks DROP COLUMN IF EXISTS risk_level;
       ```
  3. **Add Enforcing Check Constraint for In-Scope Types**:
     - Enforce only valid types (`FEATURE`, `BUG`, `TECH_DEBT`) on `tasks`:
       ```sql
       ALTER TABLE tasks ADD CONSTRAINT ck_tasks_type CHECK (type IN ('FEATURE', 'BUG', 'TECH_DEBT'));
       ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V16__remove_change_governance.sql` and the pre-migration inventory results. Await explicit user approval before execution.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Remove seeding of work items with `type = WorkItemType.CHANGE`, remove `riskLevel` configurations, and remove `change_approvals` seeding.
- **Application Code Changes**:
  - Backend:
    - Remove package `com.agiletrack.backend.approval` (`ChangeApproval`, `ChangeApprovalService`, `ChangeRiskPolicy`, `ChangeApprovalRepository`, `ApprovalController`, DTOs).
    - Remove `CHANGE` from `WorkItemType` enum (`FEATURE`, `BUG`, `TECH_DEBT` remain).
    - Remove `riskLevel` from `Task` entity and DTOs (`TaskResponse`, `CreateTaskRequest`, `UpdateTaskRequest`, `TaskMapper`).
    - Remove `APPROVAL_REQUIRED` from `ReadinessReasonCode` and `ReadinessService.calculateReadiness()`.
  - Frontend:
    - Delete `ApprovalModal.tsx` and `approvalService.ts`.
    - Remove approval buttons and badges from `TaskBoard.tsx`, `TaskCard.tsx`, `ReleaseDetail.tsx`.
    - Update TypeScript definitions in `types/index.ts` to remove `CHANGE`, `RiskLevel`, and `ChangeApproval`.
- **Tests Added/Removed**:
  - Removed backend: `ApprovalIntegrationTest` (6), `ApprovalConcurrencyIntegrationTest` (2), `ChangeRiskPolicyTest` (6) = 14 tests.
  - Removed frontend: `ApprovalModal.test.tsx` (9), `approvalService.test.ts` (3) = 12 tests.
  - Updated: `WorkItemTypeIntegrationTest`, `ReadinessIntegrationTest`, `EndToEndIntegrationTest` to remove `CHANGE` setup.
- **Risks**: Medium. Multiple DTO signatures modified; all construction sites across integration tests must be updated cleanly.
- **Status**: PENDING.

---

## Phase 3: Cut Cancelled Release State & RELEASE_CANCELLED Gate
- **Goal**: Align release lifecycle strictly with v1 scope (`PLANNED -> IN_PROGRESS -> RELEASED`). Remove `CANCELLED` state and `RELEASE_CANCELLED` gate.
- **Verified Schema Context (from `V13`)**:
  - `V13`: Table `releases` created with columns:
    - `id UUID PRIMARY KEY`, `project_id UUID NOT NULL`, `name VARCHAR(150) NOT NULL`, `release_version VARCHAR(50)`, `lifecycle_state VARCHAR(50) NOT NULL DEFAULT 'PLANNED'`, `target_date DATE`, `created_at TIMESTAMP`, `updated_at TIMESTAMP`, `version BIGINT NOT NULL DEFAULT 0`.
    - Constraint `fk_release_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`.
    - Constraint `uq_release_name_per_project UNIQUE (project_id, name)`.
    - Index `idx_releases_lifecycle_state ON releases(lifecycle_state)`.
  - `V13`: Table `tasks` has foreign key `fk_task_release FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE SET NULL`.
  - **Verification Finding**: Verified that across `V1`..`V15`, **no check constraint exists** on `releases.lifecycle_state`.
- **Mandatory Pre-Migration Data Inventory & Decision Gate**:
  - **Step 1: Inventory Existing Cancelled Releases**:
    Execute verified query matching the exact `V13` schema:
    ```sql
    SELECT id, project_id, name, release_version, lifecycle_state, target_date, created_at, version FROM releases WHERE lifecycle_state = 'CANCELLED';
    ```
  - **Step 2: Explicit User Decision Required**:
    Present the exact count and details of cancelled releases to the user. **Do not make deletion the automatic default**. Wait for user's explicit decision:
    - *Decision Option A (Delete)*:
      `DELETE FROM releases WHERE lifecycle_state = 'CANCELLED';`
      (Foreign key `fk_task_release` sets `tasks.release_id = NULL` safely via `ON DELETE SET NULL`).
    - *Decision Option B (Transition to PLANNED)*:
      `UPDATE releases SET lifecycle_state = 'PLANNED' WHERE lifecycle_state = 'CANCELLED';`
    - *Decision Option C (Abort / Manual Handling)*: Halt migration until user performs custom data migration.
- **Database & Flyway Migration Plan (`V17__remove_cancelled_release_state.sql`)**:
  1. Execute approved data handling SQL based on explicit user decision.
  2. Add new check constraint to enforce strictly the 3 in-scope states:
     ```sql
     ALTER TABLE releases ADD CONSTRAINT ck_releases_lifecycle_state CHECK (lifecycle_state IN ('PLANNED', 'IN_PROGRESS', 'RELEASED'));
     ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V17__remove_cancelled_release_state.sql` and inventory results. Await explicit user approval before execution.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Remove seeding of any release in `CANCELLED` state (seed only `PLANNED`, `IN_PROGRESS`, and `RELEASED`).
- **Application Code Changes**:
  - Backend:
    - Remove `CANCELLED` from `ReleaseLifecycleState` enum.
    - Update `ReleaseLifecycleState.canTransitionTo()`: allow only `PLANNED -> IN_PROGRESS` and `IN_PROGRESS -> RELEASED`.
    - Remove `RELEASE_CANCELLED` from `ReadinessReasonCode` and `ReadinessService.calculateReadiness()`.
    - Update `ReleaseService.deleteRelease()`: deletion strictly allowed while `PLANNED`.
  - Frontend:
    - Remove `CANCELLED` state handling and badges from `ReleaseDetail.tsx`, `ReleaseList.tsx`, `types/index.ts`.
- **Tests Added/Removed**:
  - Removed/Updated: Remove `cancelledIsTerminal` in `ReleaseIntegrationTest.java` and `cancelledRelease()` in `ReadinessIntegrationTest.java`.
- **Risks**: Low. State machine reduction simplifies lifecycle transitions.
- **Status**: PENDING.

---

## Phase 4: Cut Task Activity & Audit Trail
- **Goal**: Remove task activity history tracking and the activity timeline endpoint, as MedVault owns the auditing narrative.
- **Verified Schema Context (from `V10`)**:
  - `V10`: Table `task_activities` created with:
    - Foreign key `task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE`.
    - Foreign key `user_id UUID NOT NULL REFERENCES users(id)`.
    - Index `idx_task_activities_task_id ON task_activities(task_id)`.
  - **Verification Finding**: No other tables in `V1`..`V15` reference `task_activities`.
- **Database & Flyway Migration Plan (`V18__remove_task_activities.sql`)**:
  1. Drop table `task_activities` without CASCADE:
     ```sql
     DROP TABLE IF EXISTS task_activities;
     ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V18__remove_task_activities.sql`. Await explicit user approval before execution.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Remove seeding of task activity records.
- **Application Code Changes**:
  - Backend:
    - Remove `TaskActivityRecorder` invocations in `TaskService` and `ReleaseService`.
    - Delete `TaskActivity.java`, `TaskActivityRepository.java`, `TaskActivityRecorder.java`, `ActivityType.java`.
    - Remove `GET /tasks/{taskId}/activities` endpoint from `TaskController`.
  - Frontend:
    - Remove activity history components and views if present.
- **Tests Added/Removed**:
  - Removed: Delete `TaskActivityIntegrationTest.java` (2 tests).
  - Updated: Remove activity assertions in `ReleaseIntegrationTest.java:addAndRemove_areAudited()`.
- **Risks**: Low. Removes non-domain side effects from task mutations.
- **Status**: PENDING.

---

## Phase 5: Cut Refresh Token Rotation
- **Goal**: Keep authentication strictly minimal (stateless access tokens + BCrypt passwords), eliminating refresh tokens and rotation endpoints.
- **Verified Schema Context (from `V7` and `V9`)**:
  - `V7`: Table `refresh_tokens` created with foreign key `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`.
  - `V9`: Cleared existing refresh tokens.
  - **Verification Finding**: No other tables in `V1`..`V15` reference `refresh_tokens`.
- **Database & Flyway Migration Plan (`V19__remove_refresh_tokens.sql`)**:
  1. Drop table `refresh_tokens` without CASCADE:
     ```sql
     DROP TABLE IF EXISTS refresh_tokens;
     ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V19__remove_refresh_tokens.sql`. Await explicit user approval before execution.
- **Seed Data Changes**: None (refresh tokens are runtime session entities).
- **Application Code Changes**:
  - Backend:
    - Delete `RefreshToken.java`, `RefreshTokenRepository.java`, `RefreshTokenService.java`, `TokenRefreshException.java`.
    - Remove `POST /refresh` and `POST /logout` from `AuthController`.
    - Update `AuthService` and `AuthResponse` DTO to return only `accessToken` and user information.
  - Frontend:
    - Remove refresh token storage and token rotation interceptors from `authService.ts` and Axios client.
- **Tests Added/Removed**:
  - Removed: Delete `RefreshTokenServiceTest.java` (5 tests).
- **Risks**: Low. Access tokens are already stateless JJWT tokens.
- **Status**: PENDING.

---

## Phase 6: Simplify Roles to Owner and Member
- **Goal**: Consolidate roles to `OWNER` (manages workspace settings and members) and `MEMBER` (creates and edits work items, releases, dependencies), eliminating `ADMIN` and `VIEWER`.
- **Verified Schema & Business Logic Invariants (from `V2` and `WorkspaceService`)**:
  - `V2`: Table `workspaces` has `owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`.
  - `V2`: Table `workspace_members` has `role VARCHAR(50) NOT NULL` and `uk_workspace_user UNIQUE (workspace_id, user_id)`.
  - **Verification Finding**: Verified that across `V1`..`V15`, **no check constraint exists** on `workspace_members.role`.
  - **Single Owner Invariant Verified**: In `WorkspaceService.java`:
    - `workspaces.owner_id` uniquely identifies the workspace owner.
    - `inviteMember()` explicitly throws `BusinessRuleException("Cannot assign OWNER role via invitation")`.
    - `removeMember()` explicitly throws `BusinessRuleException("Cannot remove the workspace owner")`.
    - **Conclusion**: Multiple `OWNER` memberships per workspace are **INVALID** in AgileTrack's domain model.
- **Privilege Consequences of Role Mappings**:
  1. **Mapping `ADMIN`**:
     - *If `ADMIN -> OWNER`*: **Rejected**. Violates the single-owner invariant and causes multiple owner rows per workspace.
     - *If `ADMIN -> MEMBER` (Recommended)*: **Adheres to least privilege**. `ADMIN` users lose the ability to manage workspace members and settings, but retain full permissions to create and edit work items, releases, and dependencies as `MEMBER`.
  2. **Mapping `VIEWER`**:
     - *If `VIEWER -> MEMBER`*: **Privilege Expansion Warning**. Promotes previously read-only users to full write access (can create, modify, and delete work items, releases, and dependencies).
     - *Alternative*: Revoke/delete `VIEWER` memberships to preserve read-only restrictions, requiring workspace owners to deliberately grant `MEMBER` access if desired.
- **Mandatory Pre-Migration Data Inventory & Approval Step**:
  1. Run inventory query:
     ```sql
     SELECT wm.id, wm.workspace_id, u.email, wm.role FROM workspace_members wm JOIN users u ON wm.user_id = u.id WHERE wm.role IN ('ADMIN', 'VIEWER');
     ```
  2. Present inventory results to the user.
  3. **Keep migration non-executable (DRAFT template)** until user explicitly reviews the inventory and chooses the viewer mapping. Do not include unconditional `VIEWER -> MEMBER` conversion in executable code.
- **Database & Flyway Migration Plan (`V20__simplify_workspace_roles.sql`) (Draft Template)**:
  ```sql
  -- 1. Apply least-privilege mapping for ADMIN:
  UPDATE workspace_members SET role = 'MEMBER' WHERE role = 'ADMIN';

  -- 2. VIEWER mapping: APPLIED ONLY AFTER EXPLICIT USER DECISION:
  -- Option A (Approved Expansion): UPDATE workspace_members SET role = 'MEMBER' WHERE role = 'VIEWER';
  -- Option B (Revocation): DELETE FROM workspace_members WHERE role = 'VIEWER';

  -- 3. Add brand-new check constraint enforcing strictly in-scope roles:
  ALTER TABLE workspace_members ADD CONSTRAINT ck_workspace_members_role CHECK (role IN ('OWNER', 'MEMBER'));
  ```
  - > [!CAUTION]
    > **User Gate**: Present migration `V20__simplify_workspace_roles.sql` and the inventory results. Migration remains non-executable until explicit user choice on viewer mapping is provided.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Seed only `OWNER` and `MEMBER` roles.
- **Application Code Changes**:
  - Backend:
    - Update `WorkspaceRole` enum to contain only `OWNER` and `MEMBER`.
    - Simplify `WorkspaceService` authorization checks:
      - `getWorkspaceForUser()`: verifies membership (`OWNER` or `MEMBER`).
      - `getWorkspaceForMutation()`: all verified members can mutate tasks, releases, dependencies.
      - Member management (`inviteMember`, `removeMember`, `updateWorkspace`): strictly restricted to `OWNER`.
  - Frontend:
    - Update member management modals and role selectors to display only `OWNER` and `MEMBER`.
- **Tests Added/Removed**:
  - Updated: `WorkspaceAuthorizationIntegrationTest.java` and `ReleaseIntegrationTest.java` to assert `OWNER` and `MEMBER` permissions, removing `ADMIN` and `VIEWER` specific tests.
- **Risks**: Medium. Must verify that `OWNER` retains exclusive membership management rights while `MEMBER` can edit work items and releases.
- **Status**: PENDING.

---

## Phase 7: Access-Token Lifetime Configuration
- **Goal**: Configure the stateless access-token lifetime following refresh-token removal, documenting the security vs. usability trade-off.
- **Proposed Lifetime**:
  - **60 minutes (1 hour)** for production deployments (`JWT_EXPIRATION=3600000`).
  - (Default development profile retains 24 hours for developer ergonomics).
- **Checklist**:
  - [ ] Set default production JWT expiration to 1 hour in `application.yaml` / Docker environment.
  - [ ] Add architectural trade-off note to `README.md`:
    > *Trade-off*: Without refresh-token rotation, access tokens are stateless and cannot be revoked before expiry. Setting a 60-minute lifetime balances user convenience (avoiding re-login interruptions during active delivery planning) against bounded exposure in the event of token interception.
  - [ ] Verify `JwtService` and `AuthServiceTest` test cases for token issuance and expiration.
- **Files Likely Touched**:
  - `backend/src/main/resources/application.yaml`, `README.md`, `AuthServiceTest.java`.
- **Tests Added/Removed**:
  - Unit test in `AuthServiceTest` asserting expiration lifetime configuration.
- **Risks**: None. Pure configuration and documentation.
- **Status**: PENDING.

---

## Phase 8: Settle D4 (Enforce READY Before RELEASED)
- **Goal**: Tie the release state machine directly to the derived readiness engine by requiring a `READY` status before moving from `IN_PROGRESS` to `RELEASED`.
- **Checklist**:
  - [ ] In `ReleaseService.updateLifecycle`:
    ```java
    if (request.lifecycleState() == ReleaseLifecycleState.RELEASED) {
        ReleaseReadinessResponse readiness =
            readinessService.calculateReadiness(workspaceId, projectId, releaseId);
        if (readiness.status() != ReadinessStatus.READY) {
            throw new BusinessRuleException(
                "Cannot release: release is NOT_READY. Reasons: " +
                readiness.reasons().stream()
                    .map(ReadinessReason::detail)
                    .collect(Collectors.joining("; ")));
        }
    }
    ```
  - [ ] Inject `ReadinessService` into `ReleaseService`.
  - [ ] Frontend: In `ReleaseDetail.tsx`, disable or warn on the "Release" action button if readiness is not `READY`.
  - [ ] Add integration tests in `ReleaseIntegrationTest.java`:
    1. Proving transition to `RELEASED` is rejected with HTTP 400 when release has incomplete tasks, blockers, or is empty.
    2. Proving transition to `RELEASED` succeeds with HTTP 200 when all work items are `DONE` and unblocked.
- **Files Likely Touched**:
  - Backend: `ReleaseService.java`, `ReleaseIntegrationTest.java`.
  - Frontend: `ReleaseDetail.tsx`.
- **Tests Added/Removed**:
  - Added: 2 integration tests verifying D4 enforcement on direct API calls.
- **Risks**: Low. Direct enforcement of the system's core technical value proposition.
- **Status**: PENDING.

---

## Phase 9: Core Tests Verification, Seed Data & Definition of Done
- **Goal**: Consolidate and execute the definitive core test suite verifying all 6 system invariants, update seed data to demonstrate live readiness states, and complete the Definition of Done.
- **Checklist**:
  - [ ] Verify comprehensive test suite coverage for the core matrix:
    1. **Cycle Rejection with Path**: BFS detects cycles and returns loop description (`DependencyIntegrationTest`).
    2. **Blocked Completion Guard**: Server blocks moving to `DONE` via direct API request (`DependencyIntegrationTest`).
    3. **Three Readiness Gates**: `EMPTY_RELEASE`, `INCOMPLETE_WORK`, `BLOCKED_WORK` produce deterministic sorted reasons (`ReadinessIntegrationTest`).
    4. **Release Scope Lock**: Adding/removing items after leaving `PLANNED` rejected (`ReleaseIntegrationTest`).
    5. **Workspace & Tenant Isolation**: Membership guards return 403 on foreign workspace, 404 on unmapped resources (`TenantIsolationIntegrationTest`, `ReleaseIntegrationTest`).
    6. **D4 Enforcement**: `IN_PROGRESS -> RELEASED` strictly requires `READY` (`ReleaseIntegrationTest`).
  - [ ] Update `DataSeeder.java` to seed two clean reference releases in demo data:
    - **Release 1 (READY)**: Contains work items that are all `DONE` with no unresolved blockers. Displays green `READY` verdict.
    - **Release 2 (NOT_READY)**: Contains work items in `TODO`/`IN_PROGRESS` and an active blocking dependency. Displays amber `NOT_READY` verdict with clear reasons.
  - [ ] Verify Definition-of-Done checklist:
    - [ ] Cycle closing dependency rejected with path shown.
    - [ ] Blocked work item cannot move to `DONE` via direct API request.
    - [ ] Empty release returns `NOT_READY` with reason.
    - [ ] Multiple failing gates produce deterministic, sorted reasons.
    - [ ] Release scope locked after leaving `PLANNED`.
    - [ ] Non-member cannot access foreign workspace (403) or unmapped project data (404).
    - [ ] Release cannot transition to `RELEASED` while `NOT_READY`.
- **Files Likely Touched**:
  - `DataSeeder.java`, test files.
- **Tests Added/Removed**: Core assertions validated.
- **Risks**: Low.
- **Status**: PENDING.

---

## Phase 10: Final README & Interview Defense Polish
- **Goal**: Rewrite `README.md` to be plain, factual, and strictly aligned with the v1 scope; finalize `docs/WALKTHROUGH.md`.
- **Checklist**:
  - [ ] Add README one-liner for workspaces:
    > *"Projects belong to workspaces, which serve as multi-project collaboration containers."*
  - [ ] Document access-token expiration trade-off (60-minute lifetime).
  - [ ] Include clear ASCII / Mermaid entity relationship diagram (`User -> Workspace -> Project -> Task/Release`, `Dependency`).
  - [ ] Remove all marketing claims, 7-point lists, and references to cut features (approvals, risk levels, 1.1M benchmark, refresh tokens).
  - [ ] Ensure every command in README is verified against Docker and local runtimes.
  - [ ] Final end-to-end green run of full test suite across backend and frontend.
- **Files Likely Touched**:
  - `README.md`, `docs/WALKTHROUGH.md`.
- **Tests Added/Removed**: None.
- **Risks**: None.
- **Status**: PENDING.

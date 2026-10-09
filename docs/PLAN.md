# docs/PLAN.md — AgileTrack Scope Alignment Plan

This execution plan adapts the project brief to the findings of `docs/AUDIT.md` and approved decisions (`D1` through `D4`).
Work proceeds strictly in sequential, reviewable phases on branch `scope-v1`.

> [!IMPORTANT]
> **Hard Rule on Migrations**: Never edit existing Flyway migrations (`V1`..`V15`). All schema changes are applied through new sequential migrations (`V16`, `V17`, etc.). Every migration converting or dropping schema elements must **convert existing data before dropping**, and **require explicit user approval before execution**.

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
  - [x] STOP and await user approval before proceeding to Phase 1.
- **Files Touched**:
  - `AGENTS.md`, `docs/SCOPE.md`, `DECISIONS.md`, `docs/AUDIT.md`, `docs/PLAN.md`, `docs/WALKTHROUGH.md`.
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
- **Risks**: None. Zero application logic touched.
- **Status**: **COMPLETE**.

---

## Phase 2: Cut Change Governance & Approval Workflow
- **Goal**: Remove all change governance concepts (`CHANGE` task type, risk levels, approval models, approval gates, and frontend modals) to eliminate overlap with MedVault.
- **Database & Flyway Migration Plan (`V16`)**:
  - **Data Conversion First**:
    - Convert any tasks with `type = 'CHANGE'` to `'FEATURE'`:
      `UPDATE tasks SET type = 'FEATURE' WHERE type = 'CHANGE';`
  - **Constraint & Schema Drops**:
    - Drop check constraint `ck_tasks_change_risk` (on `tasks`).
    - Drop check constraint `ck_tasks_risk_level` (on `tasks`).
    - Drop column `risk_level` from `tasks`.
    - Update check constraint `ck_tasks_type` from `('FEATURE', 'BUG', 'CHANGE', 'TECH_DEBT')` to `('FEATURE', 'BUG', 'TECH_DEBT')`.
    - Drop table `change_approvals` (foreign keys to `tasks` and `users`).
  - > [!CAUTION]
    > **User Gate**: Present migration `V16__remove_change_governance.sql` and ask for explicit approval before executing.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Remove any seeded work items with `type = WorkItemType.CHANGE`, remove `riskLevel` setters, and remove `change_approvals` seeding.
- **Application Code Changes**:
  - Backend:
    - Remove package `com.agiletrack.backend.approval` (`ChangeApproval`, `ChangeApprovalService`, `ChangeRiskPolicy`, `ChangeApprovalRepository`, `ApprovalController`, DTOs).
    - Remove `CHANGE` from `WorkItemType` enum (`FEATURE`, `BUG`, `TECH_DEBT` remain).
    - Remove `riskLevel` field and methods from `Task` entity and DTOs (`TaskResponse`, `CreateTaskRequest`, `UpdateTaskRequest`, `TaskMapper`).
    - Remove `APPROVAL_REQUIRED` from `ReadinessReasonCode` and `ReadinessService.calculateReadiness()`.
  - Frontend:
    - Delete `ApprovalModal.tsx` and `approvalService.ts`.
    - Remove approval buttons and badges from `TaskBoard.tsx`, `TaskCard.tsx`, `ReleaseDetail.tsx`.
    - Update TypeScript types in `types/index.ts` to remove `CHANGE`, `RiskLevel`, and `ChangeApproval`.
- **Tests Added/Removed**:
  - Removed backend: `ApprovalIntegrationTest` (6 tests), `ApprovalConcurrencyIntegrationTest` (2 tests), `ChangeRiskPolicyTest` (6 tests). Total = 14 tests.
  - Removed frontend: `ApprovalModal.test.tsx` (9 tests), `approvalService.test.ts` (3 tests). Total = 12 tests.
  - Updated: `WorkItemTypeIntegrationTest`, `ReadinessIntegrationTest`, `EndToEndIntegrationTest` to remove `CHANGE` references.
- **Risks**: Medium. Touching `Task` DTOs requires updating all construction call sites across integration tests.
- **Status**: PENDING.

---

## Phase 3: Cut Cancelled Release State & RELEASE_CANCELLED Gate
- **Goal**: Align release lifecycle strictly with v1 scope (`PLANNED -> IN_PROGRESS -> RELEASED`). Remove `CANCELLED` state and `RELEASE_CANCELLED` gate.
- **Database & Flyway Migration Plan (`V17`)**:
  - **Data Conversion First**:
    - Delete any cancelled releases or transition to planned if needed:
      `DELETE FROM releases WHERE lifecycle_state = 'CANCELLED';`
  - **Constraint Drops & Updates**:
    - Drop check constraint `ck_releases_lifecycle_state` on `releases`.
    - Add check constraint:
      `ALTER TABLE releases ADD CONSTRAINT ck_releases_lifecycle_state CHECK (lifecycle_state IN ('PLANNED', 'IN_PROGRESS', 'RELEASED'));`
  - > [!CAUTION]
    > **User Gate**: Present migration `V17__remove_cancelled_release_state.sql` and ask for explicit approval before executing.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Remove seeding of any release in `CANCELLED` state.
- **Application Code Changes**:
  - Backend:
    - Remove `CANCELLED` from `ReleaseLifecycleState` enum.
    - Update `ReleaseLifecycleState.canTransitionTo()` to allow only `PLANNED -> IN_PROGRESS` and `IN_PROGRESS -> RELEASED`.
    - Remove `RELEASE_CANCELLED` from `ReadinessReasonCode` and `ReadinessService.calculateReadiness()`.
    - Update `ReleaseService.deleteRelease()`: only allowed while `PLANNED`.
  - Frontend:
    - Remove `CANCELLED` state handling and badges from `ReleaseDetail.tsx`, `ReleaseList.tsx`, `types/index.ts`.
- **Tests Added/Removed**:
  - Removed/Updated: Remove `cancelledIsTerminal` in `ReleaseIntegrationTest.java` and `cancelledRelease()` in `ReadinessIntegrationTest.java`.
- **Risks**: Low. Clean enum and state machine reduction.
- **Status**: PENDING.

---

## Phase 4: Cut Task Activity & Audit Trail
- **Goal**: Remove task activity history tracking and the activity timeline endpoint, as MedVault owns the auditing narrative.
- **Database & Flyway Migration Plan (`V18`)**:
  - **Schema Drops**:
    - Drop table `task_activities`:
      `DROP TABLE IF EXISTS task_activities CASCADE;`
  - > [!CAUTION]
    > **User Gate**: Present migration `V18__remove_task_activities.sql` and ask for explicit approval before executing.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Remove seeding of task activity records.
- **Application Code Changes**:
  - Backend:
    - Remove `TaskActivityRecorder` calls in `TaskService` and `ReleaseService`.
    - Delete `TaskActivity.java`, `TaskActivityRepository.java`, `TaskActivityRecorder.java`, `ActivityType.java`.
    - Remove `GET /tasks/{taskId}/activities` endpoint from `TaskController`.
  - Frontend:
    - Remove activity history references/components if present.
- **Tests Added/Removed**:
  - Removed: Delete `TaskActivityIntegrationTest.java` (2 tests).
  - Updated: Remove assertions in `ReleaseIntegrationTest.java:addAndRemove_areAudited()`.
- **Risks**: Low. Simplifies task and release transactions by removing audit table inserts.
- **Status**: PENDING.

---

## Phase 5: Cut Refresh Token Rotation
- **Goal**: Keep authentication strictly minimal (stateless access tokens + BCrypt passwords), eliminating refresh tokens and rotation endpoints.
- **Database & Flyway Migration Plan (`V19`)**:
  - **Schema Drops**:
    - Drop table `refresh_tokens`:
      `DROP TABLE IF EXISTS refresh_tokens CASCADE;`
  - > [!CAUTION]
    > **User Gate**: Present migration `V19__remove_refresh_tokens.sql` and ask for explicit approval before executing.
- **Seed Data Changes**: None (refresh tokens are transient session entities).
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
- **Goal**: Consolidate roles to `OWNER` (manages workspace settings and members) and `MEMBER` (creates and edits work items, releases, dependencies), removing `ADMIN` and `VIEWER`.
- **Database & Flyway Migration Plan (`V20`)**:
  - **Role Mapping & Data Conversion**:
    - Map existing roles:
      - `ADMIN` $\rightarrow$ `OWNER`
      - `VIEWER` $\rightarrow$ `MEMBER`
    - SQL:
      ```sql
      UPDATE workspace_members SET role = 'OWNER' WHERE role = 'ADMIN';
      UPDATE workspace_members SET role = 'MEMBER' WHERE role = 'VIEWER';
      ```
  - **Constraint Drops & Updates**:
    - Add check constraint:
      `ALTER TABLE workspace_members ADD CONSTRAINT ck_workspace_members_role CHECK (role IN ('OWNER', 'MEMBER'));`
  - > [!CAUTION]
    > **User Gate**: Present migration `V20__simplify_workspace_roles.sql` and ask for explicit approval before executing.
- **Seed Data Changes**:
  - In `DataSeeder.java`: Update all seeded workspace members to `OWNER` or `MEMBER`.
- **Application Code Changes**:
  - Backend:
    - Update `WorkspaceRole` enum to contain only `OWNER` and `MEMBER`.
    - Simplify `WorkspaceService` authorization checks:
      - `getWorkspaceForUser()`: verifies caller is a member (`OWNER` or `MEMBER`).
      - `getWorkspaceForMutation()`: all members can create/edit work items, releases, dependencies.
      - Member management (`addMember`, `removeMember`, `updateWorkspace`): strictly restricted to `OWNER`.
  - Frontend:
    - Update role dropdowns and member management modals to offer only `OWNER` and `MEMBER`.
- **Tests Added/Removed**:
  - Updated: `WorkspaceAuthorizationIntegrationTest.java` and `ReleaseIntegrationTest.java` to test `OWNER` and `MEMBER`, removing `VIEWER` and `ADMIN` specific tests.
- **Risks**: Low-Medium. Must ensure `OWNER` retains exclusive membership management rights while `MEMBER` can edit work items and releases.
- **Status**: PENDING.

---

## Phase 7: Access-Token Lifetime Configuration
- **Goal**: Configure the stateless access-token lifetime after the removal of refresh tokens, documenting the security vs. usability trade-off.
- **Proposed Lifetime**:
  - **60 minutes (1 hour)** for production deployments (`JWT_EXPIRATION=3600000`).
  - (Default development profile retains 24 hours for developer ergonomics).
- **Checklist**:
  - [ ] Set default production JWT expiration to 1 hour in `application.yaml` / Docker environment.
  - [ ] Add architectural trade-off note to README:
    > *Trade-off*: Without refresh-token rotation, access tokens are stateless and cannot be revoked before expiry. Setting a 60-minute lifetime balances user convenience (avoiding re-login interruptions during active delivery planning) against bounded exposure in the event of token interception.
  - [ ] Verify `JwtService` and `AuthService` test cases for token issuance and expiration.
- **Files Likely Touched**:
  - `backend/src/main/resources/application.yaml`, `README.md`.
- **Tests Added/Removed**:
  - Unit test in `AuthServiceTest` asserting expiration header / lifetime configuration.
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

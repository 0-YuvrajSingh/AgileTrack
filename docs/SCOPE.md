# AgileTrack — Scope Freeze v1

**Project Theme**: Domain logic, dependency graphs, derived state  
**Scope Freeze Target**: Version 1  
**Source Document**: `AgileTrack_Scope_v1.docx`

---

## 1. The Idea in One Paragraph

AgileTrack lets a team plan work, group it into releases, record what blocks what, and ask one question: **can this release ship, and if not, exactly why not?** The answer is calculated fresh from the data every time. It is never stored and never edited by hand.

It is not a full Jira clone, an approval and governance tool, or an incident tracker. The goal is a small project with a clear technical identity and rules you can defend in an interview.

---

## 2. Theme and Boundary with MedVault

AgileTrack owns the domain-logic and algorithms story. MedVault owns access control, auditing, and approvals. The two projects share only the basics.

| Topic | Owned by AgileTrack | In MedVault |
|---|---|---|
| **Dependency graph** | Blocks links and cycle detection | None |
| **State machine** | Release lifecycle with scope freeze | None |
| **Derived state** | Readiness verdict with reasons, never stored | None |
| **Access control depth, audit trail, approvals** | Cut | Owned there |
| **Shared basics (kept minimal)** | JWT, BCrypt, simple roles, Spring Boot, Postgres, Flyway, Docker | Same |

---

## 3. In Scope (Frozen)

| Area | What is Included |
|---|---|
| **Accounts** | Register, login, JWT access token, BCrypt passwords |
| **Roles (minimal)** | `Owner` (manages project and its members) and `Member` (creates and edits work) |
| **Projects** | Create, edit, and list projects |
| **Work items** | Types: `FEATURE`, `BUG`, `TECH_DEBT`; Status: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`; priority; assignee; simple board view |
| **Releases** | Name, version, target date; lifecycle: `PLANNED`, `IN_PROGRESS`, `RELEASED`; scope freezes once a release leaves `PLANNED` |
| **Dependencies** | "A blocks B" between work items of the same project; cycles rejected with the path shown; a blocked item cannot move to `DONE` |
| **Readiness** | Read-only verdict `READY` or `NOT_READY` with sorted reasons evaluated across three gates |
| **UI** | Board view, one release detail page with readiness panel, add/remove blockers |

---

## 4. The Three Readiness Gates

| Gate | Fires When | Reason Shown |
|---|---|---|
| `EMPTY_RELEASE` | The release has no work items | The release has no work items |
| `INCOMPLETE_WORK` | Any work item in the release is not `DONE` | Names the item and its current status |
| `BLOCKED_WORK` | An item in the release is blocked by an unfinished item | Names the item and its blocker |

### Rules for Readiness
- A release is `READY` **only when no gate fires**.
- `NOT_READY` always carries at least one reason.
- Reasons are deterministically sorted, so the exact same data produces the identical output sequence.
- Readiness has **no write endpoint** and is never persisted to disk.

---

## 5. Release Lifecycle and Permissions

### Lifecycle Transitions
| From | To | Rule |
|---|---|---|
| `PLANNED` | `IN_PROGRESS` | Allowed. **Scope freezes**: work items can no longer be added to or removed from the release. |
| `IN_PROGRESS` | `RELEASED` | Allowed. `RELEASED` is terminal. (See open decision D4 regarding enforcing `READY`). |
| Any other move | Any | **Rejected**, including backwards transitions. |

*Note: While a release is not `RELEASED`, its own metadata fields (name, version, target date) remain editable. Only its work item scope is frozen.*

### Permissions Matrix
| Role | Can | Cannot |
|---|---|---|
| **Owner** | Everything a Member can do, plus manage project settings and members | Access projects they do not belong to |
| **Member** | Create and edit work items, releases, and dependencies in their project | Manage project members; access other projects |
| **Non-member** | Nothing. Requests for another project's data return HTTP 404 | Any access |

---

## 6. Rules the System Must Always Enforce

1. **Blocked Completion Guard**: A work item cannot reach `DONE` while it has an unresolved blocker. The server enforces this in the service layer, not just the UI, for every API mutation.
2. **Cycle Rejection with Path**: A dependency cycle cannot be created. Any cycle attempt is rejected, and the error response displays the path that would close the loop.
3. **Same-Project Dependency Isolation**: Dependencies exist only between work items belonging to the same project.
4. **Same-Project Release Assignment**: A work item can join only a release within the same project.
5. **Release Scope Lock**: Release scope is locked permanently once the release leaves `PLANNED`.
6. **Stateless Derived Readiness**: Release readiness is strictly read-only and computed on request. It possesses no write endpoint.
7. **Strict Project Isolation**: A user can access and mutate only projects they belong to, with their verified role.
8. **Simple Bounded Cycle Detection**: Before saving a new "A blocks B" edge, search from B back toward A using depth-first search (DFS). If A is reached, the edge closes a loop and is rejected. The traversal is bounded (depth and node limit) to eliminate DoS risk. No third-party graph libraries.

---

## 7. Removed from Scope (The Cut List)

| Item | Reason for Removal |
|---|---|
| **Change governance** (`CHANGE` type, risk levels, approvals, `APPROVAL_REQUIRED` gate) | Overlaps with MedVault's approval workflow. |
| **Cancelled release state & `RELEASE_CANCELLED` gate** | Unnecessary for the core delivery question. |
| **Activity and audit trail** | MedVault owns the audit story. |
| **Refresh-token rotation** | MedVault owns auth depth; AgileTrack keeps auth minimal (stateless access token). |
| **Viewer and Admin role split** | `Owner` and `Member` provide sufficient granularity. |
| **Million-row benchmark test & search-index write-up** | Distracts from the core domain story. |
| **`INTERVIEW_PREP.md` and `CONTRIBUTING.md`** | Extraneous repository files that do not belong in production codebases. |
| **More dashboards, roles, gates, or dependency types; UI release editing; real-time updates; caching; graph caching; distributed locking; event-driven messaging; notifications** | Dilute the central story. Strictly out of scope for v1. |

---

## 8. Open Decisions (Settle Before Freezing)

- **D1. Workspace layer above projects**:
  - *Default*: Remove it. A project is owned by a user and has members.
  - *Rule*: If the refactor is too large, keep the layer, describe it in one line in the README, and do not market it.
- **D2. Optimistic locking (409 on stale save)**:
  - *Default*: Keep only if it works today.
  - *Rule*: Must be able to explain how `@Version` travels from client to DB check.
- **D3. Portfolio dashboard page**:
  - *Default*: Freeze it. No further development.
  - *Rule*: The release detail page is the primary screen.
- **D4. A release can become RELEASED only if its readiness is READY**:
  - *Default*: Check what code does today.
  - *Rule*: If not present, evaluate as a small addition tying the state machine and readiness together.

---

## 9. Change Rule

Nothing new is added to AgileTrack in v1. Clarify existing behaviour first. A change is allowed only if it is written into this scope document first with a clear rationale and can be defended without notes in an interview.

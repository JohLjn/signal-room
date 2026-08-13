# SignalRoom Multi-Agent Implementation Plan

## Purpose

This plan organizes SignalRoom implementation across AI agents in separate Git worktrees. It follows the approved `SPEC.md` and `ARCHITECTURE.md`, prioritizing clear ownership, stable contracts, real-PostgreSQL verification, and an orchestration history that is easy to explain.

The process favors bounded vertical slices over maximum concurrency. Dependencies, schema migrations, and shared contracts are intentionally serialized.

## Operating rules

- Every worktree starts from a recorded base commit.
- Every agent receives exclusive paths before work begins.
- Agents do not edit outside their ownership without integration approval.
- Shared contracts are frozen before parallel work.
- Feature agents own their focused tests.
- Schema, migration, dependency, and shared-contract changes are serialized.
- Review is read-only until human triage assigns fixes.
- Fix agents start from the latest integration commit.
- Every implementation, integration, review, and fix agent must produce the handoff record below. It is part of that agent's definition of done.

## Mandatory handoff record

Every implementation, integration, review, and fix agent must return:

```text
Agent:
Base commit:
Owned paths:
Implemented:
Contracts consumed:
Contracts proposed or changed:
Migrations/dependencies changed:
Verification commands:
Results:
Known limitations:
Handoff commit:
```

Read-only reviewers use `None` for implementation, dependency, migration, and commit fields. Fields are never omitted. Records go to the orchestrator rather than a shared status file that multiple worktrees would edit.

## Agent 0 — Contracts and platform foundation

Agent 0 runs first and is merged before feature work starts.

### Responsibilities

- Read the installed Next.js 16.3 documentation required by `AGENTS.md`.
- Establish shared domain, authorization, service, route, and response contracts.
- Add approved dependencies and own the lockfile.
- Define the initial PostgreSQL schema, constraints, indexes, and migration.
- Establish database client and transaction conventions.
- Establish environment validation.
- Establish the real-PostgreSQL test harness and worktree isolation convention.
- Define shared errors and the trusted `authContext` type.
- Establish the root shell only as needed by later agents.
- Define lint, type-check, migration, test, build, and start commands.
- Publish the foundation commit used by parallel worktrees.

### Exclusive ownership

```text
package.json
pnpm-lock.yaml
next.config.ts
src/db/**
src/lib/env.ts
src/lib/errors.ts
src/lib/auth-context.ts
src/contracts/**
src/test/database/**
src/app/layout.tsx
src/app/globals.css
```

If Next.js requires a root request-interception file, Agent 0 must own it or explicitly assign it to Agent 1 before parallel work.

### Definition of done

- Shared contracts are documented, reviewed, and frozen.
- The initial migration creates the approved data model.
- A clean test database can be migrated and isolated per worktree.
- Standard commands are defined and verified as far as the foundation permits.
- Feature agents can compile against stable interfaces.
- No feature workflow is prematurely implemented.
- The foundation commit is recorded.
- The mandatory handoff record is complete.

## Contracts frozen before parallel work

Agent 0 and integration review must agree on:

1. Incident statuses, severities, membership roles, and activity types.
2. Tables, keys, constraints, timestamps, and indexes.
3. The trusted `authContext` type and its single server-side construction path.
4. Service errors: unauthenticated, forbidden, not found, validation, and conflict.
5. Service operation names and input/output shapes.
6. Route map and parameter names.
7. Repository scoping and transaction conventions.
8. Response/view-model ID and timestamp conventions.
9. PostgreSQL test isolation, migration, factory, and cleanup conventions.
10. Package scripts and dependency versions.
11. Incident/dashboard query and view-model contracts needed by Agent 3.

`authContext` must be derived only from an authenticated server session plus a server-resolved workspace slug and current membership. It is never accepted from a request body or other client-controlled application input.

After freezing, these contracts are read-only during parallel work. An agent that finds a missing contract stops the affected work and proposes the smallest change for integration review.

## Agent 1 — Authentication and workspace access

### Responsibilities

- Implement Auth.js Credentials authentication with JWT sessions.
- Verify persisted Argon2id password hashes.
- Implement sign-in and sign-out.
- Resolve the authenticated user and workspace membership.
- Construct trusted `authContext` only through the frozen server contract.
- Implement protected-layout behavior.
- Test unauthenticated access and membership resolution.

Middleware or its Next.js 16.3 equivalent may redirect early but is not the authorization boundary.

### Exclusive ownership

```text
src/features/auth/**
src/features/workspaces/**
src/app/(auth)/**
src/app/api/auth/**
src/app/w/[workspaceSlug]/layout.tsx
```

A root interception file must be explicitly assigned; Agent 1 does not assume it.

### Dependencies

Agent 0's foundation commit and frozen user, workspace, membership, authorization, error, route, and test contracts.

### Definition of done

- Valid credentials authenticate; invalid credentials do not.
- Auth.js uses JWT rather than database-backed session state.
- Sign-out ends the browser session.
- JWT state contains only stable identity information.
- Membership and role are loaded from PostgreSQL.
- Client input cannot construct `authContext`.
- Protected routes reject unauthenticated users and non-members.
- Relevant unit and PostgreSQL tests pass.
- Only owned or explicitly approved files changed.
- The mandatory handoff record is complete.

## Agent 2 — Incidents, comments, and activity

These areas stay together because their writes share authorization and transaction boundaries.

### Responsibilities

- Implement incident creation, retrieval, and mutation.
- Enforce owner-or-workspace-administrator mutation rules.
- Implement chronological comments and immutable activities.
- Make incident, comment, and activity writes transactional.
- Implement incident pages and Route Handlers.
- Test isolation, lifecycle rules, timelines, and rollback.

### Exclusive ownership

```text
src/features/incidents/**
src/features/comments/**
src/features/activity/**
src/app/w/[workspaceSlug]/incidents/**
src/app/api/workspaces/[workspaceSlug]/incidents/**
```

### Dependencies

Agent 0's foundation and frozen incident, comment, activity, authorization, transaction, route, error, response, schema, and test contracts. Agent 1 is consumed only through the frozen `authContext` interface.

### Definition of done

- Members create and view workspace-scoped incidents.
- Only an owner or administrator changes tracked fields.
- A new owner is a member of the same workspace.
- Creation, tracked changes, and comments write activities atomically.
- Timeline order is deterministic and persistent.
- Cross-workspace access is denied in scoped queries and services.
- Required unit and real-PostgreSQL tests pass.
- Only owned or explicitly approved files changed.
- The mandatory handoff record is complete.

## Agent 3 — Dashboard

### Responsibilities

- Implement dashboard queries, metrics, page, and feature components.
- Exclude resolved and closed incidents.
- Verify workspace isolation and last-updated behavior.
- Add focused real-PostgreSQL tests.

### Exclusive ownership

```text
src/features/dashboard/**
src/app/w/[workspaceSlug]/page.tsx
```

### Contract constraint

Agent 3 must consume Agent 0's frozen incident/dashboard persistence, service, domain, authorization, error, and view-model contracts. It must not introduce an alternative incident repository, duplicate incident persistence model, competing service interface, or locally redefined incident values.

If a required contract is missing or inadequate, Agent 3 stops the affected work and proposes a contract change for integration review. It must not change `src/contracts/**`, `src/db/**`, migrations, dependencies, or another feature's contracts itself. Unaffected work may continue within owned paths.

### Definition of done

- The dashboard shows all and only non-resolved, non-closed workspace incidents.
- Open, investigating, and open-by-severity metrics are correct.
- Required incident fields and last-updated values are displayed.
- Other workspaces never affect results.
- Only frozen incident/dashboard contracts are used.
- Missing contracts were resolved through integration review, not local alternatives.
- Required unit and real-PostgreSQL tests pass.
- Only owned or explicitly approved files changed.
- The mandatory handoff record is complete.

## Integration agent

The integration agent owns the integration branch and is separate from feature implementers.

### Responsibilities

- Confirm worktrees share the accepted foundation commit.
- Check every handoff before accepting a branch.
- Merge in the specified order.
- Resolve only unambiguous mechanical conflicts.
- Return semantic conflicts to the owner or human triage.
- Prevent unreviewed contract, dependency, schema, or migration changes.
- Run migrations and verification after each merge.
- Record every integrated commit, command, and result.
- Preserve unrelated user changes.

It must not redesign features while resolving conflicts.

### Integration order

1. Review and merge Agent 0; record the foundation commit.
2. Create Agents 1–3 worktrees from it.
3. Integrate Agent 1.
4. Integrate Agent 2.
5. Integrate Agent 3.
6. Run clean migrations, feature tests, lint, type checking, and build.
7. Start and integrate Agent 4.
8. Start and integrate Agent 5 after commands stabilize.
9. Run the full clean-database suite.
10. Send the integrated commit to read-only review.
11. Human-triage findings and assign fix agents.
12. Repeat verification and review until blockers are closed.

Agents 1–3 may finish in any order, but integration is serialized.

### Definition of done

- Accepted branches and handoffs were checked.
- Merge order and commits are recorded.
- Semantic conflicts were escalated.
- Clean migrations and applicable verification pass.
- Contract, dependency, schema, and migration changes are accounted for.
- The downstream integration commit is identified.
- The mandatory handoff record is complete for each integration pass.

## Agent 4 — Cross-feature verification

Agent 4 starts from the integrated Agents 0–3 commit.

### Responsibilities

- Add Route Handler integration coverage.
- Add minimal Playwright workflows.
- Exercise sign-in, creation, updates, comments, timeline, dashboard, and sign-out.
- Verify unauthenticated and cross-workspace HTTP behavior.
- Verify fresh migrations and deterministic setup.
- Report product defects rather than taking feature ownership.

### Exclusive ownership

```text
tests/integration/**
tests/e2e/**
playwright.config.*
```

Shared test factories must be owned by Agent 0 or explicitly assigned to Agent 4.

### Definition of done

- Approved connected workflows pass.
- Authentication and workspace boundaries are verified over HTTP.
- Tests run on a freshly migrated real PostgreSQL database.
- Failures are reproducible and identify a likely owner.
- Production behavior was not weakened for a test.
- Only owned or approved files changed.
- The mandatory handoff record is complete.

## Agent 5 — Operations documentation

Agent 5 starts after commands and deployment behavior stabilize.

### Responsibilities and ownership

- Replace the starter README with verified setup, migration, test, build, start, and deployment instructions.
- Create a secret-free environment example.
- Document per-worktree test database isolation.
- Own only:

```text
README.md
.env.example
docs/deployment.md
```

It requests platform changes rather than editing packages, migrations, or shared configuration.

### Definition of done

- A new contributor can follow the setup.
- Commands are accurate and verified.
- Deployment matches `ARCHITECTURE.md`.
- Worktree test isolation is explained.
- No secrets are committed.
- Only owned or approved files changed.
- The mandatory handoff record is complete.

## Review agents

Review is initially read-only and may be split into:

- Specification and architecture compliance
- Authentication and workspace isolation
- Authorization and transaction integrity
- Database and migration safety
- Test quality and missing negative cases
- Next.js client/server boundaries
- Deployment documentation
- Unnecessary or out-of-scope complexity

Each finding includes:

```text
Severity:
Requirement:
Evidence:
Impact:
Reproduction or failing test:
Suggested owner:
Blocks completion: yes/no
```

### Definition of done

- The assigned area was checked against approved documents.
- Verification commands and results are recorded.
- Findings include evidence, impact, owner, and blocking status.
- Optional suggestions are separated from required fixes.
- No repository files changed.
- The mandatory handoff record is complete, using `None` where appropriate.

## Human triage

The human:

- Accepts, rejects, or defers findings.
- Resolves conflicting recommendations.
- Determines blockers.
- Approves contract, dependency, schema, or migration changes.
- Assigns one fix agent and permitted paths to each accepted finding.
- Resolves product ambiguity.
- Approves the final integrated commit.

Each decision records:

```text
Finding:
Decision: accept/reject/defer
Reason:
Assigned fix agent:
Permitted paths:
Required verification:
```

## Fix agents

Fix agents are temporary, narrowly scoped, and start from the latest integration commit.

### Responsibilities

- Address one finding or tightly related group.
- Change only triage-assigned paths.
- Add or strengthen regression coverage.
- Avoid unrelated refactoring.
- Request approval for contract, dependency, schema, or migration changes.
- Run focused and relevant integration checks.
- Stop and return to triage if the assigned scope is insufficient.

### Definition of done

- The assigned finding is reproducibly resolved.
- A regression test fails before and passes after where feasible.
- No unrelated files changed.
- Applicable PostgreSQL tests, integration tests, lint, type checking, and build pass.
- Sensitive shared changes have explicit approval.
- Review has enough evidence to verify closure.
- The mandatory handoff record is complete.

## Parallel and serialized work

```text
Agent 0: foundation
         |
   +-----+-----+
   |     |     |
   v     v     v
Agent 1 Agent 2 Agent 3
   \     |     /
    +----+----+
         |
  serialized integration
         |
   +-----+-----+
   |           |
   v           v
Agent 4     Agent 5
   \           /
    +---------+
         |
    read-only review
         |
     human triage
         |
    narrow fix agents
```

Parallel work:

- Agents 1–3 after the foundation is merged.
- Review agents with distinct concerns.
- Fix agents only with disjoint files and no shared-contract changes.

Serialized work:

- Dependencies and lockfile
- Database schema and migrations
- Shared contracts
- Root layout and global styling
- Feature integration
- Cross-feature test stabilization
- Documentation after command stabilization
- Fixes touching the same files or shared contracts

## Contract-change protocol

When a frozen contract is missing or incorrect:

1. Stop affected work.
2. Record why the current contract cannot satisfy the requirement.
3. Propose the smallest change and list affected agents and tests.
4. Submit it to integration review and human triage.
5. Continue only unaffected work within current ownership.
6. Assign an approved change to Agent 0 or a designated contract fix agent.
7. Merge the shared change first.
8. Rebase or recreate affected worktrees.
9. Record the change in affected handoffs.

Feature agents never solve missing contracts by creating parallel contracts.

## Final completion criteria

Implementation is complete when:

- `SPEC.md` requirements are implemented or explicitly accounted for.
- The result conforms to `ARCHITECTURE.md`.
- Every implementation, integration, review, and fix agent supplied a complete handoff.
- No unapproved ownership, contract, dependency, schema, or migration changes remain.
- A clean PostgreSQL database migrates successfully.
- Unit, real-PostgreSQL integration, Route Handler integration, and required Playwright tests pass.
- Lint, type checking, and production build pass.
- Documentation commands are verified.
- Blocking review findings are independently closed.
- Human triage approves the final integrated commit.

The resulting history is straightforward: freeze the foundation, build independent vertical slices in parallel, integrate them serially, verify the system, review without mutation, triage centrally, and apply narrow fixes.


---
name: feature-delivery
description: Use this skill when adding a new feature to SignalRoom. It guides Codex through scope definition, impact analysis, execution planning, implementation, verification, review, and human triage while avoiding unnecessary parallelism and scope expansion.
---

# Feature Delivery

## Goal

Use the minimum orchestration complexity needed to add a feature safely to SignalRoom.

Do not start coding immediately.

First understand the requested feature, inspect the existing architecture and contracts, and decide whether the work should be handled sequentially or split into genuinely independent parallel slices.

Prefer a single implementation path for small or tightly coupled changes.

Only use parallel agents or Git worktrees when ownership boundaries are clear and the work can proceed independently without competing changes to shared contracts, schema, dependencies, or overlapping files.

## Step 1 — Inspect and define scope

Before making changes:

1. Read the relevant parts of:
   - `SPEC.md`
   - `ARCHITECTURE.md`
   - `AGENT_PLAN.md`
   - existing feature code
   - related tests
   - shared contracts, routes, schema, and authorization rules that may be affected

2. Restate the requested feature in concrete terms.

3. Define:
   - what is in scope
   - what is explicitly out of scope
   - expected user-visible behavior
   - important authorization or workspace-isolation rules
   - acceptance criteria

4. Identify which existing invariants and contracts must remain unchanged.

5. List any ambiguity that could materially change the implementation.

Do not invent missing requirements.

If an ambiguity affects product behavior, authorization, persistence, or a shared contract, stop and ask for human clarification before implementation.

If the ambiguity is minor and does not affect observable behavior or shared contracts, make the smallest reasonable assumption and state it.

## Step 2 — Analyze impact

Before choosing an execution strategy, identify the parts of SignalRoom the feature may affect.

Check whether the feature touches:

- domain contracts
- database schema or migrations
- authentication or authorization
- workspace isolation
- application services
- repositories or transaction boundaries
- API routes or response contracts
- server or client components
- shared UI presentation
- environment variables or dependencies
- unit, PostgreSQL integration, HTTP, or Playwright tests

For each affected area, classify it as:

- shared foundation
- feature-owned implementation
- integration glue
- verification only

Pay special attention to changes involving:

- shared contracts
- schema or migrations
- dependencies or lockfiles
- authorization rules
- transaction behavior

Treat these as coordination-sensitive areas.

Do not let multiple agents independently modify the same shared contract, migration, dependency configuration, or overlapping set of files.

If a shared change is required, establish and verify that change first before parallel feature work begins.

## Step 3 — Decide execution mode

Choose the simplest execution mode that fits the feature.

### Use sequential implementation when:

- the change is small
- multiple files are tightly coupled
- shared contracts or schema are still changing
- ownership boundaries are unclear
- parallel work would create overlapping edits
- integration cost would likely exceed the benefit of parallelism

### Consider parallel implementation when:

- the feature contains two or more genuinely independent slices
- each slice has clear file/path ownership
- shared contracts are already established
- schema, dependencies, and authorization rules are stable
- each slice can be implemented and tested without waiting on another slice
- integration work is understood and explicitly owned

If parallel execution is appropriate:

1. Define each slice.
2. Assign exclusive owned paths.
3. Identify frozen shared contracts.
4. Identify integration-owned files.
5. Define stopping conditions for each agent.
6. Use separate Git worktrees or branches for isolated implementation.

Do not parallelize simply because multiple agents are available.

If the benefit is unclear, choose sequential execution.

## Step 4 — Plan implementation and ownership

Before implementation begins, produce a concise execution plan.

The plan must include:

- feature goal
- acceptance criteria
- files or paths expected to change
- shared contracts that must remain stable
- any shared change that must happen first
- implementation order
- verification required
- integration owner
- known risks or assumptions

For sequential work, define one implementation scope and keep it narrow.

For parallel work, define each agent using:

### Agent

- Responsibility:
- Owned paths:
- Contracts consumed:
- Contracts allowed to change:
- Dependencies:
- Verification:
- Stop conditions:

Agents must not modify files outside their owned paths unless explicitly approved.

If an agent discovers that it needs to change:

- a frozen contract
- database schema
- migration
- dependency or lockfile
- authorization invariant
- another agent's owned path

it must stop and report the dependency instead of making the change independently.

Integration-owned files should not be modified by feature agents unless explicitly assigned.

## Step 5 — Implement

Implement only the approved scope.

During implementation:

- follow existing architecture and project conventions
- prefer existing services, repositories, contracts, and UI patterns over new abstractions
- keep changes local to the assigned scope
- preserve authorization and workspace-isolation invariants
- preserve transaction boundaries and activity-history rules
- add or update tests at the lowest useful level
- avoid broad refactors unless they are required for the feature
- avoid unrelated cleanup
- do not add dependencies unless the feature genuinely requires them

Do not treat discovered nice-to-have improvements as part of the feature.

If implementation reveals a new shared dependency, contract change, schema change, authorization ambiguity, or cross-owned file requirement:

1. stop the affected work
2. describe the blocker
3. explain the smallest required change
4. wait for human triage before continuing

For parallel work, each agent should finish with a short handoff containing:

- files changed
- behavior implemented
- contracts consumed
- contracts changed, if approved
- verification run
- results
- known limitations
- handoff commit

## Step 6 — Integrate

Do not treat completed agent branches as a completed feature.

Integration is a separate engineering phase.

During integration:

- merge or apply completed slices in dependency order
- resolve integration-owned files centrally
- wire shared runtime dependencies explicitly
- verify that contracts still align across slices
- check that authentication, authorization, workspace isolation, transactions, and UI behavior still compose correctly
- avoid broad cleanup while integrating

After each integration step:

1. run the relevant focused tests
2. run a production build when framework or bundling behavior may be affected
3. inspect failures before changing code

If an integration failure appears:

- reproduce it first
- classify whether it is:
  - a product defect
  - an integration defect
  - a test assumption problem
  - an environment/tooling issue
  - unrelated noise

Do not automatically change production code just because a test fails.

Prefer the narrowest fix that restores the documented contract.

## Step 7 — Verify

Choose verification based on the risk introduced by the feature.

Use the lowest level that can actually prove the required behavior, then add higher-level verification where integration risk exists.

### Verification layers

- Unit tests
  - pure logic
  - formatting
  - mappings
  - contract behavior
  - isolated component behavior where appropriate

- PostgreSQL integration tests
  - migrations
  - constraints
  - repositories
  - authorization backed by persisted state
  - transactions
  - ordering
  - concurrency

- HTTP integration tests
  - request parsing
  - session propagation
  - status codes
  - response contracts
  - authorization boundaries
  - workspace isolation

- Playwright
  - critical user workflows
  - navigation
  - forms
  - authentication
  - cross-feature behavior
  - behavior that must work in the built application

- Production build
  - run when changes may affect Next.js routing, server/client boundaries, bundling, environment handling, or framework behavior

Do not add an E2E test for every small implementation detail.

Do not accept green lower-level tests as proof of a cross-feature workflow when the risk exists at a higher boundary.

For database, transaction, or concurrency defects, prefer reproduction against real PostgreSQL before accepting a fix.

When verification fails:

1. reproduce the failure
2. compare the failure with the documented contract
3. classify the failure before modifying code
4. fix the narrowest correct layer
5. rerun the relevant verification

## Step 8 — Review and human triage

After implementation and integration are green, run a separate read-only review before declaring the feature complete.

The reviewer should inspect the integrated feature without modifying files.

Review for:

- specification and acceptance-criteria compliance
- authorization and workspace isolation
- transaction integrity
- contract drift
- integration mistakes
- missing edge cases
- concurrency risks where relevant
- test assumptions that exceed the documented contract
- unnecessary complexity
- scope expansion
- user-facing navigation or usability problems introduced by the feature

Classify findings as:

- blocker
- product defect
- test mismatch
- non-blocking improvement
- polish
- defer

Do not fix findings automatically.

Present the findings for human triage first.

Human triage decides:

- whether a finding is real
- whether it blocks completion
- which layer should be changed
- whether a fix should be assigned
- whether the finding should be deferred
- when the feature is complete enough to stop

For accepted fixes:

1. assign the narrowest possible fix scope
2. reproduce correctness defects before changing code when practical
3. rerun the relevant verification
4. review the resulting diff
5. stop again if the fix reveals new shared or ambiguous work

## Step 9 — Complete and hand off

A feature is complete only when:

- the approved scope is implemented
- required integration is complete
- relevant verification is green
- blocking review findings are resolved
- non-blocking findings have been explicitly accepted or deferred through human triage
- the working tree contains no accidental or unrelated changes

Before stopping, provide a concise final handoff containing:

- feature implemented
- files changed
- contracts or schema changed
- migrations or dependencies changed
- verification commands run
- verification results
- review findings
- human triage decisions
- deferred work
- known limitations
- final commit or handoff state

Do not continue improving the feature after the approved completion criteria are satisfied.

Do not turn deferred findings into new work unless explicitly requested.

If the feature used parallel agents, include a short note on:

- which slices ran in parallel
- what required serialized integration
- any dependencies discovered during integration
- whether the original parallelization strategy was appropriate

The final status must be one of:

- READY FOR HUMAN APPROVAL
- BLOCKED
- NEEDS TRIAGE

Do not declare the feature complete on behalf of the human orchestrator.

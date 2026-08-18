# SignalRoom — Agentic Engineering Evaluation

## Why I built SignalRoom

I built SignalRoom to learn what a structured multi-agent engineering workflow feels like in practice. The application was intentionally modest: an authenticated incident-management MVP with workspaces, incidents, comments, activity history, and a dashboard. It was large enough to involve authorization, persistence, transactions, integration, and UI work, but small enough that the process remained the main experiment.

I was not trying to prove that agents could independently turn a prompt into a finished product. I wanted to test bounded responsibilities, contracts before parallel implementation, and independent integration and review.

## Development approach

I wrote `SPEC.md` before implementation, defining the MVP, authorization rules, acceptance criteria, and exclusions. `ARCHITECTURE.md` and `AGENT_PLAN.md` then established a small modular monolith, workspace-scoped services and repositories, transaction rules, ownership, and integration order.

The most important early decision was to freeze shared invariants rather than every implementation detail. Before feature work began, I established the domain values, database schema and migration, authorization context, error model, service shapes, routes, transaction conventions, and test database infrastructure. Feature agents could make local choices, but they could not invent competing schemas, authorization models, or persistence contracts.

I then created three isolated Git worktrees from the same foundation:

- Authentication and workspace access.
- Incidents, comments, and activity.
- Dashboard queries and presentation.

Each slice had exclusive path ownership and focused tests. Dependencies, migrations, the lockfile, and shared contracts remained serialized. The slices were integrated one at a time, followed by route wiring, production-build verification, read-only review, focused investigation, and human triage.

This was bounded parallelism, not unrestricted autonomous coding. Agents had explicit scopes and stopping conditions. Integration and product decisions remained centralized.

## What happened

The platform foundation supplied the contracts, database model, migration, environment handling, and PostgreSQL test harness. The three worktrees then produced separate feature commits from that common base with little file overlap.

Clean merges did not mean a complete application. Auth was integrated first, followed by incidents and dashboard, and a separate change connected them to authenticated pages and Route Handlers. The incident and dashboard slices could compile against the shared authorization contract, but the running application still depended on the concrete auth and workspace resolver. When the feature agents encountered that missing dependency, they stopped rather than creating incompatible local versions.

The first production integration also exposed a Next.js/Turbopack build issue involving a shared Zod datetime schema. Several narrow investigations tried and reverted hypotheses before the accepted fix: moving the datetime schema from the broad domain contract into the incident contract that consumed it. The patch was tiny; isolating it was not.

A read-only integrated review surfaced an authenticated root-routing weakness and two concurrency races. The root route was still effectively the starter page, so authenticated users had no correct entry into a workspace. It was replaced with session-aware routing and regression coverage.

The concurrency findings were more serious. One transaction could authorize an incident owner using stale state after another transaction changed the owner. Another could write activity using state read before a competing update committed. I required those behaviors to be reproduced against real PostgreSQL before accepting a fix. The tests coordinate separate database connections, wait for lock contention through `pg_stat_activity`, and verify both stale-owner authorization and stale-activity behavior. The fix uses row-level locks so authorization, state comparison, mutation, and activity generation all use the same committed row state.

Higher-level verification came next. HTTP tests exercised sessions, validation, status mapping, and cross-workspace boundaries through the Route Handlers. A production-server Playwright workflow covered the complete authenticated incident lifecycle and sign-out.

That verification also showed that a failing test is not automatically a product defect. An HTTP test expected status and severity activities in a specific semantic order. The contract promised deterministic ordering by timestamp and then UUID, not “status before severity” when timestamps tied. I classified this as an overly specific test assumption rather than adding a database sequencing mechanism with no product requirement. The test was corrected to assert the entries and their details without inventing an order.

Once commands stabilized, I added operational documentation and a safe, rerunnable development seed. Manual smoke testing then exposed weak navigation and unfinished presentation, leading to a final UI pass. Functional completion and demo readiness were separate milestones.

## What worked well

The upfront specification paid for itself. Workspace isolation, owner-or-admin mutation authority, transactional activity history, and explicit exclusions gave implementation and review a common basis. They mattered more than freezing detailed code structure.

Stable contracts and worktree ownership made the parallel work real. The branches stayed largely inside their owned paths, created no competing shared models, and merged with little textual conflict. Separate implementation, integration, investigation, and review roles also made responsibility clearer and challenged authors' assumptions.

The strongest technical practice was reproducing transactional defects at the persistence layer. Mocks would not have demonstrated the actual lock wait, ownership change, or committed state seen by a waiting transaction. Real PostgreSQL tests made the failure concrete and justified a narrow row-lock fix instead of a speculative concurrency abstraction.

Layered verification worked for the same reason. Unit tests covered narrow behavior, PostgreSQL integration tests covered transactions and constraints, HTTP tests covered the session and Route Handler boundary, and Playwright covered the connected browser workflow. Each layer answered a different question.

## What did not work smoothly

Parallel feature completion happened much earlier than actual completion. Route wiring, production-build debugging, correctness fixes, cross-feature verification, documentation, demo data, and UI work all remained.

Auth exposed the difference between compile-time and runtime independence. The shared `AuthContext` let incident and dashboard code compile independently, but pages and handlers still needed the concrete session and workspace resolver. The contract controlled the dependency; it did not remove it.

Framework behavior also crossed an abstraction boundary. The Zod schema organization was reasonable in TypeScript and tests but failed in the Next.js/Turbopack production path. This only appeared after integration.

Cross-feature verification arrived later than ideal. Feature-local tests were substantial, but they did not prove that authentication cookies reached handlers, that the root route entered the application correctly, or that the browser workflow held together. One thin authenticated production smoke path immediately after route wiring would have shortened the feedback loop.

The activity-ordering failure was a useful warning: agent-generated tests can invent requirements just as agent-generated implementation can. Tests need review against the specification, not automatic deference.

My largest process mistake was not retaining the orchestration records. `AGENT_PLAN.md` required handoff and triage summaries, but they remained in the orchestration conversation rather than becoming durable artifacts. Git preserved the outcomes better than the reasoning.

## Human triage and judgment

My role moved away from line-by-line implementation, but it did not become passive approval. I defined scope, chose safe parallel boundaries, resolved dependencies, classified findings, demanded evidence, and decided when more work would improve correctness rather than merely expand the system.

The two best examples were the concurrency and ordering cases. For concurrency, I would not accept a fix based only on code inspection; I wanted a real PostgreSQL reproduction. For tied activity entries, I compared the failure with the documented contract and corrected the test instead of adding an unnecessary sequence mechanism.

Human triage also defined completion. The final integrated review reported no blockers and four non-blocking findings, which I deferred. Without a human stopping threshold, every optional improvement can become another loop.

## Parallel agents vs integration

My central lesson is simple: worktree isolation reduces merge conflicts, not integration effort.

The useful planning model is:

```text
foundation
+ parallel slices
+ integration / review / fix loop
```

Auth internals, incident lifecycle code, dashboard code, and focused tests were genuinely parallelizable after the foundation existed. Database schema, dependencies, shared contracts, integration routes, production-build stabilization, and transaction changes required serialization. Cross-feature tests and global navigation also needed an integrated application.

The branches finished close together and merged cleanly, but the most consequential correctness work happened afterward. I now treat foundation and the integration/review/fix loop as first-class delivery phases, not overhead after “the agents are done.”

## Verification and review

I used different verification layers because no single layer covered the important risks:

- Unit tests checked contracts, mappings, and focused behavior cheaply.
- Real-PostgreSQL tests checked migrations, constraints, authorization, transactions, and concurrency.
- HTTP tests checked session propagation, request validation, status codes, and workspace isolation.
- Playwright checked the connected user workflow in a production server.
- Read-only review looked for assumptions and missing scenarios outside the suites.

The concurrency case shows why database realism mattered: the defect depended on transaction timing and committed row state. The ordering case shows why review still mattered after tests existed: the test itself was wrong relative to the contract.

Green tests were necessary but did not demonstrate root routing, production bundling, stale-owner safety, authenticated HTTP behavior, or usable navigation.

## What I would change next time

I would preserve more of the process without adding a heavy framework. Each agent would leave a short archived handoff with its scope, verification, results, and limitations; review and triage would receive similar summaries.

For technically important investigations, I would record failed hypotheses and decisive evidence. I would not commit every experiment, but the Turbopack/Zod investigation should have left enough context to explain why the final change worked.

I would add one thin authenticated cross-feature smoke path, including a production build, immediately after route wiring. I would also estimate and assign integration-owned glue explicitly instead of treating it as incidental work between feature branches.

I would continue requiring real persistence-layer reproduction for database and concurrency problems. That discipline produced one of the clearest fixes in the project.

## Main takeaways

1. Stable invariants enable parallel work more effectively than freezing detailed implementations.
2. Worktree ownership can produce low-conflict feature development, but it does not make the integrated system correct.
3. Compile-time independence and runtime independence are different; authentication made that distinction concrete.
4. Implementation, integration, investigation, and review benefit from separate roles.
5. Database concurrency defects should be reproduced against the real database before a fix is accepted.
6. Tests are executable claims, not unquestionable requirements; they must be checked against the product contract.
7. Human judgment remains central in defining scope, demanding evidence, classifying findings, and deciding when to stop.
8. Well-specified, contract-driven slices can be implemented in parallel with surprisingly little merge conflict, but correctness and completeness emerge through serialized integration, verification, review, and human classification rather than parallel code generation alone.

## Evidence and limitations

The commit history directly supports most of the chronology: specification before implementation, the common foundation, parallel feature branches, serialized integration, targeted fixes, higher-level verification, the ordering-test correction, seed, and UI polish. Git verifies separate branches and worktrees, but not the identity of the AI agents operating them.

Some events were not committed as artifacts and are included here as author recollection: the agents stopping at the concrete auth dependency, failed Turbopack/Zod hypotheses, attribution of findings to read-only review, my requirement for PostgreSQL reproduction, the ordering triage decision, the final review and deferrals, and the smoke-test motivation for UI polish. The code and history support the resulting changes, but not every part of that surrounding process.

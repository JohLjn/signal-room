# SignalRoom MVP Architecture

## Purpose

SignalRoom is implemented as a deliberately small modular monolith: one Next.js application backed by one PostgreSQL database. The architecture prioritizes workspace isolation, consistent incident history, automated verification, and the ability for multiple contributors or AI agents to work in separate Git worktrees without routinely editing the same files.

This document describes the intended boundaries and technology choices. It does not require distributed services, background workers, caching infrastructure, or abstractions that are not needed by the MVP specification.

Before application implementation begins, install the repository dependencies and read the relevant Next.js 16.3 guidance bundled under `node_modules/next/dist/docs/`, as required by `AGENTS.md`. Exact framework APIs must follow that installed documentation.

## Technology choices

- Next.js 16 App Router with TypeScript
- React Server Components for initial rendering and server-side data loading
- Small Client Components for interactive forms and controls
- PostgreSQL as the only persistent store
- Drizzle ORM for typed database access
- Drizzle Kit for schema migrations
- Zod for request, parameter, and environment validation
- Auth.js Credentials provider with the JWT session strategy
- Argon2id for password hashing
- Vitest for unit, service, and integration tests
- Playwright for a small set of browser-level workflows
- pnpm, matching the existing repository configuration

These choices keep the system deployable as a single application while preserving explicit service and authorization boundaries.

## Application boundaries

The application has three primary layers:

```text
Pages and Route Handlers
           |
           v
Application Services
           |
           v
Repositories and PostgreSQL
```

### Pages and Route Handlers

Pages render application state. Route Handlers translate HTTP requests into application service calls and translate service results or errors into HTTP responses. They do not contain business authorization rules or issue database queries directly.

The MVP uses explicit Route Handlers as its client-facing HTTP boundary. This provides a documented and directly testable API surface. Server Components may call the same application services directly when rendering pages; they must not bypass those services to access repositories.

Proposed page routes:

```text
/sign-in
/w/[workspaceSlug]
/w/[workspaceSlug]/incidents/new
/w/[workspaceSlug]/incidents/[incidentId]
```

Proposed HTTP routes:

```text
/api/workspaces/[workspaceSlug]/incidents
/api/workspaces/[workspaceSlug]/incidents/[incidentId]
/api/workspaces/[workspaceSlug]/incidents/[incidentId]/comments
```

No separate backend application or public API is needed for the MVP.

### Application services

Application services own use-case orchestration, authorization, business validation, and transaction boundaries. All incident operations pass through this layer regardless of whether the caller is a Server Component or a Route Handler.

### Repositories

Repositories contain PostgreSQL queries and persistence mapping. They do not make authentication or authorization decisions. Repository operations are workspace-scoped wherever they access workspace-owned data; an unscoped incident lookup should not be part of the normal repository interface.

## Client and server responsibilities

### Server responsibilities

- Authenticate the current request.
- Resolve the current user's membership in the workspace named by the URL slug.
- Load dashboard, incident, comment, and activity data.
- Validate all route parameters and submitted data.
- Enforce workspace and incident-level authorization.
- Execute transactions and create activity entries.
- Return explicit response or view models rather than raw database records.

### Client responsibilities

- Hold temporary form and interaction state.
- Submit incident creation, incident update, and comment requests.
- Display validation errors and pending states.
- Enhance status, severity, and owner controls.
- Render UTC timestamps in the user's local time where appropriate.

Client-side validation is a usability feature only. All client input is untrusted and must be validated and authorized on the server.

## Authentication and workspace authorization

### Authentication

Auth.js uses its Credentials provider and JWT session strategy. User credentials and password hashes are persisted in PostgreSQL, but Auth.js session state is not stored as a database-backed session.

The sign-in flow verifies the submitted password against the persisted Argon2id hash. A successful sign-in results in Auth.js-managed JWT session state carried by a secure, HTTP-only cookie. Signing out removes or invalidates that browser session state. Invalid credentials do not create a session.

The JWT should carry only the stable identity information needed to resolve the current user, such as the user ID. Workspace roles and memberships must be read from PostgreSQL rather than copied into a long-lived JWT, so authorization changes take effect without waiting for a token to expire.

Protected layouts and Route Handlers reject or redirect unauthenticated requests. Middleware may provide early redirects for user experience, but it is not the security boundary; application services remain authoritative.

### Trusted authorization context

Every protected service receives an authorization context with this conceptual shape:

```text
authContext
  userId
  workspaceId
  membershipRole
```

`authContext` is trusted server-side state. It must always be derived on the server from both:

1. the authenticated Auth.js session; and
2. the workspace slug from the matched server route.

It must never be accepted from a client request body, query value, form field, header intended for application data, or any other client-controlled input. A caller may supply the workspace slug through the URL, but the server must resolve that slug to a workspace and verify the authenticated user's current membership before constructing `authContext`.

### Authorization rules

- Any workspace member can list and view incidents in that workspace.
- Any workspace member can create incidents and add comments in that workspace.
- Only the current incident owner or a workspace administrator can change status, severity, or owner.
- A selected incident owner must be a current member of the same workspace.
- Incident, comment, and activity lookups include both the resource identifier and the trusted `workspaceId` from `authContext`.
- Cross-workspace resources return `404` where practical, avoiding disclosure that an identifier exists.

An incident must never be retrieved by ID alone and then authorized afterward. Workspace scoping belongs in the database query as well as the service rule.

## PostgreSQL persistence

PostgreSQL is the system of record for users, workspaces, memberships, incidents, comments, and activity entries. Data survives application restarts, and an empty database is initialized through committed migrations.

All timestamps use PostgreSQL `timestamptz` and represent UTC instants. IDs use UUIDs generated consistently by either PostgreSQL or the application; one approach should be selected during implementation and used throughout.

### Data model

#### `users`

- `id`
- `email`, unique
- `password_hash`
- `name`
- `created_at`
- `updated_at`

#### `workspaces`

- `id`
- `slug`, unique
- `name`
- `created_at`
- `updated_at`

#### `workspace_memberships`

- `workspace_id`
- `user_id`
- `role`: `member` or `admin`
- `created_at`

The composite primary key is `(workspace_id, user_id)`.

#### `incidents`

- `id`
- `workspace_id`
- `creator_id`
- `owner_id`
- `title`
- `description`
- `status`: `open`, `investigating`, `resolved`, or `closed`
- `severity`: `sev1`, `sev2`, `sev3`, or `sev4`
- `created_at`
- `updated_at`

The creator and owner must be members of the incident's workspace. Foreign keys and composite constraints should enforce these persisted relationships rather than relying only on application checks.

#### `comments`

- `id`
- `workspace_id`
- `incident_id`
- `author_id`
- `body`
- `created_at`

The workspace identifier is retained alongside the incident identifier so database constraints and queries can reinforce workspace consistency. The author must be a member of that workspace at creation time.

#### `activity_entries`

- `id`
- `workspace_id`
- `incident_id`
- `actor_id`
- `type`
- `comment_id`, nullable
- `details_json`
- `created_at`

Allowed activity types are:

- `incident_created`
- `status_changed`
- `severity_changed`
- `owner_changed`
- `comment_added`

Database enums or check constraints restrict status, severity, membership role, and activity type values.

### Key relationships and indexes

- A workspace has many memberships and incidents.
- A user may have memberships in many workspaces.
- An incident has one creator, one current owner, many comments, and many activity entries.
- A comment activity may reference its corresponding comment.
- Comments and activities belong to the same workspace as their incident.

Initial indexes should support concrete MVP queries:

- incidents on `(workspace_id, status)`
- incidents on `(workspace_id, updated_at)`
- comments on `(incident_id, created_at, id)`
- activity entries on `(incident_id, created_at, id)`

No soft deletion, cache, search index, event-sourcing framework, or separate audit store is required.

## API and service layer

The service boundary exposes these conceptual operations:

```text
getDashboard(authContext)
listIncidents(authContext)
getIncident(authContext, incidentId)
createIncident(authContext, input)
updateIncident(authContext, incidentId, input)
addComment(authContext, incidentId, input)
```

Authentication itself exposes sign-in, sign-out, and server-side session resolution through the Auth.js integration.

`updateIncident` accepts only the mutable fields defined by the MVP. It loads the workspace-scoped incident, checks that the actor is its owner or a workspace administrator, compares old and new values, and creates one activity entry for each tracked field that changed.

The following operations are atomic PostgreSQL transactions:

- Create incident and append its creation activity.
- Update an incident and append every resulting change activity.
- Create a comment and append its comment activity.

If any part fails, the entire operation rolls back. This prevents current incident state, comments, and timeline history from diverging.

Repositories receive explicit scoped identifiers, for example:

```text
findIncident(workspaceId, incidentId)
listDashboardIncidents(workspaceId)
```

Persistence details remain hidden from pages, Route Handlers, and Client Components.

## Activity timeline design

Activity entries are append-only at the application boundary. The application provides no update or delete operation for them.

`details_json` stores a small event-specific snapshot. A status event, for example, records its previous and new values. Ownership events record previous and new user IDs plus display-name snapshots so historical text remains meaningful if a user later changes their name.

Comments remain the canonical source for comment bodies. A `comment_added` activity links to its comment rather than duplicating comment content into JSON.

Timeline entries are ordered deterministically by `created_at ASC, id ASC`. The secondary ID ordering handles entries with equal timestamps.

The dashboard and incident `updated_at` behavior should be defined consistently during implementation. Tracked incident changes and new comments should update the incident's `updated_at`, so the dashboard's last-updated value reflects meaningful incident activity.

## Validation boundaries

Validation is applied at narrow, explicit boundaries:

- Environment variables are validated once when server configuration is loaded.
- Dynamic route parameters are parsed before invoking services.
- Route Handler request bodies are parsed with Zod.
- Application services enforce business invariants and authorization.
- PostgreSQL enforces valid relationships and allowed enum or check values.
- Response and view-model mapping prevents password hashes and internal fields from leaking.

Shared schemas may define stable enum values and input shapes. Database row types, service inputs, and HTTP response types remain distinct so changes do not accidentally expose persistence details.

## Testing strategy

Automated verification is a core architectural requirement, including verification of agent-generated code. Authorization-critical and transactional behavior must be tested against a real PostgreSQL database rather than relying only on mocked repositories.

### Service and integration tests

Vitest service and integration tests run against an isolated PostgreSQL test database or isolated database schema initialized with the real migrations. They cover:

- Incident creation and its creation activity.
- Valid status, severity, and ownership updates.
- One activity entry per successful tracked change.
- Rejection of incident updates by a non-owner, non-administrator.
- Comment creation and its linked activity.
- Chronological timeline retrieval.
- Dashboard lists and metrics.
- Unauthenticated access rejection.
- Cross-workspace read, update, and comment rejection.
- Invalid owners, statuses, severities, and empty required values.
- Transaction rollback when a related activity write fails.

Test data must be isolated so tests can run reliably in clean environments and, where configured, in parallel. Factories should create only the users, workspaces, memberships, and incidents required by each test.

### Other test levels

- Unit tests cover small pure validation, transition, formatting, or metric helpers where useful.
- Route Handler integration tests verify session handling, parameter and body parsing, service error mapping, and HTTP status codes.
- A minimal Playwright suite verifies sign-in, incident creation, incident update, commenting, timeline display, and sign-out through the browser.

Mocked tests may supplement these suites for narrow presentation behavior, but they do not replace real-PostgreSQL tests for services, authorization, constraints, or transactions.

The repository will document one repeatable test command that succeeds in a clean local environment when the required PostgreSQL connection and other environment variables are supplied.

## Deployment assumptions

The MVP deployment consists of:

- one Node.js Next.js application;
- one managed PostgreSQL database;
- HTTPS supplied by the hosting platform;
- one migration command run as a controlled release step; and
- environment variables for the database connection, Auth.js secret, and application URL.

Database and authentication code runs in the Node.js runtime, not an Edge runtime. The deployment platform must support the selected PostgreSQL driver's connection behavior; pooling or a provider-specific connection endpoint may be configured if the platform requires it.

The repository will include an example environment file and concise setup, migration, test, build, startup, and deployment instructions. A production build must not depend on development seed data.

Redis, queues, background workers, object storage, Kubernetes, multi-region replication, and separate services are outside the MVP because no approved requirement needs them.

## Codebase structure

A feature-oriented structure keeps business boundaries visible and reduces the number of shared files that independent contributors need to edit:

```text
src/
  app/
    (auth)/
    w/[workspaceSlug]/
    api/workspaces/[workspaceSlug]/
  features/
    auth/
      service.ts
      schemas.ts
    workspaces/
      service.ts
      repository.ts
    incidents/
      service.ts
      repository.ts
      schemas.ts
      types.ts
      components/
    dashboard/
      service.ts
      repository.ts
    activity/
      repository.ts
      types.ts
  db/
    client.ts
    schema/
      users.ts
      workspaces.ts
      incidents.ts
      activity.ts
    migrations/
  lib/
    env.ts
    errors.ts
  test/
    factories/
    integration/
    e2e/
```

This is a directional layout, not a requirement to create empty placeholder files. Files should be introduced only when their feature is implemented.

Route files remain thin. Feature directories own their services, persistence operations, validation, types, and feature-specific UI. Shared code is introduced only when multiple features have a concrete need for the same behavior. Large generic utility modules, central service registries, and broad barrel exports should be avoided.

## Independent AI-agent and worktree workflow

The architecture supports multiple AI agents working independently in separate Git worktrees through explicit ownership and limited shared surfaces:

- Divide work by vertical feature slice, such as authentication, incidents, dashboard, or test infrastructure.
- Keep each feature's service, repository, schemas, and components in its own directory.
- Give each task an explicit list of files or directories it owns before parallel work begins.
- Avoid simultaneous edits to central configuration, shared schemas, the lockfile, or route layout files unless coordinated.
- Serialize database schema work: one agent owns schema and migration changes at a time.
- Use unique, ordered migration names and never edit an already-shared migration to resolve a branch conflict.
- Give each worktree or agent its own test database or PostgreSQL schema through environment configuration.
- Keep the lockfile unchanged unless a task intentionally adds or updates dependencies.
- Require each agent to run the relevant focused tests before handoff; integration work runs the complete real-PostgreSQL suite, lint, and production build.
- Prefer small commits that contain one feature or architectural change and its tests.
- Rebase or merge the latest shared schema and contracts before generating dependent migrations or integration fixtures.
- Add local `AGENTS.md` guidance only when a directory has stable specialized rules that are not already documented at the repository root.

Public feature interfaces should remain narrow. A feature may expose its service operations and stable input or output types, while keeping database query details private. This lets another worktree integrate with the feature without editing its internals.

Database migrations and dependency changes are the two intentionally serialized areas. This limited coordination cost is preferable to adding infrastructure or elaborate abstractions solely to eliminate merge conflicts.

## Deliberate exclusions

The MVP architecture does not introduce:

- microservices or a separate API server;
- GraphQL;
- command or event buses;
- CQRS or event sourcing;
- dependency-injection containers;
- generic repository frameworks;
- Redis, queues, or background jobs;
- caching beyond framework defaults;
- soft deletion or archival infrastructure;
- observability infrastructure beyond normal application logging; or
- advanced role or policy engines.

These may be reconsidered only when a concrete product or operational requirement justifies them.

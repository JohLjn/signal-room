# SignalRoom MVP Specification

## Purpose and MVP scope

SignalRoom is an internal incident and operations dashboard for a fictional SaaS company. It gives authenticated workspace members one place to create, track, discuss, and review active incidents.

The MVP supports the full basic incident workflow: create an incident, assign its status, severity, and owner, add comments, view an activity timeline, and monitor open work from a dashboard.

## Roles and authorization

- A user belongs to one or more workspaces.
- Workspace members can view incidents in their workspace.
- Workspace members can create incidents and add comments in their workspace.
- Only the incident owner or a workspace administrator may change an incident's status, severity, or owner.
- A user cannot access data belonging to another workspace.

Acceptance criteria:

- An unauthenticated request to a protected page or API endpoint is rejected or redirected to sign in.
- A workspace member can view only incidents, comments, and activity belonging to that workspace.
- A user cannot retrieve or modify another workspace's incident by changing an identifier in a request.
- A non-owner, non-administrator cannot update an incident's status, severity, or owner.

## Features

### Authentication

Users can sign in and sign out.

Acceptance criteria:

- A user with valid credentials can sign in and access protected areas.
- Signing out ends the authenticated session.
- Invalid credentials do not create an authenticated session.

### Incident creation and fields

An incident has a title, description, status, severity, owner, workspace, creator, and timestamps.

Acceptance criteria:

- A workspace member can create an incident with a non-empty title, status, severity, and owner.
- A created incident is associated with the creator's current workspace and is visible in that workspace's incident list.
- The system rejects creation when required fields are missing or invalid.
- A newly created incident records its creator and creation timestamp.

### Status, severity, and owner

Each incident has one status, one severity, and one owner. The MVP uses statuses `open`, `investigating`, `resolved`, and `closed`; and severities `sev1`, `sev2`, `sev3`, and `sev4`.

Acceptance criteria:

- An authorized user can change an incident's status, severity, or owner to a valid value.
- The system rejects values outside the defined status and severity sets.
- Each successful change persists and is visible after reload.
- Each successful change creates a corresponding activity entry.

### Comments

Workspace members can add chronological comments to incidents.

Acceptance criteria:

- A workspace member can add a non-empty comment to an incident they can view.
- Each comment displays its author and creation timestamp.
- Comments are shown in chronological order.
- The system rejects an empty comment and prevents cross-workspace commenting.

### Activity timeline

Each incident has an immutable timeline of key actions: creation, status changes, severity changes, ownership changes, and comments.

Acceptance criteria:

- Creating an incident produces a creation activity entry.
- Every successful tracked change produces one activity entry identifying the actor, action, and timestamp.
- Adding a comment produces an activity entry linked to that comment.
- Timeline entries are displayed in chronological order and remain available after reload.

### Dashboard

The dashboard shows open incidents in the current workspace and a small set of summary metrics.

Acceptance criteria:

- The dashboard lists all workspace incidents whose status is not `resolved` or `closed`.
- Each listed incident shows title, status, severity, owner, and last-updated timestamp.
- The dashboard displays counts for open incidents, investigating incidents, and open incidents by severity.
- Dashboard results and metrics exclude incidents from other workspaces.

### PostgreSQL persistence

Users, workspaces, memberships, incidents, comments, and activity entries are persisted in PostgreSQL.

Acceptance criteria:

- Data created through the product remains available after an application restart using the same database.
- Required incident relationships (workspace, creator, and owner) are enforced by persisted data.
- The application can initialize an empty database through a documented schema migration process.

### API and service boundary

Client-facing routes or handlers use a defined application service boundary for incident operations and authorization checks.

Acceptance criteria:

- Creating, retrieving, updating, and commenting on incidents are exposed through documented API or service operations.
- The same service boundary enforces workspace authorization for every incident operation.
- Persistence details are not required by callers of the service operations.

### Automated tests

Automated tests cover core behavior and access controls.

Acceptance criteria:

- Tests cover incident creation, valid incident updates, comments, timeline creation, and dashboard metrics.
- Tests verify unauthenticated access is denied.
- Tests verify cross-workspace access is denied.
- The documented test command completes successfully in a clean local environment with required dependencies and configuration.

### Deployment-ready structure

The repository includes the configuration and documentation needed to deploy the application with PostgreSQL.

Acceptance criteria:

- Configuration is supplied through environment variables, with an example environment file documenting required values.
- A production build command succeeds.
- Database migration and application startup commands are documented.
- The repository includes concise setup, test, build, and deployment instructions.

## Explicitly out of scope

- Email, chat, paging, or third-party incident-management integrations.
- Notifications, subscriptions, reminders, or escalations.
- File attachments, rich-text comments, reactions, or comment editing.
- Incident templates, postmortems, runbooks, and recurring incidents.
- Advanced search, filtering, reporting, analytics, or audit export.
- Custom roles, granular permissions, SSO, MFA, or user provisioning.
- Mobile applications, public status pages, and multi-region deployment.

## Key assumptions

- The MVP serves internal users in small workspaces.
- A single default workspace may be created for initial development and demonstration.
- Workspace administrators are identified by a simple membership role.
- Timestamps use UTC and are rendered in the user's local time where applicable.
- An incident owner must be a member of the incident's workspace.
- Resolved and closed incidents remain retained and viewable; they are simply excluded from the open dashboard list.

## Definition of done

The MVP is done when an authenticated workspace member can create and track an incident through its lifecycle, collaborate via comments and activity history, and view accurate open-incident metrics; data persists in PostgreSQL, workspace authorization is enforced, core workflows are automatically tested, and the repository can be configured, built, migrated, and deployed using documented instructions.

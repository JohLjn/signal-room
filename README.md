# SignalRoom

SignalRoom is a small internal incident-management application built with Next.js and PostgreSQL. Authenticated workspace members can create incidents, track status, severity, and ownership, add comments, review activity history, and monitor open work from a dashboard.

## Engineering experiment

SignalRoom was primarily built to explore a structured multi-agent software-engineering process. A shared [specification](./SPEC.md) and [architecture](./ARCHITECTURE.md) established the foundation, followed by bounded feature ownership in isolated Git worktrees, parallel feature implementation, serialized integration, independent review, and human triage. The [implementation plan](./AGENT_PLAN.md) describes the workflow, and [EVALUATION.md](./EVALUATION.md) is the candid engineering retrospective.

## Prerequisites

- Node.js 20.9 or newer
- pnpm 10.34.5 (the version declared in `package.json`)
- PostgreSQL
- Chromium installed through Playwright for browser verification

Enable the pnpm version managed by Corepack if needed:

```bash
corepack enable
corepack install
```

## Environment variables

Copy the example file for Next.js development and replace its placeholders:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Persistent PostgreSQL database used by the application. |
| `AUTH_SECRET` | Secret used to sign authentication state. Use a stable random value of at least 32 characters. |
| `AUTH_URL` | Public base URL of the application, such as `http://localhost:3000` locally. |
| `TEST_DATABASE_URL` | Dedicated, disposable PostgreSQL database used only by automated integration and Playwright tests. |

Generate an authentication secret locally with `openssl rand -base64 32`. Never use the placeholder from `.env.example` in a deployed environment.

`DATABASE_URL` and `TEST_DATABASE_URL` must point to different databases. The integration and Playwright suites migrate and truncate/reset the test database. Never point `TEST_DATABASE_URL` at a development, staging, production, or otherwise valuable database.

## Local PostgreSQL

Create two databases: one persistent database for development and one disposable database for tests. For an existing local PostgreSQL installation, for example:

```bash
createdb signal_room
createdb signal_room_test
```

Example URLs are:

```text
DATABASE_URL=postgresql://localhost:5432/signal_room
TEST_DATABASE_URL=postgresql://localhost:5432/signal_room_test
```

Adjust the username, password, host, port, and TLS query parameters for your PostgreSQL installation.

### Optional Docker setup

If Docker is available, a single local PostgreSQL container can host both databases:

```bash
docker run --name signal-room-postgres \
  -e POSTGRES_USER=signalroom \
  -e POSTGRES_PASSWORD=local-development-only \
  -e POSTGRES_DB=signal_room \
  -p 5432:5432 \
  -d postgres:17

docker exec signal-room-postgres \
  createdb -U signalroom signal_room_test
```

Use these local-only URLs with that container:

```text
DATABASE_URL=postgresql://signalroom:local-development-only@localhost:5432/signal_room
TEST_DATABASE_URL=postgresql://signalroom:local-development-only@localhost:5432/signal_room_test
```

The container example is optional and is not a deployment architecture.

## Install and seed

Install the locked dependencies:

```bash
pnpm install --frozen-lockfile
```

Prepare the development database with the committed migrations and the small,
safely rerunnable demo dataset:

```bash
pnpm db:seed
```

`pnpm db:seed` explicitly loads the repository-root `.env.local`, applies pending
migrations to `DATABASE_URL`, and reconciles only SignalRoom's reserved demo
records. It does not truncate the database or remove unrelated development data.
It refuses to run in test or production mode and refuses to target the disposable
`signal_room_test` database.

The local demo credentials are:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@signalroom.test` | `signalroom-demo` |
| Member | `member@signalroom.test` | `signalroom-demo` |

These are public, local-development credentials. Never use them in a deployed
environment.

To apply migrations without seeding, provide `DATABASE_URL` directly because
`pnpm db:migrate` does not load `.env.local`:

```bash
DATABASE_URL='postgresql://signalroom:signalroom@localhost:5432/signal_room' pnpm db:migrate
```

`pnpm db:generate` is for maintainers creating migration files after an approved schema change. It is not needed to initialize a clone.

## Development

After configuring `.env.local` and running `pnpm db:seed`, start the application:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Next.js loads `.env.local` for the application server.

## Verification

Run static checks and unit tests without a database:

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
```

Run the real-PostgreSQL integration suite against the disposable test database:

```bash
TEST_DATABASE_URL='postgresql://localhost:5432/signal_room_test' \
  pnpm test:integration
```

The combined test command runs unit tests followed by the PostgreSQL integration suite, so it also requires `TEST_DATABASE_URL`:

```bash
TEST_DATABASE_URL='postgresql://localhost:5432/signal_room_test' pnpm test
```

For production-mode HTTP and browser verification, install Chromium once, build the application, and run Playwright:

```bash
pnpm exec playwright install chromium
pnpm build
TEST_DATABASE_URL='postgresql://localhost:5432/signal_room_test' \
  pnpm exec playwright test
```

Playwright starts the existing production build with `next start` on `127.0.0.1:3100`. Its configuration supplies test-only authentication settings and maps the application database to `TEST_DATABASE_URL` while the suite runs.

Both `pnpm test:integration` and `pnpm exec playwright test` migrate and truncate/reset `TEST_DATABASE_URL`. Use a dedicated disposable PostgreSQL database with no valuable data. The test harness rejects a test URL that matches `DATABASE_URL` when both are present, but that guard is not a substitute for checking the target yourself.

## Production build and start

With production environment variables available, build and start the application:

```bash
pnpm build
pnpm start
```

Apply migrations separately before starting a release:

```bash
DATABASE_URL='postgresql://user:password@database-host:5432/signal_room' \
  pnpm db:migrate
```

## Deployment requirements

SignalRoom is a single Node.js application backed by PostgreSQL. A deployment must provide:

- Node.js 20.9 or newer and the production build output.
- Network access to a persistent PostgreSQL database through `DATABASE_URL`.
- A stable, secret `AUTH_SECRET` of at least 32 characters.
- `AUTH_URL` set to the externally reachable HTTPS application URL.
- A release step that applies committed migrations exactly once or otherwise serializes migration execution before new application instances serve traffic.
- Durable database backups and operational controls appropriate for incident data.

Do not configure `TEST_DATABASE_URL` to reference a production or shared environment database. No specific hosting provider, managed database, container platform, proxy, or multi-region topology is required by the MVP architecture.

## Architecture

SignalRoom is a modular monolith. Pages and route handlers call application services, which enforce authorization and transaction boundaries before using PostgreSQL repositories. See [SPEC.md](./SPEC.md) for product scope and [ARCHITECTURE.md](./ARCHITECTURE.md) for the system design.

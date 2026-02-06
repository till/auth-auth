# Docker Removal and PostgreSQL Migration

## Overview

We remove Docker infrastructure and switch to database-per-environment: SQLite for local development and tests, PostgreSQL for CI and production. Docker provided Litestream for SQLite backup/replication, which becomes unnecessary. This approach simplifies local development (no database server needed) while using Postgres where it matters (CI and production).

## Database Strategy by Environment

**Local development**: SQLite file (`./auth.db`) - no server needed, just run `npm run dev`
**Tests**: In-memory SQLite (existing `test-instance.js` unchanged)
**CI (GitHub Actions)**: PostgreSQL service container
**Production**: PostgreSQL (Heroku Postgres add-on)

## Package Changes

**Remove**:

- Docker files (Dockerfile, compose.yml, .dockerignore, .docker/)
- Makefile (only had Docker command)

**Add**:

- `pg` - PostgreSQL driver (required for CI/production)

**Keep**:

- `better-sqlite3` - needed for local dev and tests
- `better-auth` - already includes Kysely, supports both databases
- All other dependencies unchanged

## Database Configuration Changes

### Better Auth Setup

**File: auth.js**

Support both SQLite and Postgres by detecting database type from connection string:

```js
import Database from "better-sqlite3";
import { Pool } from "pg";

// Detect database type from connection string
const isPostgres = appConfig.database_url.startsWith('postgres://');

let db;
if (isPostgres) {
  // PostgreSQL for CI/production
  db = new Pool({
    connectionString: appConfig.database_url,
    max: 10, // reasonable pool size
  });

  db.on("error", (err) => {
    console.error("Unexpected database error", err);
    process.exit(-1);
  });
} else {
  // SQLite for local development
  db = new Database(appConfig.database_url);

  try {
    db.pragma("busy_timeout = 5000");
    db.pragma("synchronous = NORMAL");
  } catch (e) {
    console.error(`error occurred: ${e.message}`);
    process.exit(-1);
  }
}

// Export db for graceful shutdown
export { db };

export const auth = betterAuth({
  database: db,
  // ... rest of config unchanged
});
```

### Configuration Defaults

**File: config.js**

No change needed - keep SQLite default:

```js
database_url: process.env.DATABASE_URL || "./auth.db";
```

### Environment Template

**File: .envrc-dist**

No change needed - SQLite works out of the box:

```bash
export GITHUB_CLIENT_ID=""
export GITHUB_CLIENT_SECRET=""
```

Developers can optionally add `DATABASE_URL` to use Postgres locally, but it's not required.

## Local Development Setup

No database server needed! SQLite file works out of the box.

### Developer Workflow

```bash
# One-time setup
cp .envrc-dist .envrc
# Add GitHub OAuth credentials to .envrc

# Install and migrate
npm ci
npm run db:generate
npm run db:migrate

# Run application
npm run dev
```

The app creates `./auth.db` on first run. Database persists between restarts.

### Database Reset

To start fresh, delete the database file:

```bash
rm auth.db
npm run db:generate
npm run db:migrate
```

## CI Configuration

### GitHub Actions Postgres Service

**File: .github/workflows/ci.yml**

Add Postgres service and set DATABASE_URL to use it:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: authuser
          POSTGRES_PASSWORD: authpass
          POSTGRES_DB: authdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
      - run: npm ci
      - run: npm run db:generate
      - run: npm run db:migrate
      - run: npm test -- --disable-coverage

    env:
      DATABASE_URL: postgres://authuser:authpass@localhost:5432/authdb
      GITHUB_CLIENT_ID: dummy-id-for-testing
      GITHUB_CLIENT_SECRET: dummy-secret-for-testing
```

Health checks ensure Postgres readiness before tests run. Each CI run gets a fresh Postgres database.

**Test database strategy:**

- Migrations run against Postgres to verify schema compatibility
- App-level tests (routes, handlers) use Postgres via DATABASE_URL
- Unit tests with `test-instance.js` use in-memory SQLite for isolation
- This hybrid approach verifies Postgres compatibility while keeping unit tests fast and isolated

## Documentation Updates

### CLAUDE.md Changes

**Essential Setup** (simplify):

````markdown
## Essential Setup

1. Create a GitHub OAuth2 application at https://github.com/settings/developers
2. Copy `.envrc-dist` to `.envrc` and add your GitHub credentials:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
3. For new setup:
   ```sh
   npm ci
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```
````

4. To update existing setup:
   ```sh
   npm ci
   npm run db:migrate
   npm run dev
   ```

````

**Development Commands** (update database section):
```markdown
**Database:**

- `npm run db:generate` - Generate Better Auth database schema
- `npm run db:migrate` - Run database migrations
- `rm auth.db` - Delete local database to start fresh

**Local development uses SQLite** (`./auth.db` file). No database server needed.
**CI and production use PostgreSQL** (configured via `DATABASE_URL` environment variable).
````

**Remove**:

- All Docker Compose references
- `make run-dev` command
- Litestream references
- Makefile commands (file deleted)

## Files to Remove

- `Dockerfile`
- `compose.yml`
- `.dockerignore`
- `.docker/` (entire directory)
- `Makefile`

## Files to Change

**auth.js**: Add database type detection and dual SQLite/Postgres support, export db for shutdown
**src/index.js**: Add database connection cleanup to graceful shutdown handlers
**package.json**: Add `pg` package (`npm install pg`)
**CLAUDE.md**: Simplify setup instructions (remove Docker, add database environment notes)
**.github/workflows/ci.yml**: Add Postgres service container, set DATABASE_URL

## Files Unchanged

- **config.js**: Keep SQLite default for `database_url`
- **.envrc-dist**: Keep minimal (just GitHub OAuth, DATABASE_URL optional)
- **test/helpers/test-instance.js**: Uses in-memory SQLite (no changes)
- **All test files**: Database-agnostic, no changes needed
- **All route handlers**: Better Auth abstracts database via Kysely
- **All middleware**: Session middleware is database-agnostic

Better Auth's Kysely adapter handles differences between SQLite and Postgres. The migration affects only connection setup in `auth.js`, graceful shutdown in `index.js`, and CI configuration.

## Pool Lifecycle Management

PostgreSQL connection pools must be closed gracefully on shutdown to avoid connection leaks.

**File: src/index.js**

Add database cleanup to existing graceful shutdown handlers:

```js
import { serve } from "@hono/node-server";
import app from "./app/app.js";
import appConfig from "../config.js";
import { db } from "../auth.js";

const server = serve(
  {
    fetch: app.fetch,
    port: appConfig.port,
  },
  (info) => {
    console.log(`Server is running on http://${appConfig.host}:${info.port}`);
  },
);

// graceful shutdown
process.on("SIGINT", async () => {
  // Close database connection pool if using Postgres
  if (db.end) {
    await db.end();
  }
  server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  // Close database connection pool if using Postgres
  if (db.end) {
    await db.end();
  }
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
```

The `db.end` check ensures compatibility: Postgres Pool has `.end()` method, SQLite Database does not. This allows the same code to work for both database types.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**When editing this file:** Use the `elements-of-style:writing-clearly-and-concisely` skill to ensure clear, concise prose.

## Project Overview

Authentication/profile prototype for Codebar using [Better Auth](https://www.better-auth.com/). A Node.js application built with Hono framework, SQLite database, and Better Auth for authentication flows.

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
4. To update existing setup:
   ```sh
   npm ci
   npm run db:migrate
   npm run dev
   ```

## Development Commands

**Running the app:**
- `npm run dev` - Development mode with hot reload (watches for changes)
- `npm start` - Production mode
- `make run-dev` - Run with Docker Compose (includes S3-compatible backup via rustfs)

**Database:**
- `npm run db:generate` - Generate Better Auth database schema
- `npm run db:migrate` - Run database migrations

**Code quality:**
- `npm run lint` - Run ESLint
- `npm run prettier:check` - Check code formatting
- `npm run prettier:write` - Auto-format code

The application runs at http://localhost:3000

## Testing

**Running tests:**
- `npm test` - Run all tests with coverage
- `npm run test:coverage` - Run tests and view coverage report

**Expected Error Messages:**

During test execution, you will see ERROR messages in stderr. These are EXPECTED and do NOT indicate test failures:

- `INTERNAL_SERVER_ERROR SqliteError: no such table: session` - Occurs when tests intentionally provide invalid session tokens to verify error handling
- `Failed to fetch passkeys: InternalAPIError` - Occurs after invalid session lookup fails

These errors are logged by Better Auth's internal error handling when tests verify that the application correctly handles error conditions (redirecting to login, etc.). Tests pass if assertions succeed - ignore these stderr messages.

**Test Structure:**
- `test/` - Test files organized by feature/functionality
- `test/helpers/` - Shared test utilities and fixtures
  - `test-instance.js` - Creates isolated auth instances for testing
  - `app.js` - Helper functions for app testing

**Test Files:**
- `test/auth/` - Better Auth integration tests
- `test/routes/` - Route handler tests (home, profile, auth, admin, whoami)
- `test/components/` - HTML component rendering tests

**Writing Tests:**
1. Use Node's built-in `test()` and `t.test()` functions from the `node:test` module
2. Use Node's `assert` module for assertions
3. Use `getTestInstance()` from `test/helpers/test-instance.js` to create isolated test auth instances
4. Each test file should be independent and can run in any order
5. Clean up resources (database files) in test teardown

**Coverage Requirements:**
- Statements: 67%+ coverage
- Branches: 74%+ coverage
- Functions: 88%+ coverage
- Lines: 67%+ coverage

**Current Test Suite:**
- 38 passing feature tests
- Coverage: 67.23% statements, 74.13% branches, 88.88% functions, 67.23% lines

## Git Workflow

**IMPORTANT: Commit all work to feature branches, never to `main`.**

**Branch workflow:**
1. Create a feature branch from `main`:
   ```sh
   git checkout main
   git pull
   git checkout -b feature/your-feature-name
   ```

2. Commit changes:
   ```sh
   git add <files>
   git commit -m "feat: add user profile page"
   ```

3. Push and create pull request:
   ```sh
   git push -u origin feature/your-feature-name
   gh pr create --title "feat: add user profile page" --body "Description of changes"
   ```

4. Merge through pull requests only.

**Conventional commits:**
Commitlint enforces this format:
```
<type>(<optional scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `chore:` - Maintenance (dependencies, config)
- `refactor:` - Code restructuring
- `test:` - Tests
- `style:` - Formatting

Examples:
- `feat: add passkey authentication support`
- `fix: resolve session expiration bug`
- `chore(deps): bump hono from 4.10.7 to 4.11.7`
- `docs: update setup instructions`

**Writing guidance:**
Use `elements-of-style:writing-clearly-and-concisely` skill when writing:
- Commit messages (especially bodies and footers)
- Pull request titles and descriptions
- Documentation files (README, CLAUDE.md, etc.)

## Architecture

### Application Structure

```
src/
├── index.js          # Entry point, server setup with graceful shutdown
├── app/
│   ├── app.js        # Main Hono app setup, middleware, route registration
│   ├── routes/       # Route handlers (auth, home, profile, admin, whoami)
│   ├── components/   # HTML rendering functions
│   ├── handlers/     # Business logic handlers (e.g., logout)
│   ├── utils/        # Utilities (cookies, links, redirects)
│   └── demo/         # Demo application showing auth integration
auth.js               # Better Auth configuration
config.js             # Application configuration
static/
└── auth-client.js    # Browser-side auth client
```

### Key Architecture Patterns

**Better Auth Integration:**
- `auth.js` exports a configured Better Auth instance with SQLite backend
- API routes mounted at `/api/auth/*` in `app.js` (line 38-40)
- Session middleware runs on all routes, populating `c.user` and `c.session` (app.js:43-60)
- Plugins: magic links (log to console), passkeys, admin

**Hono Framework:**
- All routes use Hono's context (`c`) for request/response
- Session data available via `c.get('user')` and `c.get('session')`
- Routes registered in app.js using `app.route()`
- Pino logger middleware with sensitive data redaction

**Authentication Flows:**
The app supports multiple authentication methods:
- Username/password (Better Auth's emailAndPassword)
- GitHub OAuth (configured in auth.js:32-35)
- Magic links (URLs logged to console, see auth.js:47-50)
- Passkeys (WebAuthn)

**Database:**
- SQLite database at `./auth.db` (configurable via `DATABASE_URL`)
- Pragma settings for Litestream compatibility (auth.js:10-14)
- Better Auth handles schema management

### Important Configuration

**Environment Variables:**
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - SQLite database path (default: ./auth.db)
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID (required)
- `GITHUB_CLIENT_SECRET` - GitHub OAuth secret (required)

**Allowed Redirects:**
- Configured in `config.js:6`
- Currently whitelist: `["http://localhost:3000/demo"]`
- Expand this array to allow redirects to other origins

**Session Configuration:**
- 7-day expiration (auth.js:41)
- Updates every 24 hours (auth.js:42)

### Demo Application

A separate demo app is mounted at `/demo` to demonstrate cross-application authentication patterns. Access it at http://localhost:3000/demo after logging in.

### Admin UI

Basic admin interface at `/admin` for user management (list users, update roles). The admin plugin is configured in auth.js:56-58.

## Development Notes

**Magic Links:**
Magic link URLs are logged to the console since there's no email sending configured. Check the terminal output for the authentication URL.

**Graceful Shutdown:**
The server handles SIGINT and SIGTERM for clean shutdowns (src/index.js:16-28).

**Git Hooks:**
Husky is configured with commit linting (conventional commits) and lint-staged (prettier on commit).

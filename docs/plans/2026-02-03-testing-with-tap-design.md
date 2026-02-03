# Testing with Tap - Design Document

## Overview

This document describes the test infrastructure for the auth-auth application using [node-tap](https://node-tap.org). The design follows an outside-in testing approach: feature tests verify complete user flows, and unit tests emerge from debugging failures.

## Architecture

### Directory Structure

```
test/
├── features/           # Feature-based integration tests
│   ├── authentication.test.js
│   ├── profile.test.js
│   ├── admin.test.js
│   └── magic-links.test.js
├── helpers/            # Test utilities
│   ├── test-instance.js  # Better Auth test instance adapter
│   └── app.js            # Test app factory
└── setup.js            # Global test configuration
```

### Test Helpers

**Better Auth test instance (`test/helpers/test-instance.js`):**
Adapts Better Auth's built-in test instance helper for use with tap. Better Auth provides `getTestInstance()` which returns:
- `client` - Test client for API calls
- `runWithUser(email, password, callback)` - Executes code with user session context
- `signInWithTestUser()` - Creates default test user and returns `runWithDefaultUser()`

Our wrapper creates an in-memory SQLite database and configures Better Auth with test settings, returning the test instance for each test.

**App factory (`test/helpers/app.js`):**
Creates a Hono app configured for testing with the same middleware stack as production. Accepts a Better Auth instance from the test instance and returns an app ready for request injection. The app uses the same auth instance as the test utilities to ensure session state is consistent.

**Global setup (`test/setup.js`):**
Configures tap settings, timeouts, and suppresses console output during tests.

### Test Instance and App Integration

The test instance and Hono app must share the same Better Auth instance:

```
┌─────────────────────────────────────┐
│  Test (t.beforeEach)                │
│                                     │
│  1. getTestInstance()               │
│     └─> Creates auth instance       │
│         with in-memory DB           │
│                                     │
│  2. createTestApp(auth)             │
│     └─> Uses SAME auth instance    │
│         in Hono middleware          │
│                                     │
│  3. runWithUser(email, pass, fn)   │
│     └─> Sets async context         │
│         with session headers        │
│                                     │
│  4. app.request(url, {headers})    │
│     └─> Headers include session    │
│         recognized by auth instance│
└─────────────────────────────────────┘
```

**Critical:** The auth instance from `testInstance.auth` must be passed to `createTestApp()`. Both the test utilities and the Hono app operate on the same auth instance, ensuring session state is shared.

## Feature Tests

Each feature test verifies complete user flows:

**Authentication (`test/features/authentication.test.js`):**

Happy paths:
- GitHub OAuth redirect and callback
- Username/password login
- Magic link generation and authentication
- Session persistence and expiration
- Logout

Note: Passkey testing is excluded from initial scope due to WebAuthn complexity. Can be added later.

Error cases:
- Invalid credentials (wrong password, nonexistent user)
- Expired sessions
- Malformed login requests (missing fields, invalid email format)
- Session fixation attempts
- Logout without valid session

**Profile (`test/features/profile.test.js`):**

Happy paths:
- View profile when authenticated
- Update profile information
- Profile data accuracy

Error cases:
- Redirect to login when unauthenticated
- Invalid profile update data (empty fields, XSS attempts)
- Update profile with expired session
- Concurrent profile updates

**Admin (`test/features/admin.test.js`):**

Happy paths:
- Admin access to admin panel
- User listing
- Role updates

Error cases:
- Regular user denied access to admin panel
- Unauthenticated user denied access
- Invalid role updates (nonexistent role, invalid user ID)
- Non-admin attempts to update roles
- Privilege escalation attempts

**Admin Role Setup:**
Better Auth's admin plugin provides API methods for managing admin users. During spike, verify the admin API:
- `client.admin.setRole({ userId, role })` - Set user role (if available)
- Alternative: Configure admin user IDs in auth instance setup
- Fallback: Direct database manipulation (least preferred)

The test pattern shows the expected API. Implementation will be confirmed during the spike task.

**Magic links (`test/features/magic-links.test.js`):**

Happy paths:
- Request magic link
- Parse magic link URL from logs
- Authenticate via magic link

Error cases:
- Expired link handling
- Invalid magic link token
- Reusing a magic link (single-use enforcement)
- Magic link for nonexistent user

### Test Pattern

```javascript
import { test } from "tap";
import { getTestInstance } from "../helpers/test-instance.js";
import { createTestApp } from "../helpers/app.js";

test('profile feature tests', async (t) => {
  t.beforeEach(async () => {
    const testInstance = await getTestInstance()
    const app = createTestApp(testInstance.auth)
    return { testInstance, app }
  })

  t.test('user can view their profile', async (t) => {
    const { testInstance, app } = t.context
    const { client, runWithUser } = testInstance

    // Create user using Better Auth API
    await client.signUp({
      email: 'test@example.com',
      password: 'pass123',
      name: 'Test User',
    })

    // Better Auth manages session context automatically
    await runWithUser('test@example.com', 'pass123', async (headers) => {
      const res = await app.request('/profile', { headers })

      t.equal(res.status, 200)
      const html = await res.text()
      t.match(html, /test@example\.com/, 'displays user email')
      t.match(html, /Test User/, 'displays user name')
    })
  })

  t.test('unauthenticated user redirects to login', async (t) => {
    const { app } = t.context
    const res = await app.request('/profile')

    t.equal(res.status, 302, 'redirects unauthenticated request')
    t.match(res.headers.get('location'), /\/login/, 'redirects to login page')
  })

  t.test('admin user has admin access', async (t) => {
    const { testInstance, app } = t.context
    const { client, runWithUser } = testInstance

    // Create admin user
    const user = await client.signUp({
      email: 'admin@example.com',
      password: 'adminpass',
      name: 'Admin User',
    })

    // Set admin role using Better Auth admin API
    // Note: Implementation depends on Better Auth admin plugin API
    await client.admin.setRole({
      userId: user.id,
      role: 'admin',
    })

    await runWithUser('admin@example.com', 'adminpass', async (headers) => {
      const res = await app.request('/admin', { headers })

      t.equal(res.status, 200, 'admin can access admin panel')
    })
  })
})
```

## Database Strategy

Tests use in-memory SQLite databases (`:memory:`):
- Each individual test gets a fresh database (not shared per file)
- Use `t.beforeEach()` to create test instance for each test
- Better Auth's test instance helper manages schema creation automatically
- Session context handled by `runWithUser()` and `signInWithTestUser()`
- No state leaks between tests
- Fast execution (no disk I/O)
- Tests can run in parallel without interference

**Better Auth Test Instance Benefits:**
- Automatic session management via async context
- No manual cookie extraction or header construction
- Proper session isolation between test users
- Built-in support for creating and signing in test users
- Handles authentication headers automatically within `runWithUser()` blocks

## External Dependencies

**GitHub OAuth:**

Better Auth's OAuth flow involves redirects and callbacks that complicate testing. Strategy:

1. **Route-level mocking**: Mock OAuth at the application boundary
   - Test the redirect to GitHub (verify URL, state parameter)
   - Stub the callback handler to inject test user data
   - Skip actual GitHub API calls

2. **Implementation approach**:
   - Create `test/helpers/oauth.js` with mock OAuth responses
   - Override Better Auth's GitHub provider in test app factory
   - Return synthetic GitHub user profiles for callback tests

3. **What to test**:
   - OAuth redirect includes correct client_id and scopes
   - Callback creates user session with GitHub profile data
   - State parameter prevents CSRF
   - Error handling for failed OAuth (denied permission, invalid state)

4. **Optional**: Use real GitHub OAuth in development with test GitHub app credentials for manual verification

## Configuration

**Package.json scripts:**
```json
"scripts": {
  "test": "tap",
  "test:watch": "tap --watch",
  "test:coverage": "tap --coverage-report=html"
}
```

**Tap configuration (`.taprc`):**
```yaml
files:
  - "test/**/*.test.js"
timeout: 10
coverage: true
```

Note: 10-second timeout is appropriate for in-memory tests. If tests exceed this, investigate performance issues.

## Implementation Approach

**Installation:**
```bash
npm install --save-dev tap
```

**Setup:**
Add to `.gitignore`:
```
coverage/
.tap/
```

**Build order:**
0. **Spike: Investigate Better Auth test utilities** (2 hours max, document findings)
   - Clone Better Auth repository and locate test instance implementation
   - Verify `getTestInstance()` functionality and async context behavior
   - Test if `runWithUser()` works outside vitest
   - Check admin plugin API for role management
   - Build minimal proof-of-concept with tap
   - Decision: Use directly, adapt, or implement alternative
   - Document findings in spike report

1. Set up test infrastructure (tap config, .taprc, .gitignore)
2. Create test instance adapter based on spike findings
3. Create app factory for Hono test instances
4. First simple test (unauthenticated home page)
5. First authenticated test (signup + login + profile view)
6. Expand authentication tests (logout, error cases)
7. Add admin tests (verify admin role setup from spike)
8. Add magic link tests (if Better Auth provides utilities)
9. Add remaining features (profile, utilities)
10. Review coverage and add missing tests

**Initial scope:**
Start with authentication and profile viewing. These flows cover the core application value. Expand to admin features and the demo app after core tests pass reliably. Passkey testing is deferred due to WebAuthn complexity.

**Key Integration Points:**
- Better Auth's test instance helper is designed for vitest but can be adapted for tap
- The `runWithUser()` function provides async context for session management
- The `client` from test instance can be used for direct Better Auth API calls
- Creating test users should use Better Auth's API rather than direct database manipulation

## Developer Workflow

- Run `npm test` to execute all tests
- Run `npm run test:watch` during development for live feedback
- Feature tests catch regressions across entire flows
- Add focused tests when debugging failures
- Unit tests emerge naturally from debugging

## Success Criteria

- All critical user flows have feature tests
- Tests run in under 10 seconds (total suite time)
- Tests are reliable (no flakes when run in isolation or parallel)
- Test isolation verified:
  - Tests pass when run in random order
  - Tests pass when run in parallel
  - Individual test passes same as full suite
- New features include tests before merging
- Coverage reaches 70-80% of critical paths
- Zero direct database manipulation (use Better Auth APIs only)

## Implementation Notes

**Spike Task: Better Auth Test Utilities Investigation**

**Goal:** Validate that Better Auth's test utilities can be used with tap.

**Tasks:**
1. Clone Better Auth repository: `git clone https://github.com/better-auth/better-auth.git`
2. Locate test instance implementation (likely in `/packages/better-auth/src/test-utils/` or similar)
3. Read source code to understand:
   - How `getTestInstance()` creates auth instances
   - How `runWithUser()` manages async context
   - Dependencies on vitest-specific features
   - Admin plugin API for role management
   - Magic link testing utilities (if any)

4. Build proof-of-concept:
   ```javascript
   // test-spike.js - minimal tap test with Better Auth utilities
   import { test } from "tap";
   // Import or copy Better Auth test utilities

   test("spike: Better Auth test instance works with tap", async (t) => {
     const testInstance = await getTestInstance(/* config */);
     const { client, runWithUser } = testInstance;

     await client.signUp({ email: "test@example.com", password: "pass123" });

     await runWithUser("test@example.com", "pass123", async (headers) => {
       t.ok(headers, "headers provided");
       // Verify headers have session token
     });
   });
   ```

5. Document findings:
   - Does it work as-is? ✓/✗
   - What needs adaptation?
   - Admin API available? Method signatures?
   - Magic link test utilities?
   - Alternative approach if spike fails?

**Reference:**
- Better Auth docs: https://www.better-auth.com/docs/reference/contributing#using-the-test-instance-helper
- Better Auth repo: https://github.com/better-auth/better-auth

**Acceptance Criteria:**
- Proof-of-concept runs successfully with tap, OR
- Clear documentation of why it won't work and alternative approach

**Time Box:** 2 hours maximum. If not working after 2 hours, document blockers and propose alternative (manual implementation).

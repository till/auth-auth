# Auth Instance Dependency Injection Design

**Date:** 2026-02-08
**Status:** Implemented
**Commit:** 1a0519b

## Problem

The application duplicates Hono setup logic in two places:

1. `src/app/app.js` imports the singleton `auth` instance from `src/auth.js`
2. `test/helpers/app.js` recreates the entire Hono app to inject test auth instances

This duplication creates maintenance burden. Changes to app.js require parallel changes to test/helpers/app.js. The test helper contains 292 lines of duplicated code.

Additionally, route handlers import the singleton auth instance directly, making them difficult to test in isolation.

## Solution

Use Hono's context to inject the auth instance, eliminating singleton imports while keeping route structure unchanged. This leverages Hono's built-in dependency injection pattern.

### Architecture Changes

**Current flow:**

```
src/auth.js exports singleton auth
    ↓
src/app/app.js imports singleton, creates Hono app
    ↓
src/app/routes/*.js import singleton directly
```

**Target flow:**

```
src/auth.js exports singleton auth (for production)
    ↓
src/index.js passes auth to createApp(auth)
    ↓
src/app/app.js stores auth in context via middleware
    ↓
src/app/routes/*.js read auth from context (c.get("auth"))
```

### Implementation Details

#### 1. Convert app.js to Factory Function

Convert `src/app/app.js` from exporting a singleton to exporting a factory function that accepts auth:

```javascript
// Before:
import { auth } from "../auth.js";
const app = new Hono();
// ... setup ...
export default app;

// After:
export function createApp(auth) {
  const app = new Hono();

  // Inject auth into context - available to all routes
  app.use("*", (c, next) => {
    c.set("auth", auth);
    return next();
  });

  // ... rest of setup ...
  return app;
}
```

Update `src/index.js` to call the factory:

```javascript
import { createApp } from "./app/app.js";
import { auth } from "./auth.js";

const app = createApp(auth);
```

#### 2. Update app.js Internals

The app.js file itself uses auth in several places that must be updated:

**Better Auth API routes (line 38-40):**

```javascript
// Before (uses singleton import):
import { auth } from "../auth.js";
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// After (uses parameter):
export function createApp(auth) {
  // ...
  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw); // Uses parameter, not context
  });
}
```

**Session middleware (line 43-60):**

```javascript
// Before (uses singleton import):
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  // ...
});

// After (reads from context):
app.use("*", async (c, next) => {
  const auth = c.get("auth");
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  // ...
});
```

**Critical:** Auth context middleware must run before session middleware. Order matters:

```javascript
export function createApp(auth) {
  const app = new Hono();

  // 1. Auth context middleware (FIRST)
  app.use("*", (c, next) => {
    c.set("auth", auth);
    return next();
  });

  // 2. Better Auth API routes
  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  // 3. Session middleware (reads auth from context)
  app.use("*", async (c, next) => {
    const auth = c.get("auth");
    // ...
  });
}
```

#### 3. Update Routes to Read from Context

Routes continue to export Hono instances but read auth from context instead of importing the singleton.

**Files to update (verified via grep):**

- `src/app/routes/auth.js` - Uses auth extensively
- `src/app/routes/admin.js` - Uses auth.api.listUsers
- `src/app/handlers/logout.js` - Called by auth routes

**Pattern with defensive check:**

```javascript
// Before:
import { auth } from "../../auth.js";
export default new Hono()
  .post("/signup", async (c) => {
    await auth.api.signUpEmail(...);
  });

// After:
// Remove auth import
export default new Hono()
  .post("/signup", async (c) => {
    const auth = c.get("auth");
    if (!auth) {
      throw new Error("Auth not available - middleware order issue");
    }
    await auth.api.signUpEmail(...);
  });
```

**For handlers:**

```javascript
// Before:
import { auth } from "../../auth.js";
export async function logout(c) {
  await auth.api.signOut(...);
}

// After:
// Remove auth import
export async function logout(c) {
  const auth = c.get("auth");
  if (!auth) {
    throw new Error("Auth not available - middleware order issue");
  }
  await auth.api.signOut(...);
}
```

**Note:** The defensive `if (!auth)` check catches middleware ordering issues during development. In production, auth is always available because middleware runs first.

#### 4. Route Registration

Route registration in `createApp` remains unchanged - routes still export Hono instances:

```javascript
export function createApp(auth) {
  const app = new Hono();

  // Inject auth into context
  app.use("*", (c, next) => {
    c.set("auth", auth);
    return next();
  });

  // ... middleware setup ...

  // Register routes - no changes needed
  app.route("/", authHandler);
  app.route("/", homeHandler);
  app.route("/", profileHandler);
  app.route("/", whoamiHandler);
  app.route("/", adminHandler);
  app.route("/demo", demoHandler);

  return app;
}
```

#### 5. Test Simplification

Delete `test/helpers/app.js` (292 lines removed).

Update all test files to import `createApp` directly:

```javascript
// Before:
import { createTestApp } from "../helpers/app.js";
import { getTestInstance } from "../helpers/test-instance.js";

const auth = await getTestInstance();
const app = createTestApp(auth);

// After:
import { createApp } from "../../src/app/app.js";
import { getTestInstance } from "../helpers/test-instance.js";

const auth = await getTestInstance();
const app = createApp(auth);
```

Tests now use the same app creation logic as production. Changes to `src/app/app.js` automatically apply to tests.

### Pre-Migration Analysis

Before making any changes, verify what needs updating:

**Step 0: Audit auth usage**

```bash
# Find all files importing auth
grep -r "from.*auth\.js" src/ --include="*.js"

# Verify test/helpers/app.js auth routes match production
diff <(grep -A 5 "\.post\|\.get" src/app/routes/auth.js) \
     <(grep -A 5 "\.post\|\.get" test/helpers/app.js)
```

**Known files requiring updates:**

- `src/app/app.js` - Imports auth singleton, uses in API routes and session middleware
- `src/app/routes/auth.js` - Imports auth, uses extensively
- `src/app/routes/admin.js` - Imports auth, uses auth.api.listUsers
- `src/app/handlers/logout.js` - Imports auth, uses auth.api.signOut
- `src/index.js` - Needs to call createApp(auth)

**Critical verification:** Compare test/helpers/app.js auth route implementations (line 51-282) against production routes. If they differ, document differences before proceeding.

### Migration Strategy

Execute changes in this order to maintain a working build at each step:

1. **Refactor app.js to createApp**
   - Convert to factory function that accepts auth parameter
   - Add auth context middleware as FIRST middleware
   - Update Better Auth API routes to use auth parameter (not context)
   - Update session middleware to read auth from context
   - Remove singleton auth import

2. **Update index.js** - Call `createApp(auth)` with singleton

3. **Run tests** - Should still pass (routes still use singleton imports, but context is available)

4. **Update auth routes** - Change `src/app/routes/auth.js` to read auth from context with defensive checks

5. **Update admin routes** - Change `src/app/routes/admin.js` to read auth from context

6. **Update logout handler** - Read auth from context in `src/app/handlers/logout.js`

7. **Run tests** - Verify auth routes work with context

8. **Update test files** - Replace `createTestApp` imports with `createApp`

9. **Delete test/helpers/app.js** - Remove 292 lines of duplication

10. **Run full test suite** - Verify all tests pass

11. **Verify no singleton imports remain** - Run `grep -r "from.*auth\.js" src/` and confirm only src/index.js remains

Each step maintains a working build. The app continues to function even with routes partially migrated (some using imports, some using context).

### Rollback Strategy

If issues arise in production:

1. **Immediate rollback**: Revert to previous git commit - application reverts to singleton pattern
2. **Partial rollback**: Keep createApp but revert route changes - app still works with singleton imports
3. **Test failure**: Fix broken tests before merging - run full test suite in CI

Each commit is independently revertable.

### Benefits

**Eliminates duplication:** Tests use production app creation logic. One place to maintain app structure.

**Improves testability:** Auth instance can be swapped via createApp parameter, enabling isolated testing.

**Leverages Hono patterns:** Uses Hono's context system as designed, not fighting the framework.

**Minimal changes:** Routes keep their existing structure - only import statements change.

**Reduces maintenance:** Changes to app structure happen in one file, not two.

**Gradual migration:** Routes can be migrated one at a time - app works with mixed approaches.

## Risks and Mitigations

**Risk:** Breaking existing tests during migration
**Mitigation:** Migrate one file at a time, run tests after each change. Build remains functional at every step.

**Risk:** Missing an auth import somewhere
**Mitigation:** Run step 0 audit before starting. After refactoring, verify: `grep -r "from.*auth\.js" src/` should only show src/index.js.

**Risk:** Middleware ordering - routes execute before auth context is set
**Mitigation:** Auth context middleware MUST be first middleware registered. Better Auth API routes use parameter (closure), not context. Session middleware runs after context middleware.

**Risk:** Route tries to read auth before middleware runs
**Mitigation:** Add defensive `if (!auth)` checks in all routes that read from context. This catches ordering issues during development.

**Risk:** Context not available when expected
**Mitigation:** Auth middleware runs first (before session middleware). All routes have access. Defensive checks catch issues early.

**Risk:** Type safety - wrong object passed as auth
**Mitigation:** Add validation in createApp:

```javascript
if (!auth?.api?.getSession) {
  throw new Error("Invalid auth instance passed to createApp");
}
```

**Risk:** Test/production auth routes have diverged
**Mitigation:** Run diff in step 0 to verify routes match. If different, document and decide whether to align them first.

**Risk:** Production failure after deployment
**Mitigation:** Run full test suite in CI. Have rollback plan ready (revert git commit).

## Alternative Considered: Factory Pattern

An alternative approach would convert all routes to factory functions that accept auth as a parameter:

```javascript
export function createAuthRoutes(auth) {
  return new Hono().post("/signup", async (c) => {
    await auth.api.signUpEmail(...);
  });
}
```

**Why context approach is better:**

- Less churn - routes keep their export structure
- Cleaner handler signatures - no awkward wrapper functions
- Follows Hono conventions - context is designed for this
- Smaller diff - easier to review and test
- No "for consistency" changes to routes that don't use auth

## Architecture Notes

### Better Auth API Routes vs. Application Routes

The design distinguishes between two types of routes:

1. **Better Auth API routes** (`/api/auth/*`) - These are registered with `app.on()` and directly call `auth.handler(c.req.raw)`. They use the auth parameter from closure, not context. This is intentional - these routes are thin wrappers around Better Auth's handler.

2. **Application routes** (auth, admin, profile, etc.) - These are registered with `app.route()` and contain application logic. They read auth from context via `c.get("auth")`.

This separation is important for middleware ordering. The Better Auth API routes don't depend on context; they work immediately after `createApp(auth)` is called.

## Success Criteria

- All tests pass (38 tests, coverage maintained at 67%+)
- `test/helpers/app.js` deleted (292 lines removed)
- Auth routes read from context instead of importing singleton
- `src/app/app.js` exports `createApp(auth)` function
- Auth context middleware is first middleware registered
- Better Auth API routes use auth parameter (closure)
- Session middleware reads auth from context
- `createApp` validates auth instance has required methods
- Only `src/index.js` imports singleton auth (verified via grep)
- Test files import `createApp` from `src/app/app.js`
- Build remains functional at every migration step
- Routes include defensive checks for auth availability

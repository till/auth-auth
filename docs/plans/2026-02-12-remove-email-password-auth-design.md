# Design: Remove Email/Password Authentication

**Date:** 2026-02-12
**Status:** Proposed

## Overview

This design removes email/password authentication from the application, leaving GitHub OAuth and magic links as the only authentication methods. The application supports no production users yet, so we can make breaking changes safely.

## Goals

- Remove all email/password authentication flows
- Simplify authentication to passwordless methods only
- Clean up database schema by removing password-related columns
- Unify signup and login into a single page

## Non-Goals

- Migrating existing users (none exist)
- Supporting password reset flows (removed entirely)
- Adding new authentication providers

## Current State

The application supports three authentication methods:

1. **Email/password** - Users register and login with credentials
2. **GitHub OAuth** - Social login via GitHub
3. **Magic links** - Passwordless email authentication

Better Auth manages authentication with these components:

- `user` table - Stores user profile data (name, email, role)
- `account` table - Stores authentication credentials, including `password` column
- `emailAndPassword` plugin enabled in `src/auth.js`
- Separate `/login` and `/signup` routes with password forms

## Proposed Changes

### 1. Better Auth Configuration

**File:** `src/auth.js`

Remove the `emailAndPassword` configuration block:

```javascript
export const auth = betterAuth({
  database: db,
  baseURL: `http://${appConfig.host}:${appConfig.port}`,
  logger: {
    disabled: false,
    level: "debug",
  },
  // Remove this block:
  // emailAndPassword: {
  //   enabled: true,
  // },
  socialProviders: {
    github: {
      clientId: appConfig.social.github.id,
      clientSecret: appConfig.social.github.secret,
    },
  },
  // ... rest unchanged
});
```

### 2. Database Schema Changes

The `user` table remains unchanged. The `account` table loses the `password` column.

**Before:**

```sql
account (
  id, accountId, providerId, userId,
  accessToken, refreshToken, idToken,
  accessTokenExpiresAt, refreshTokenExpiresAt,
  scope, password, createdAt, updatedAt
)
```

**After:**

```sql
account (
  id, accountId, providerId, userId,
  accessToken, refreshToken, idToken,
  accessTokenExpiresAt, refreshTokenExpiresAt,
  scope, createdAt, updatedAt
)
```

**Migration steps:**

1. Run `npm run db:generate` to regenerate schema without `emailAndPassword`
2. Run `rm auth.db` to delete the old database
3. Run `npm run db:migrate` to create fresh database

### 3. Route Changes

**File:** `src/app/routes/auth.js`

Remove these handlers entirely:

- `GET /signup` (lines 42-100) - Signup page
- `POST /signup` (lines 101-130) - Signup form handler
- `POST /login` (lines 131-157) - Password login handler

The `/signup` route will return 404 after removal.

Keep and modify:

- `GET /login` - Update to show only GitHub and magic link options
- `GET /logout` and `POST /logout` - No changes
- `GET /login/magic-link` and `POST /login/magic-link` - No changes

**Updated `/login` handler:**

```javascript
.get("/login", (c) => {
  const error = c.req.query("error");
  const success = c.req.query("success");
  const redirectUrl = validateRedirectUrl(c.req.query("redirect_url"), "");

  return c.html(
    Layout({
      title: "Sign In",
      children: html`
        <h1>Sign In</h1>
        ${Navigation({
          back: { href: "/", text: "Back to Home" },
        })}
        ${Message({ error, success })}
        ${FormSection({
          children: html`
            ${MagicLinkButton({ redirectUrl })}
            ${GitHubButton({ redirectUrl })}
          `,
        })}
      `,
    }),
  );
})
```

### 4. Component Changes

**File:** `src/app/components/login.js`

Remove the `Login` component (email/password form).

Keep these components:

- `GitHubButton` - No changes
- `MagicLinkButton` - No changes

Update imports in `src/app/routes/auth.js`:

```javascript
// Before:
import { GitHubButton, Login, MagicLinkButton } from "../components/login.js";

// After:
import { GitHubButton, MagicLinkButton } from "../components/login.js";
```

### 5. Test Changes

Update test files to remove email/password test cases:

**Tests to remove:**

- Tests that POST to `/signup` with email/password credentials
- Tests that POST to `/login` with email/password credentials
- Tests that verify signup page renders password fields
- Any test helpers that create users with passwords

**Tests to update:**

- Login page tests - Verify only GitHub and magic link buttons appear
- Component rendering tests - Remove `Login` component tests

**Tests to keep:**

- Magic link flow tests
- GitHub OAuth tests
- Session management tests
- Admin functionality tests

Coverage requirements remain unchanged (67%+ statements, 74%+ branches, 88%+ functions, 67%+ lines).

### 6. Documentation Updates

**File:** `CLAUDE.md`

Update the "Authentication Flows" section to reflect only two methods:

```markdown
**Authentication Flows:**
The app supports two authentication methods:

- GitHub OAuth (configured in auth.js:48-52)
- Magic links (URLs logged to console, see auth.js:62-71)
```

Remove references to username/password and `emailAndPassword` configuration.

## Implementation Steps

1. Update Better Auth configuration in `src/auth.js`
2. Regenerate database schema and create fresh database
3. Remove signup routes from `src/app/routes/auth.js`
4. Remove password login handler from `src/app/routes/auth.js`
5. Update login page to show only GitHub and magic link options
6. Remove `Login` component from `src/app/components/login.js`
7. Remove email/password tests from test suite
8. Update login page tests to verify new structure
9. Update `CLAUDE.md` documentation
10. Run full test suite to verify coverage requirements met
11. Manual testing of login flow with both methods

## Risks and Mitigations

**Risk:** Tests fail after removal
**Mitigation:** Update tests incrementally with implementation changes

**Risk:** Better Auth schema generation fails
**Mitigation:** Check Better Auth documentation for `emailAndPassword: false` or complete removal

**Risk:** Breaking other routes that depend on signup
**Mitigation:** Search codebase for `/signup` references before removal

## Success Criteria

- Application starts without errors
- Login page displays only GitHub and magic link options
- GET `/signup` returns 404
- POST `/login` with password returns 404
- All tests pass with coverage requirements met
- Database schema lacks password column in `account` table
- Manual testing confirms both auth methods work

## Future Considerations

None. This is a complete removal with no planned follow-up work.

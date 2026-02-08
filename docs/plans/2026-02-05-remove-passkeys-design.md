# Remove Passkey Authentication Support

**Date:** 2026-02-05

**Status:** Proposed

## Goal

Remove passkey authentication to reduce maintenance burden. The application will retain email/password, GitHub OAuth, and magic link authentication.

## Current State

The application uses Better Auth with four authentication methods:

- Email/password (Better Auth's emailAndPassword)
- GitHub OAuth
- Magic links (URLs logged to console)
- Passkeys (WebAuthn via `@better-auth/passkey` plugin)

Passkeys appear in:

- `auth.js` - Plugin configuration
- `package.json` - Dependency declaration
- Route handlers (`src/app/routes/profile.js`, `src/app/routes/auth.js`)
- UI components (`src/app/components/profile.js`, `src/app/components/login.js`)
- Client-side code (`static/auth-client.js`)
- Test helpers (`test/helpers/test-instance.js`, `test/helpers/app.js`)
- Database tables (managed by Better Auth)

## Approach

We will remove passkeys entirely. Since this is a prototype with no production data, we will regenerate the database schema rather than write migrations. This drops passkey tables automatically.

**Risk:** Low. Passkeys are one of several authentication methods. Users can still authenticate via email/password, GitHub, or magic links.

## Implementation

### Code Changes

**auth.js** (lines 3, 55):

- Remove `import { passkey } from "@better-auth/passkey"`
- Remove `passkey()` from plugins array

**package.json** (line 18):

- Remove `"@better-auth/passkey": "^1.4.18"` dependency

**src/app/routes/profile.js** (lines 5-9, 21-29, 38, 48-70):

- Remove `AddPasskeySection`, `PasskeyList` imports
- Remove passkey fetching logic (lines 21-29)
- Remove passkey UI components from profile page (line 38)
- Remove `/profile/passkey/delete` POST route (lines 48-70)

**src/app/routes/auth.js** (lines 9, 40, 228-267):

- Remove `PasskeyButton` import
- Remove `PasskeyButton` from login page (line 40)
- Remove `/login/passkey` GET route (lines 228-267)

**src/app/components/profile.js** (lines 19-54):

- Remove `PasskeyList` component
- Remove `AddPasskeySection` component

**src/app/components/login.js** (lines 36-48):

- Remove `PasskeyButton` component export and function

**static/auth-client.js** (lines 3, 7, 10, 12-41, 43-58, 83-95):

- Remove `passkeyClient` import
- Remove `passkeyClient()` from plugins
- Remove `passkey` export
- Remove `handlePasskeySignIn` function
- Remove `handleAddPasskey` function
- Remove passkey form event listener setup

**test/helpers/test-instance.js** (lines 3, 20-22, 72):

- Remove passkey import
- Remove passkey from test auth instance
- Update comments about expected errors

**test/helpers/app.js** (lines 9, 102):

- Remove `PasskeyButton` import and usage

**Documentation:**

**CLAUDE.md** (lines 70, 160, 199, 214):

- Remove passkey from expected error messages list (line 70)
- Remove passkey from commit message examples (line 160)
- Remove passkeys from plugins list (line 199)
- Remove Passkeys from authentication methods list (line 214)

**README.md** (lines 41, 49, 50):

- Remove passkey references from feature descriptions

### Dependencies

Remove the package:

```bash
npm uninstall @better-auth/passkey
```

This command removes the package and updates both `package.json` and `package-lock.json` automatically.

### Database

Regenerate schema after code changes:

```bash
npm run db:generate
npm run db:migrate
```

Better Auth will drop passkey-related tables (`passkey`, `passkey_credential`, etc.) and create a fresh schema without them.

### Configuration

No changes needed to `.envrc`, environment variables, or `config.js`. Better Auth handles the absence of the passkey plugin automatically.

## Testing

### Automated Tests

Update test helpers:

- `test/helpers/test-instance.js` - Remove passkey plugin and update error comments
- `test/helpers/app.js` - Remove PasskeyButton references

Run the test suite:

```bash
npm test
```

Expected: All 38 tests pass. Coverage thresholds remain met (67%+ statements, 74%+ branches, 88%+ functions). Coverage percentages may increase slightly as passkey code is removed.

### Manual Verification

After implementation, verify each auth flow:

**Email/password authentication:**

- Sign up with new account
- Sign in with existing account
- View profile page

**GitHub OAuth:**

- Sign in with GitHub button
- Verify redirect and session creation

**Magic links:**

- Request magic link
- Check console for magic link URL
- Use magic link to authenticate

**UI verification:**

- Login page shows no passkey button
- Signup page has no passkey references
- Profile page shows no "Add Passkey" section
- Profile page shows no passkey list

**Admin functionality:**

- Access `/admin` route
- Verify user management works

**Demo app:**

- Access `/demo` route
- Verify cross-app auth works

**Expected behavior:**

- No passkey-related UI elements visible
- No console errors related to passkeys
- All other auth methods function normally
- Session management unaffected

## Implementation Order

**Note:** Steps 1-7 should be completed without running the application. Start the app only after database regeneration completes.

1. Remove passkey from `auth.js` configuration
2. Remove passkey routes from `src/app/routes/auth.js` and `src/app/routes/profile.js`
3. Remove passkey components from `src/app/components/profile.js` and `src/app/components/login.js`
4. Remove passkey client code from `static/auth-client.js`
5. Remove passkey from test helpers
6. Update documentation files (`CLAUDE.md`, `README.md`)
7. Uninstall `@better-auth/passkey` package
8. Regenerate database schema and run migrations
9. Run automated test suite
10. Manual testing of all auth flows
11. Check UI for lingering references
12. Search codebase for any remaining references: `git grep -i passkey`

## Rollback

If issues arise, abandon the `remove-passkeys` branch and restore passkeys from `main`.

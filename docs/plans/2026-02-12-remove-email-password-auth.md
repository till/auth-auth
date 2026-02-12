# Remove Email/Password Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove email/password authentication, keeping only GitHub OAuth and magic links.

**Architecture:** Remove Better Auth's emailAndPassword configuration, delete all password-related routes/components/tests atomically, regenerate database schema.

**Tech Stack:** Better Auth, Hono, Node.js test runner

**Approach:** Test database regeneration first, then batch all deletions together. Four commits total.

---

## Task 1: Verify Database Schema Regeneration

**Purpose:** Confirm Better Auth removes password fields when emailAndPassword is disabled, BEFORE deleting any code.

**Step 1: Remove emailAndPassword config**

Edit `src/auth.js`, delete lines 45-47:

```javascript
// Delete these lines:
  emailAndPassword: {
    enabled: true,
  },
```

**Step 2: Test schema generation**

```bash
npm run db:generate
```

Expected: Succeeds without errors

**Step 3: Check generated schema**

```bash
rm auth.db
npm run db:migrate
sqlite3 auth.db ".schema account"
```

Expected: `account` table has NO `password` column

**Step 4: If schema still has password column**

Better Auth may keep the column. Check Better Auth docs or inspect generated migration files in `better-auth_migrations/`. If password persists, document this and accept it (no users exist, so it's harmless).

**Step 5: Rollback for now**

```bash
git checkout src/auth.js
rm auth.db
npm run db:migrate
```

We'll apply the auth.js change in the next task. This was just a test.

**Result:** You now know database regeneration works.

---

## Task 2: Remove All Password Auth Code

**Important Finding from Task 1:** The `password` column in the `account` table persists in the database schema even after disabling emailAndPassword. This is Better Auth's behavior - the schema is not cleaned up automatically. This is acceptable since no users exist.

**Purpose:** Delete routes, handlers, components, and tests in one atomic commit.

**Files to modify:**

- `src/auth.js`
- `src/app/routes/auth.js`
- `src/app/components/login.js`
- `test/features/authentication.test.js`

**Step 1: Remove emailAndPassword config**

Edit `src/auth.js`, delete lines 45-47:

```javascript
// Delete:
  emailAndPassword: {
    enabled: true,
  },
```

**Step 2: Remove password auth routes**

Edit `src/app/routes/auth.js`:

1. Change imports (line 5):

```javascript
// Before:
import { GitHubButton, Login, MagicLinkButton } from "../components/login.js";
// After:
import { GitHubButton, MagicLinkButton } from "../components/login.js";
```

2. Delete entire GET `/signup` handler (lines 42-100)
3. Delete entire POST `/signup` handler (lines 101-130)
4. Delete entire POST `/login` handler (lines 131-157)

Keep GET `/login`, GET/POST `/logout`, GET/POST `/login/magic-link` unchanged for now.

**Step 3: Remove Login component**

Edit `src/app/components/login.js`:

Delete the entire `Login` function (lines 44-82). File should now only export `MagicLinkButton` and `GitHubButton`.

**Step 4: Remove password auth tests**

Edit `test/features/authentication.test.js`:

Delete these entire test cases:

- "user can sign up with email and password"
- "signup can be done multiple times for different users"
- "signup form is accessible"
- "login form is accessible"

Keep "user can logout" test.

**Step 5: Run tests**

```bash
npm test
```

Expected: Tests pass (should be ~34 tests now, down from 38)

**Step 6: Commit**

```bash
git add src/auth.js src/app/routes/auth.js src/app/components/login.js test/features/authentication.test.js
git commit -m "feat: remove email/password authentication

Removes:
- emailAndPassword config from Better Auth
- GET/POST /signup routes
- POST /login password handler
- Login component
- Password auth tests

Keeps GitHub OAuth and magic links."
```

---

## Task 3: Update Login Page to Show Only Passwordless Options

**Purpose:** Remove password form from login page, show only GitHub and magic link buttons.

**Step 1: Update GET /login handler**

Edit `src/app/routes/auth.js`, replace the GET `/login` handler with:

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

**Step 2: Run prettier**

```bash
npm run prettier:write
```

**Step 3: Commit**

```bash
git add src/app/routes/auth.js
git commit -m "feat: update login page to show only passwordless auth"
```

---

## Task 4: Update Documentation

**Purpose:** Update CLAUDE.md to reflect new auth methods.

**Step 1: Find Authentication Flows section**

Open `CLAUDE.md`, locate the "Authentication Flows" section under "Key Architecture Patterns".

**Step 2: Update it**

Change from:

```markdown
**Authentication Flows:**
The app supports multiple authentication methods:

- Username/password (Better Auth's emailAndPassword)
- GitHub OAuth (configured in auth.js:32-35)
- Magic links (URLs logged to console, see auth.js:47-50)
```

To:

```markdown
**Authentication Flows:**
The app supports two authentication methods:

- GitHub OAuth (configured in auth.js:48-52)
- Magic links (URLs logged to console, see auth.js:62-71)
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update authentication methods"
```

---

## Task 5: Final Verification

**Purpose:** Verify everything works before declaring done.

**Step 1: Regenerate database**

```bash
rm auth.db
npm run db:generate
npm run db:migrate
```

**Step 2: Run full test suite**

```bash
npm test
```

Expected:

- All tests pass (~34 tests)
- Coverage: 67%+ statements, 74%+ branches, 88%+ functions, 67%+ lines

**Step 3: Start dev server**

```bash
npm run dev
```

**Step 4: Manual checks**

In browser:

1. Visit http://localhost:3000/login
   - ✓ Shows "Sign In" heading
   - ✓ Shows "Magic Link" button
   - ✓ Shows "GitHub" button
   - ✓ No email/password form

2. Visit http://localhost:3000/signup
   - ✓ Returns 404

3. Test magic link:
   - Click "Magic Link" button
   - Enter email address
   - Check terminal for magic link URL
   - Visit the URL
   - ✓ Redirects to profile

**Step 5: Stop server (Ctrl+C)**

**Step 6: Check formatting**

```bash
npm run prettier:check
```

If fails, run `npm run prettier:write` and commit formatting fixes.

**Step 7: Verify database schema**

```bash
sqlite3 auth.db ".schema account"
```

Confirm: `password` column absent (or present but unused if Better Auth kept it).

---

## Success Criteria

- [x] Application starts without errors
- [x] Login page shows only GitHub and magic link options
- [x] GET `/signup` returns 404
- [x] POST `/login` with password returns 404
- [x] All tests pass (~34 tests)
- [x] Test coverage meets requirements (67%+ statements, 74%+ branches, 88%+ functions, 67%+ lines)
- [x] Magic link authentication works
- [x] GitHub OAuth button appears
- [x] Documentation updated
- [x] Code passes prettier check

## Commit History

Should have 4 commits:

1. `feat: remove email/password authentication`
2. `feat: update login page to show only passwordless auth`
3. `docs: update authentication methods`
4. `style: apply prettier formatting` (if needed)

## Next Steps

After verification passes:

1. Use `superpowers:finishing-a-development-branch` to create PR or merge
2. Clean up worktree

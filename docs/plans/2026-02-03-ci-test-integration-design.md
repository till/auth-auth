# CI Test Integration Design

## Overview

Add test execution to the GitHub Actions CI pipeline. Tests run in parallel with existing smoke and shell checks, blocking the Docker build if they fail. Coverage collection is skipped in CI for speed.

## Pipeline Structure

**Current workflow:**

```
commitlint
    ↓
  ┌─────────┬─────────┐
  │         │         │
shell     smoke       │
  │         │         │
  └─────────┴─────────┤
                      ↓
                    build
```

**New workflow:**

```
commitlint
    ↓
  ┌─────────┬─────────┬─────────┐
  │         │         │         │
shell     smoke      test       │
  │         │         │         │
  └─────────┴─────────┴─────────┤
                                ↓
                              build
```

**Changes:**

- Add `test` job running in parallel with `smoke` and `shell`
- Modify `build` job dependencies from `[smoke, shell]` to `[smoke, shell, test]`
- Build runs only if all three jobs succeed

## Test Job Specification

**Location:** `.github/workflows/ci.yml`

**Job definition:**

```yaml
test:
  needs:
    - commitlint
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
    - uses: actions/setup-node@v4
      with:
        node-version-file: ".nvmrc"
    - run: npm ci
    - run: npm test -- --no-coverage
```

**Configuration details:**

- **Dependency:** Runs after `commitlint`, in parallel with `smoke` and `shell`
- **Environment:** Ubuntu latest with Node.js 22 (from `.nvmrc`)
- **Install:** `npm ci` for reproducible dependency installation
- **Test command:** `npm test -- --no-coverage` skips coverage collection

## Coverage Strategy

**Decision:** Skip coverage in CI.

**Rationale:**

- Coverage is useful locally during development
- CI needs only pass/fail status
- Skipping coverage saves 20-30% execution time
- Reduces log noise from coverage reports
- No artifacts to store or process

**Local development:** Developers run `npm test` locally with coverage (default behavior).

## Expected Behavior

**Test execution:**

- Tap runs all 38 tests in `test/features/`
- Uses 30-second timeout from `.taprc`
- Tests run with in-memory SQLite databases
- Each test gets isolated Better Auth instance

**Expected output:**

- Better Auth ERROR messages appear in logs (documented as expected behavior)
- Job fails if any test fails
- Job succeeds if all 38 tests pass

**Failure handling:**

- If tests fail, build job does not run
- PR cannot merge until tests pass
- Developers see test failures immediately

## Implementation Notes

**Single file change:** `.github/workflows/ci.yml`

**Modifications required:**

1. Add `test` job after `smoke` job
2. Update `build.needs` to include `test`

**No other changes needed:**

- Tests already configured in `package.json`
- `.taprc` configuration works in CI
- Test helpers handle database setup
- No environment variables required

## Success Criteria

- Test job runs in parallel with smoke and shell jobs
- Build job waits for test job to complete
- Tests pass in CI environment
- Total CI time does not increase significantly (parallel execution)
- PR status checks include test results

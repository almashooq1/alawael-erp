# ADR-021: Sprint runner uses temp Jest config to avoid command-line length limits

## Status

Accepted — implemented 2026-06-20 (v5 autonomous repair, W1407).

## Context

`backend/scripts/run-sprint.js` was introduced to bypass the Windows 8 191-character `cmd.exe` command-line limit that broke `npm run test:sprint` once the sprint enumeration grew past ~191 test files. The original implementation passed the resolved test file paths directly to `child_process.spawn(process.execPath, [jestBin, ...args])`, relying on the fact that Node's `spawn()` does not go through `cmd.exe`.

On Windows, `CreateProcessW` still enforces an argv ceiling (~32 768 chars). With 975 sprint tests and absolute paths, the argv array exceeded this ceiling and produced:

```
node:internal/child_process:421
Error: spawn ENAMETOOLONG
```

This failed the primary deploy gate locally on Windows and would eventually fail CI if the suite continued to grow.

## Decision

Instead of chunking the argv list into multiple Jest invocations (which complicates exit-code aggregation and coverage), the runner now:

1. Reads `backend/sprint-tests.txt` as before.
2. Resolves each entry to an absolute path.
3. Generates a temporary Jest config file under `backend/.jest-cache/` that:
   - Requires the base `jest.config.js`.
   - Sets `rootDir` to the backend directory so `<rootDir>` placeholders resolve correctly.
   - Overrides `testMatch` with the exact list of absolute paths.
4. Spawns Jest once with `--config <temp-config>` plus the standard flags.

This moves the enumeration from argv into a file, eliminating the OS argv-length ceiling entirely while preserving single-invocation semantics, coverage thresholds, and exit-code propagation.

## Consequences

- **Positive**: `npm run test:sprint` works on Windows regardless of sprint-suite size.
- **Positive**: No need to maintain chunking logic, aggregate partial results, or merge coverage.
- **Positive**: Temp configs are written under `.jest-cache/` and are naturally excluded from git.
- **Negative**: Slightly more I/O (one temp file per run). Negligible compared to test execution time.
- **Risk**: If `jest.config.js` uses relative paths that resolve against the temp config's directory, they break. Mitigated by explicitly setting `rootDir` to the backend directory in the temp config.

## Validation

- Pre-fix: `npm run test:sprint` failed with `spawn ENAMETOOLONG`.
- Post-fix: `npm run test:sprint` launches Jest successfully and reports results.

## Related

- `backend/scripts/run-sprint.js`
- `backend/jest.config.js`
- `backend/sprint-tests.txt`

# testing/

Script helpers for backend test hygiene and drift checks.

## Scripts

- `check-maintenance-mocks-centralized.js` — verifies maintenance mocks are centralized
- `check-model-collisions.js` — detects model name collisions
- `fix-stale-dep-counts.js` — refreshes stale dependency counts in generated checks

## Notes

- These are backend-internal utilities and should stay close to the test drift they support.

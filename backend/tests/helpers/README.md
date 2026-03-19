# Test Helpers

This folder contains shared test helpers used by backend test suites.

## Maintenance Helpers

- `maintenanceMockFactories.js`
  - Centralized factories for maintenance-related model and service mocks.
  - Use these factories inside `jest.mock(...)` to keep mocks consistent across suites.

- `maintenanceMockSeeder.js`
  - Re-seeds maintenance service mock return values before each test.
  - Needed because Jest configuration enables `resetMocks`, which clears mock implementations.

## Usage Pattern

```js
jest.mock('../services/advancedMaintenanceService', () =>
  require('./helpers/maintenanceMockFactories').createAdvancedMaintenanceServiceMock()
);

const advancedMaintenanceService = require('../services/advancedMaintenanceService');
const maintenanceAIService = require('../services/maintenanceAIService');
const maintenanceAnalyticsService = require('../services/maintenanceAnalyticsService');
const { reseedMaintenanceServiceMocks } = require('./helpers/maintenanceMockSeeder');

beforeEach(() => {
  reseedMaintenanceServiceMocks(
    advancedMaintenanceService,
    maintenanceAIService,
    maintenanceAnalyticsService
  );
});
```

## Guideline

When adding new maintenance service methods used by tests:

1. Add the method to the proper factory in `maintenanceMockFactories.js`.
2. Add its default resolved value in `maintenanceMockSeeder.js`.
3. Avoid inline duplicated mock setup in individual test files.

## Guard Check

Use this command to enforce centralization and prevent inline mock duplication from returning:

```bash
npm run test:guard:maintenance-mocks
```

## Recommended Daily Commands

```bash
# Full quality gate (guard + scoped backend tests used in this repo)
npm run quality:backend

# Faster local check (guard + broad no-coverage run)
npm run quality:quick
```

```bash
# CI-safe quality gate (serial + CI flags)
npm run quality:ci
```

```bash
# Push-fast CI check (guard + phase2 subset)
npm run quality:push
```

## CI Quality Gate

GitHub Actions runs the same command in CI through:

- `.github/workflows/backend-quality-gate.yml`
- `npm run quality:backend`

Push and PR are split for speed and safety:

- Push: `.github/workflows/backend-quality-push.yml` → `npm run quality:push`
- Pull Request: `.github/workflows/backend-quality-gate.yml` → `npm run quality:ci`

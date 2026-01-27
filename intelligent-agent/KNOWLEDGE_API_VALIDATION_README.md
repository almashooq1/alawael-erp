# Knowledge API Validation: Best-Practice Test & ESM Setup

## Summary

- All validation logic for the Knowledge API is now fully covered by automated
  tests.
- The codebase uses modern ESM/TypeScript with Vitest for fast,
  native-compatible testing.
- The router is path-agnostic and follows Express best practices for modularity
  and testability.

## How to Run Tests

1. Install dependencies (if not already):
   ```sh
   npm install
   ```
2. Run all tests:
   ```sh
   npx vitest run
   ```
   Or run a specific test file:
   ```sh
   npx vitest run tests/knowledge-api-validation.test.ts
   ```

## Key Best Practices Applied

- **ESM/TypeScript Native:** No transpile hacks, works with modern Node.js and
  tooling.
- **Router Path-Agnostic:** All route definitions are relative, so the router
  can be mounted at any base path.
- **Validation Middleware:** Centralized, reusable, and robust input validation
  and sanitization.
- **Test Coverage:** All edge cases (missing fields, invalid/valid input, etc.)
  are covered.
- **Fast Feedback:** Vitest provides instant feedback and works seamlessly with
  ESM/TypeScript.

## File Structure

- `src/routes/knowledge.ts` — Path-agnostic router, ready for production and
  testing.
- `backend/middleware/requestValidation.js` — Centralized validation and
  sanitization logic.
- `tests/knowledge-api-validation.test.ts` — Full test suite for all validation
  scenarios.
- `vitest.config.ts` — Vitest configuration for ESM/TypeScript projects.

## Maintenance

- Add new validation rules in `requestValidation.js` and update tests
  accordingly.
- For new endpoints, follow the same router/test structure for maximum
  reliability.

---

_This setup ensures robust, production-grade validation and developer
experience. For any new features, follow the same modular and test-driven
approach._

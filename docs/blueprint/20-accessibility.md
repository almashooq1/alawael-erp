# 20 — Accessibility (a11y) Testing

> **Why this matters here more than anywhere**
>
> Al-Awael serves people with disabilities. A platform whose own software is
> inaccessible is in direct conflict with its mission. WCAG 2.1 AA is also
> a Saudi PDPL compatibility expectation for public-sector and healthcare
> services.

## What we have today

| Layer                                                 | File                                                                            | Status                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Cypress (full-page, requires dev server)              | `frontend/cypress/e2e/accessibility.cy.js`                                      | Existed, but was **silently broken** — see "The bug we fixed" below.                                          |
| Jest (component-level, runs in CI)                    | `frontend/src/__test-utils__/a11y.js` + `frontend/src/__tests__/a11y/*.test.js` | NEW (2026-05-02). Wraps `axe-core` (already a devDep). 7 passing tests across LoadingSpinner + ConfirmDialog. |
| Manual screen-reader QA (NVDA / VoiceOver / TalkBack) | none                                                                            | Not yet done.                                                                                                 |

## The bug we fixed

`frontend/cypress/support/commands.js` defined a custom `cy.checkA11y` that
did nothing:

```js
// BEFORE — silently nullified every a11y assertion:
Cypress.Commands.add('checkA11y', () => {
  cy.window().then(() => {
    // Accessibility checks would go here
  });
});
```

`cypress-axe` is imported in `support/e2e.js` and registers a real
`cy.checkA11y`, but the empty stub above shadowed it. Every test that called
`cy.checkA11y(…)` thus passed unconditionally.

The fix in commit 2026-05-02: remove the stub so `cypress-axe`'s real
implementation takes effect. No tests had to change.

## Adding a new component-level audit

```js
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '../../__test-utils__/a11y';

import MyComponent from '../../components/MyComponent';

test('MyComponent has no critical or serious a11y violations', async () => {
  const { container } = render(<MyComponent prop1="x" />);
  await expectNoA11yViolations(container);
});
```

What `expectNoA11yViolations` does:

1. Runs `axe-core` against the rendered DOM with WCAG 2.1 A + AA tags.
2. Filters to **critical + serious** impacts only.
3. Throws a Jest-friendly multi-line error with the rule id, help URL, and
   up to three offending DOM nodes per violation.

Why critical+serious only? It lets us add tests today without first having
to chase down every minor color-contrast nit. The threshold can be tightened
later by passing `{ tags: [...] }` or filtering against a smaller impact set.

## Logging baselines without failing

```js
import { auditA11y } from '../../__test-utils__/a11y';

const audit = await auditA11y(container);
console.log(audit.bySeverity); // { critical, serious, moderate, minor }
```

The `common-components.a11y.test.js` baseline test uses this to emit a
single `[a11y-baseline]` line per component — useful for tracking drift on
a CI dashboard without breaking the build over a `minor` regression.

## What to test next

Priority order — touched on every screen, so leverage is highest:

1. **Forms** — Formik wrappers, MUI `TextField` + `Select` clusters in
   `pages/hr/`, `pages/rehab/`, `pages/finance/` (label/aria-required/error
   association).
2. **Tables** — `MaterialReactTable` / `DataGrid` instances. Watch for
   missing column headers as `<th scope>`, action-buttons without
   `aria-label`.
3. **Navigation shells** — `AuthenticatedShell.js`, sidebar/topbar.
   Skip-links, landmarks, focus order on route change.
4. **Dialogs** — beyond `ConfirmDialog`, the bespoke modals in
   `pages/e-signature/`, `pages/quality/incidents/`.
5. **Charts** — `recharts` wrappers in `components/analytics/`,
   `PayrollAnalyticsDashboard.jsx`. Each chart needs a text alternative
   (table/summary) for screen-reader users.

## Running

```bash
# Component-level (fast, runs as part of normal frontend tests):
cd frontend
npx react-scripts test --watchAll=false --testPathPattern='__tests__/a11y/.*\.test\.js$'

# Full-page Cypress (requires `npm start` in another terminal):
npm run cypress:run -- --spec 'cypress/e2e/accessibility.cy.js'
```

## CI gating

The a11y suite is gated on every PR as part of the `frontend-tests`
job in `.github/workflows/pr-checks.yml`. Critical/serious WCAG 2.1 AA
violations in any component covered by the suite will block the PR.

**Scope (since 2026-05-02): the entire frontend test suite — ~11,000 tests.**
Earlier the gate ran only `__tests__/a11y/.*\.test\.js$` because the
broader suite was suspected to have ~57 failures. After auditing,
exactly 1 brittle assertion was failing
(`services-documentService.test.js` hard-coded the async-function
count); fixing it unlocked the whole suite. The gate now covers a11y +
unit + integration tests in one job.

The gate is independent of the cypress full-page audits, which still
require a running dev server and run only on demand.

## Manual checklist for new pages

Before a feature ships:

- [ ] All form fields have a visible `<label>` (or `aria-label` for icon
      buttons) — placeholder text alone is not a label.
- [ ] All buttons that look like icons have `aria-label` in Arabic.
- [ ] Tab order matches the visual order in RTL (use Tab key only — no mouse).
- [ ] Modal `<Dialog>` traps focus and restores it on close (MUI does this
      by default — only worry if you're rendering a custom overlay).
- [ ] Color is never the only signal (status badges should also have an
      icon or text label).
- [ ] Page has exactly one `<h1>` and headings nest sensibly.
- [ ] Charts have a text alternative below them.

## SLOs (proposed)

| Metric                                        | Target             | How measured                            |
| --------------------------------------------- | ------------------ | --------------------------------------- |
| Critical violations across audited components | 0                  | Jest a11y suite (build-breaking)        |
| Serious violations across audited components  | 0                  | Jest a11y suite (build-breaking)        |
| Moderate violations baseline                  | tracked            | `[a11y-baseline]` log lines per build   |
| Cypress full-page audits                      | run weekly via dev | `cypress:run` against staging           |
| Manual screen-reader sweep                    | quarterly          | NVDA/VoiceOver, documented in this file |

The Jest layer is the ratchet — every new reusable component should ship
with an audit test, and the threshold tightens with each iteration.

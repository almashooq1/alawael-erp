/**
 * a11y.js — Jest helper for component-level WCAG 2.1 AA audits.
 *
 * Why this exists:
 *   The Cypress a11y suite at `frontend/cypress/e2e/accessibility.cy.js`
 *   covers full pages but requires a running dev server, so it doesn't run
 *   in the default `npm test` flow. This helper plugs `axe-core` into
 *   `@testing-library/react` so a11y violations surface as ordinary unit-
 *   test failures alongside the rest of the suite.
 *
 * Usage:
 *   import { render } from '@testing-library/react';
 *   import { expectNoA11yViolations } from '../utils/a11y';
 *
 *   test('MyComponent has no critical a11y violations', async () => {
 *     const { container } = render(<MyComponent />);
 *     await expectNoA11yViolations(container);
 *   });
 *
 * What it checks:
 *   • WCAG 2.1 A + AA rules (`wcag2a`, `wcag2aa`, `wcag21aa`)
 *   • Filters to `serious` + `critical` impact only — `moderate`/`minor`
 *     findings are returned for inspection but don't fail the test, so we
 *     can ratchet the threshold down over time without a big-bang rewrite.
 */

'use strict';

const axe = require('axe-core');

const DEFAULT_RULES_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const FAILING_IMPACTS = new Set(['critical', 'serious']);

async function runAxe(node, options = {}) {
  const config = {
    runOnly: {
      type: 'tag',
      values: options.tags || DEFAULT_RULES_TAGS,
    },
    rules: options.rules || {},
  };
  return await axe.run(node, config);
}

function formatViolation(v) {
  const lines = [
    `[${v.impact}] ${v.id}: ${v.description}`,
    `  help: ${v.helpUrl}`,
  ];
  v.nodes.slice(0, 3).forEach((n, i) => {
    lines.push(`  node[${i}]: ${n.html}`);
    if (n.failureSummary) {
      lines.push(`    ${n.failureSummary.replace(/\n/g, '\n    ')}`);
    }
  });
  return lines.join('\n');
}

/**
 * Asserts that the given DOM node (typically `container` from
 * @testing-library/react) has no critical or serious a11y violations.
 * Throws a Jest-friendly error message if any are found.
 */
async function expectNoA11yViolations(node, options = {}) {
  const results = await runAxe(node, options);
  const failing = results.violations.filter(v => FAILING_IMPACTS.has(v.impact));
  if (failing.length === 0) return results;

  const summary =
    `Found ${failing.length} critical/serious a11y violation(s):\n\n` +
    failing.map(formatViolation).join('\n\n');
  throw new Error(summary);
}

/**
 * Returns the raw axe report without throwing — useful for ratcheting tests
 * that want to record + assert violation counts rather than fail outright.
 */
async function auditA11y(node, options = {}) {
  const results = await runAxe(node, options);
  return {
    violations: results.violations,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    bySeverity: {
      critical: results.violations.filter(v => v.impact === 'critical').length,
      serious: results.violations.filter(v => v.impact === 'serious').length,
      moderate: results.violations.filter(v => v.impact === 'moderate').length,
      minor: results.violations.filter(v => v.impact === 'minor').length,
    },
  };
}

module.exports = {
  expectNoA11yViolations,
  auditA11y,
  DEFAULT_RULES_TAGS,
  FAILING_IMPACTS,
};

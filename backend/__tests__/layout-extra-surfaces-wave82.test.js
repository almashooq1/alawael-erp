/**
 * layout-extra-surfaces-wave82.test.js — Wave 82.
 *
 * Adds three more web-admin surfaces to the Wave 24 layout-policy
 * framework. Same pattern as Wave 79 — each new dashboard entry
 * gets a contract-pinning test so future edits can't drop intent
 * labels, blow density budgets, or break the position-0 rule.
 *
 * Surfaces added:
 *   • beneficiary-lifecycle  — Wave 65 detail surface (per-beneficiary)
 *   • episodes-of-care       — Wave 70 list page
 *   • access-review          — Wave 73 list page
 */

'use strict';

const { createLayoutPolicyService } = require('../intelligence/layout-policy.service');
const reg = require('../intelligence/layout-policy.registry');

describe.each([
  ['beneficiary-lifecycle', 'medium'],
  ['episodes-of-care', 'medium-high'],
  ['access-review', 'medium'],
])('layout-policy — %s dashboard (Wave 82)', (key, expectedDensity) => {
  const svc = createLayoutPolicyService();

  test('registry exposes the key', () => {
    expect(reg.listDashboardKeys()).toContain(key);
  });

  test(`density is ${expectedDensity}`, () => {
    const dash = reg.getDashboard(key);
    expect(dash.density).toBe(expectedDensity);
  });

  test('position 0 is critical-signals', () => {
    const dash = reg.getDashboard(key);
    const sorted = [...dash.sections].sort((a, b) => a.position - b.position);
    expect(sorted[0].kind).toBe('critical-signals');
  });

  test('validateDashboard returns ok=true', () => {
    const result = svc.validateDashboard(key);
    if (!result.ok) {
      console.error(`${key} validation result:`, JSON.stringify(result, null, 2));
    }
    expect(result.ok).toBe(true);
    expect(result.failingElements).toEqual([]);
    expect(result.budgetViolations).toEqual([]);
    expect(result.unknownAutosaveProfiles).toEqual([]);
  });

  test('all elements pass scoreElement independently', () => {
    const dash = reg.getDashboard(key);
    for (const section of dash.sections) {
      for (const el of section.elements) {
        const r = svc.scoreElement(el);
        if (!r.pass) {
          console.error(`${key}: element ${el.id} failed:`, r.reasons);
        }
        expect(r.pass).toBe(true);
      }
    }
  });
});

describe('layout-policy — validateAll Wave 82 regression', () => {
  test('validateAll returns 3 new keys + Wave 79 + originals', () => {
    const svc = createLayoutPolicyService();
    const reports = svc.validateAll();
    const keys = reports.map(r => r.dashboardKey);
    // Wave 82 additions
    expect(keys).toContain('beneficiary-lifecycle');
    expect(keys).toContain('episodes-of-care');
    expect(keys).toContain('access-review');
    // Wave 79 baseline
    expect(keys).toContain('beneficiary-360');
    // Original Wave-24 dashboards
    expect(keys).toContain('executive');
    expect(keys).toContain('branch');
    expect(keys).toContain('care');
    expect(keys).toContain('finance');
  });

  test('validateAll: every dashboard report is ok=true', () => {
    const svc = createLayoutPolicyService();
    const reports = svc.validateAll();
    const failing = reports.filter(r => !r.ok);
    if (failing.length > 0) {
      console.error(
        'failing dashboards:',
        failing.map(r => r.dashboardKey)
      );
    }
    expect(failing).toEqual([]);
  });
});

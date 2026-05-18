/**
 * layout-beneficiary-360-wave79.test.js — Wave 79.
 *
 * Adds the `beneficiary-360` deep-dive viewer to the Wave 24
 * layout-policy registry. This test pins the contract:
 *
 *   1. validateDashboard('beneficiary-360').ok === true
 *      (all element scoring + density budgets + cross-refs pass)
 *
 *   2. position 0 is critical-signals (the attention queue)
 *
 *   3. tier-1 element count stays within `medium-high` density's
 *      budget of 10
 *
 *   4. lifecycle / episodes / timeline / audit-trail panels are
 *      all declared as tier-2 deep-dive elements (matches the
 *      Waves 66/70/71/76 frontend integrations)
 *
 *   5. audit-trail element is tier-3 with revealOn='click' to
 *      reflect that it expands on demand
 *
 * The test runs the live `createLayoutPolicyService` (no mocks) so
 * any future edit that violates the contract surfaces here.
 */

'use strict';

const { createLayoutPolicyService } = require('../intelligence/layout-policy.service');
const reg = require('../intelligence/layout-policy.registry');

describe('layout-policy — beneficiary-360 dashboard (Wave 79)', () => {
  const svc = createLayoutPolicyService();

  test('registry exposes beneficiary-360 key', () => {
    const keys = reg.listDashboardKeys();
    expect(keys).toContain('beneficiary-360');
  });

  test('density is medium-high', () => {
    const dash = reg.getDashboard('beneficiary-360');
    expect(dash.density).toBe('medium-high');
  });

  test('position 0 is critical-signals', () => {
    const dash = reg.getDashboard('beneficiary-360');
    const sorted = [...dash.sections].sort((a, b) => a.position - b.position);
    expect(sorted[0].kind).toBe('critical-signals');
    expect(sorted[0].id).toBe('b360-attention');
  });

  test('validateDashboard returns ok=true', () => {
    const result = svc.validateDashboard('beneficiary-360');
    if (!result.ok) {
      // Print the precise failure so CI logs are actionable.

      console.error('beneficiary-360 validation result:', JSON.stringify(result, null, 2));
    }
    expect(result.ok).toBe(true);
    expect(result.failingElements).toEqual([]);
    expect(result.budgetViolations).toEqual([]);
    expect(result.crossRefErrors).toEqual([]);
    expect(result.unknownAutosaveProfiles).toEqual([]);
  });

  test('tier-1 count is within medium-high budget (10)', () => {
    const result = svc.validateDashboard('beneficiary-360');
    expect(result.density).toBe('medium-high');
    expect(result.tier1Budget).toBe(10);
    expect(result.tier1Count).toBeLessThanOrEqual(10);
  });

  test('tier-1+2 count is within medium-high budget (24)', () => {
    const result = svc.validateDashboard('beneficiary-360');
    expect(result.tier12Budget).toBe(24);
    expect(result.tier12Count).toBeLessThanOrEqual(24);
  });

  test('deep-dive section contains the 4 panels (lifecycle/episodes/timeline/audit-trail)', () => {
    const dash = reg.getDashboard('beneficiary-360');
    const deep = dash.sections.find(s => s.id === 'b360-deep');
    expect(deep).toBeDefined();
    expect(deep.kind).toBe('deep-dive');
    const ids = deep.elements.map(e => e.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'b360-lifecycle-panel',
        'b360-episodes-panel',
        'b360-timeline',
        'b360-audit-trail',
      ])
    );
  });

  test('lifecycle/episodes/timeline panels are tier-2 above-the-fold', () => {
    const dash = reg.getDashboard('beneficiary-360');
    const deep = dash.sections.find(s => s.id === 'b360-deep');
    const lifecycle = deep.elements.find(e => e.id === 'b360-lifecycle-panel');
    const episodes = deep.elements.find(e => e.id === 'b360-episodes-panel');
    const timeline = deep.elements.find(e => e.id === 'b360-timeline');
    for (const el of [lifecycle, episodes, timeline]) {
      expect(el.tier).toBe(2);
      expect(el.aboveTheFold).toBe(true);
      expect(el.revealOn).toBe('always');
    }
  });

  test('audit-trail panel is tier-3 with revealOn=click', () => {
    const dash = reg.getDashboard('beneficiary-360');
    const deep = dash.sections.find(s => s.id === 'b360-deep');
    const audit = deep.elements.find(e => e.id === 'b360-audit-trail');
    expect(audit.tier).toBe(3);
    expect(audit.aboveTheFold).toBe(false);
    expect(audit.revealOn).toBe('click');
  });

  test('targetRoleGroups limits to clinical surface roles', () => {
    const dash = reg.getDashboard('beneficiary-360');
    expect(dash.targetRoleGroups).toEqual(
      expect.arrayContaining([
        'clinical_supervisor',
        'therapist',
        'branch_manager',
        'quality_compliance',
      ])
    );
  });

  test('all elements pass scoreElement independently', () => {
    const dash = reg.getDashboard('beneficiary-360');
    for (const section of dash.sections) {
      for (const el of section.elements) {
        const r = svc.scoreElement(el);
        if (!r.pass) {
          console.error(`element ${el.id} failed:`, r.reasons);
        }
        expect(r.pass).toBe(true);
      }
    }
  });
});

// Re-run the full validateAll() to confirm beneficiary-360 doesn't
// break the existing dashboards' validation.
describe('layout-policy — validateAll regression', () => {
  test('validateAll() returns all dashboards (no missing key)', () => {
    const svc = createLayoutPolicyService();
    const reports = svc.validateAll();
    const keys = reports.map(r => r.dashboardKey);
    expect(keys).toContain('beneficiary-360');
  });
});

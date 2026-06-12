'use strict';

/**
 * W1249 — review-cadence board drift guard.
 *
 * The board is a READ-ONLY manager surface over the SAME source of truth the
 * W50 overdue scanner notifies on (CarePlanVersion.reviewSchedule +
 * care-planning.registry NOTIFICATION_SLA). This guard locks:
 *   1. SLA THRESHOLD SYNC — the route classifies severity via the registry
 *      constants (no hard-coded day counts that could drift from W50).
 *   2. ELIGIBLE-STATUS SYNC — the route's eligibility set matches the W50
 *      scanner's set, and every status is a real care-planning registry status.
 *   3. READ-ONLY INVARIANT + W269 branch isolation + dualMountAuth mount.
 */

const fs = require('fs');
const path = require('path');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const routeSrc = read('routes/review-cadence.routes.js');
const scannerSrc = read('intelligence/care-plan-overdue-review.scanner.js');
const registrySrc = read('routes/registries/features.registry.js');
const reg = require('../intelligence/care-planning.registry');

const ELIGIBLE = ['approved', 'saved_to_record', 'family_notification_sent'];

describe('W1249 SLA threshold sync', () => {
  test('route reads thresholds from care-planning.registry (not literals)', () => {
    expect(routeSrc).toContain('reg.NOTIFICATION_SLA.OVERDUE_REVIEW_DAYS');
    expect(routeSrc).toContain('reg.NOTIFICATION_SLA.OVERDUE_REVIEW_CRITICAL_DAYS');
  });

  test('registry still exposes the SLA constants the route depends on', () => {
    expect(typeof reg.NOTIFICATION_SLA.OVERDUE_REVIEW_DAYS).toBe('number');
    expect(typeof reg.NOTIFICATION_SLA.OVERDUE_REVIEW_CRITICAL_DAYS).toBe('number');
    expect(reg.NOTIFICATION_SLA.OVERDUE_REVIEW_CRITICAL_DAYS).toBeGreaterThan(
      reg.NOTIFICATION_SLA.OVERDUE_REVIEW_DAYS
    );
  });
});

describe('W1249 eligible-status sync with the W50 scanner', () => {
  test('route and scanner agree on the eligibility set', () => {
    for (const s of ELIGIBLE) {
      expect(routeSrc).toContain(`'${s}'`);
      expect(scannerSrc).toContain(`'${s}'`);
    }
  });

  test('every eligible status is a real care-planning registry status', () => {
    const statuses = reg.STATUS_LIST || Object.values(reg.STATUSES || {});
    for (const s of ELIGIBLE) {
      expect(statuses).toContain(s);
    }
  });
});

describe('W1249 read-only invariant', () => {
  test('no mutating router verbs', () => {
    expect(/router\.(post|put|patch|delete)\s*\(/.test(routeSrc)).toBe(false);
  });

  test('no mass-assignment patterns', () => {
    expect(routeSrc.includes('...req.body')).toBe(false);
    expect(routeSrc.includes('Object.assign')).toBe(false);
  });
});

describe('W1249 branch isolation (W269 doctrine)', () => {
  test('requireBranchAccess + branchFilter present; req.branchId absent', () => {
    expect(routeSrc).toContain('router.use(requireBranchAccess)');
    expect(routeSrc).toContain('branchFilter(req)');
    expect(/req\.branchId/.test(routeSrc)).toBe(false);
  });

  test('every endpoint is role-gated', () => {
    const gets = routeSrc.match(/router\.get\(/g) || [];
    const roleGated = routeSrc.match(/router\.get\([^,]+,\s*requireRole\(/g) || [];
    expect(gets.length).toBeGreaterThanOrEqual(2);
    expect(roleGated.length).toBe(gets.length);
  });
});

describe('W1249 mount', () => {
  test('mounted via dualMountAuth in features.registry', () => {
    expect(registrySrc).toContain(
      "dualMountAuth(app, 'review-cadence', reviewCadenceRoutes, authenticate)"
    );
    expect(registrySrc).toContain("safeRequire('../routes/review-cadence.routes')");
  });
});

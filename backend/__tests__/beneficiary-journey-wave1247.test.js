'use strict';

/**
 * W1247 — beneficiary-journey (رحلة المستفيد 360) drift guard.
 *
 * The journey surface is a READ-ONLY aggregator stitching the two existing
 * lifecycle layers (administrative W39/W581 + clinical EpisodeOfCare phases).
 * This guard locks:
 *   1. PHASE/STATE LABEL SYNC — every phase/state the route labels must
 *      still exist in its owning source (episode model / lifecycle registry),
 *      and every owning enum value must have a label in the route (no
 *      unlabeled stage ever reaches the UI).
 *   2. READ-ONLY INVARIANT — no mutating verbs; this surface must never
 *      grow writes (writes belong to the owning modules).
 *   3. W269 BRANCH ISOLATION — requireBranchAccess + enforceBeneficiaryBranch
 *      + branchFilter + isValidObjectId all present; req.branchId absent.
 *   4. MOUNT — dualMountAuth in features.registry (never plain dualMount).
 */

const fs = require('fs');
const path = require('path');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const routeSrc = read('routes/beneficiary-journey.routes.js');
const episodeSrc = read('domains/episodes/models/EpisodeOfCare.js');
const registrySrc = read('routes/registries/features.registry.js');
const lifecycleReg = require('../intelligence/beneficiary-lifecycle.registry');

const CLINICAL_PHASES = [
  'referral',
  'intake',
  'triage',
  'initial_assessment',
  'mdt_review',
  'care_plan_approval',
  'active_treatment',
  'reassessment',
  'outcome_review',
  'discharge_planning',
  'discharge',
  'post_discharge_followup',
];

describe('W1247 journey ↔ owning-enum sync', () => {
  test('every clinical phase in this guard exists in EpisodeOfCare enum source', () => {
    for (const p of CLINICAL_PHASES) {
      expect(episodeSrc).toContain(`'${p}'`);
    }
  });

  test('route carries an Arabic label for every clinical phase', () => {
    for (const p of CLINICAL_PHASES) {
      expect(routeSrc).toContain(`${p}:`);
    }
  });

  test('route carries an Arabic label for every administrative lifecycle state', () => {
    const states = lifecycleReg.STATES || Object.values(lifecycleReg.LIFECYCLE_STATES || {});
    expect(states.length).toBeGreaterThanOrEqual(11);
    for (const s of states) {
      // hyphenated states are quoted keys in the label map
      expect(routeSrc.includes(`${s}:`) || routeSrc.includes(`'${s}':`)).toBe(true);
    }
  });
});

describe('W1247 read-only invariant', () => {
  test('no mutating router verbs — aggregator must never grow writes', () => {
    expect(/router\.(post|put|patch|delete)\s*\(/.test(routeSrc)).toBe(false);
  });

  test('no mass-assignment patterns', () => {
    expect(routeSrc.includes('...req.body')).toBe(false);
    expect(routeSrc.includes('Object.assign')).toBe(false);
  });
});

describe('W1247 branch isolation (W269 doctrine)', () => {
  test('router-level requireBranchAccess + per-route guards present', () => {
    expect(routeSrc).toContain('router.use(requireBranchAccess)');
    expect(routeSrc).toContain('enforceBeneficiaryBranch(req, beneficiaryId)');
    expect(routeSrc).toContain('branchFilter(req)');
    expect(routeSrc).toContain('mongoose.isValidObjectId(beneficiaryId)');
  });

  test('no req.branchId reads (W269h class)', () => {
    expect(/req\.branchId/.test(routeSrc)).toBe(false);
  });

  test('every endpoint is role-gated', () => {
    const gets = routeSrc.match(/router\.get\(/g) || [];
    const roleGated = routeSrc.match(/router\.get\([^,]+,\s*requireRole\(/g) || [];
    expect(gets.length).toBeGreaterThanOrEqual(2);
    expect(roleGated.length).toBe(gets.length);
  });
});

describe('W1277 care-plan slot reads the canonical model first', () => {
  test('unified-first with live statuses, legacy fallback, source tag, family version', () => {
    expect(routeSrc).toContain("tryModel('UnifiedCarePlan')");
    expect(routeSrc).toContain(
      "status: { $in: ['draft', 'pending_approval', 'active', 'under_review'] }"
    );
    expect(routeSrc).toContain("__source: 'unified'");
    expect(routeSrc).toContain("__source: 'legacy'");
    expect(routeSrc).toContain('carePlan.familyVersion && carePlan.familyVersion.body');
  });
});

describe('W1247 mount', () => {
  test('mounted via dualMountAuth in features.registry (never plain dualMount)', () => {
    expect(registrySrc).toContain(
      "dualMountAuth(app, 'beneficiary-journey', beneficiaryJourneyRoutes, authenticate)"
    );
    expect(registrySrc).not.toContain("dualMount(app, 'beneficiary-journey'");
  });

  test('route file is safeRequired in the registry', () => {
    expect(registrySrc).toContain("safeRequire('../routes/beneficiary-journey.routes')");
  });
});

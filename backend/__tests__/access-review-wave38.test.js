/**
 * access-review-wave38.test.js — Wave 38.
 *
 * Foundational tests for the User Access Review & Recertification
 * Program. Covers:
 *
 *   1. Registry surface:
 *      • REVIEW_TYPES / CADENCE / DECISIONS exports
 *      • isHighSensitivity for the 14 HIGH roles
 *      • getReviewersFor returns the routed reviewer set
 *      • getCadenceFor → monthly for HIGH, quarterly for others
 *      • getCadenceFor with TEMP_ELEVATED / serviceAccount / dormant
 *      • getCriteriaFor returns correct criterion list per review type
 *      • getReviewTypeFor maps scope+role+event correctly
 *      • findActorBundleConflicts surfaces tripped combinations
 *      • findActorBundleNearMisses identifies 1-role-away states
 *
 *   2. AccessReviewAttestation model:
 *      • Instantiates with required fields
 *      • REVOKE without justification → validation error
 *      • Privileged review missing cosigners → validation error
 *      • Hash-chain identity (currentHash === priorAttestationHash) → error
 *      • Self-attestation guard (reviewerId === targetUserId) → error
 *      • CERTIFY without justification → allowed
 *      • Quarterly without cosigners → allowed
 *
 *   3. Simulator:
 *      • Empty role bundle → zero violations + zero near-misses
 *      • Actor with creator+approver → violations include BUNDLE-FIN-1
 *      • Actor with creator only → near-misses includes BUNDLE-FIN-1 needRole=approver_l1
 *      • Actor with super_admin → effectiveScope GLOBAL + sensitiveRoleCount=1
 *      • Dormancy status maps daysSinceLastUse correctly
 *      • riskScore composite increases with violations + GLOBAL + dormancy
 *      • requiredCadence = monthly for HIGH-sensitivity actor
 *      • simulateGrant blocks proposed-role that would trip a conflict
 *      • simulateGrant allows proposed-role that doesn't trip anything
 *      • simulateBatch sorts by risk desc
 *      • recommendations list REVISE candidates for tripped conflicts
 */

'use strict';

// Opt out of global mongoose mock (jest.setup.js:19) — required so
// new Model(...) returns a real constructor. See insight-foundation-wave18.test.js.
jest.unmock('mongoose');

const mongoose = require('mongoose');
const reg = require('../intelligence/access-review.registry');
const {
  createAccessReviewSimulator,
  SEVERITY_WEIGHT,
} = require('../intelligence/access-review-simulator.service');

// ─── 1. Registry surface ───────────────────────────────────────────

describe('access-review.registry — constants', () => {
  test('exports the 7 review types', () => {
    expect(reg.REVIEW_TYPES).toEqual([
      'quarterly',
      'privileged',
      'branch',
      'hq',
      'dormant',
      'mover',
      'high-risk',
    ]);
  });

  test('exports the 6 decision codes', () => {
    expect(reg.DECISIONS).toEqual(
      expect.arrayContaining(['CERTIFY', 'REVISE', 'REVOKE', 'ESCALATE', 'ABSTAIN', 'ROTATE'])
    );
    expect(reg.DECISIONS.length).toBe(6);
  });

  test('HIGH_SENSITIVITY_ROLES contains the program-design list', () => {
    const expected = [
      'super_admin',
      'finance.approver_l2',
      'finance.treasurer',
      'dpo',
      'compliance_officer',
      'security_architect',
      'ciso',
    ];
    for (const r of expected) {
      expect(reg.HIGH_SENSITIVITY_ROLES).toContain(r);
    }
  });
});

describe('access-review.registry — isHighSensitivity', () => {
  test('returns true for HIGH list members', () => {
    expect(reg.isHighSensitivity('super_admin')).toBe(true);
    expect(reg.isHighSensitivity('dpo')).toBe(true);
    expect(reg.isHighSensitivity('finance.approver_l2')).toBe(true);
  });

  test('returns false for operational roles', () => {
    expect(reg.isHighSensitivity('therapist')).toBe(false);
    expect(reg.isHighSensitivity('receptionist')).toBe(false);
    expect(reg.isHighSensitivity('branch_manager')).toBe(false);
  });
});

describe('access-review.registry — getReviewersFor', () => {
  test('super_admin routes to ceo + audit_committee_chair', () => {
    expect(reg.getReviewersFor('super_admin')).toEqual(['ceo', 'audit_committee_chair']);
  });

  test('finance.approver_l2 routes to CFO + CISO + DPO', () => {
    expect(reg.getReviewersFor('finance.approver_l2')).toEqual(['cfo', 'ciso', 'dpo']);
  });

  test('therapist routes to branch_manager', () => {
    expect(reg.getReviewersFor('therapist')).toEqual(['branch_manager']);
  });

  test('unknown role falls back to branch_manager', () => {
    expect(reg.getReviewersFor('not_a_role')).toEqual(['branch_manager']);
  });
});

describe('access-review.registry — getCadenceFor', () => {
  test('HIGH-sensitivity → monthly', () => {
    expect(reg.getCadenceFor('super_admin')).toBe('monthly');
    expect(reg.getCadenceFor('dpo')).toBe('monthly');
  });

  test('operational → quarterly', () => {
    expect(reg.getCadenceFor('therapist')).toBe('quarterly');
  });

  test('TEMP_ELEVATED → weekly', () => {
    expect(reg.getCadenceFor('super_admin', { isTempElevated: true })).toBe('weekly');
  });

  test('service account → quarterly even for HIGH', () => {
    expect(reg.getCadenceFor('super_admin', { isServiceAccount: true })).toBe('quarterly');
  });

  test('dormancy check → continuous', () => {
    expect(reg.getCadenceFor('therapist', { isDormancyCheck: true })).toBe('continuous');
  });
});

describe('access-review.registry — getCriteriaFor', () => {
  test('quarterly returns C1..C7', () => {
    expect(reg.getCriteriaFor('quarterly')).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']);
  });

  test('privileged returns base C + P additions', () => {
    const c = reg.getCriteriaFor('privileged');
    expect(c).toContain('C1');
    expect(c).toContain('P7');
    expect(c.length).toBe(14);
  });

  test('hq returns base + privileged + H', () => {
    const c = reg.getCriteriaFor('hq');
    expect(c.length).toBe(19);
    expect(c).toContain('H5');
  });

  test('branch returns B1..B5', () => {
    expect(reg.getCriteriaFor('branch')).toEqual(['B1', 'B2', 'B3', 'B4', 'B5']);
  });

  test('unknown type returns null', () => {
    expect(reg.getCriteriaFor('nope')).toBeNull();
  });
});

describe('access-review.registry — getReviewTypeFor', () => {
  test('GLOBAL scope → hq', () => {
    expect(reg.getReviewTypeFor({ role: 'super_admin', scope: 'GLOBAL' })).toBe('hq');
  });

  test('HIGH role + BRANCH scope → privileged', () => {
    expect(reg.getReviewTypeFor({ role: 'dpo', scope: 'BRANCH' })).toBe('privileged');
  });

  test('operational role + BRANCH scope → quarterly', () => {
    expect(reg.getReviewTypeFor({ role: 'therapist', scope: 'BRANCH' })).toBe('quarterly');
  });

  test('event isMove overrides → mover', () => {
    expect(
      reg.getReviewTypeFor({
        role: 'therapist',
        scope: 'BRANCH',
        eventContext: { isMove: true },
      })
    ).toBe('mover');
  });

  test('event isDormant overrides → dormant', () => {
    expect(
      reg.getReviewTypeFor({
        role: 'super_admin',
        scope: 'GLOBAL',
        eventContext: { isDormant: true },
      })
    ).toBe('dormant');
  });
});

describe('access-review.registry — bundle conflicts', () => {
  test('actor with creator + approver trips BUNDLE-FIN-1', () => {
    const c = reg.findActorBundleConflicts(['finance.creator', 'finance.approver_l1']);
    expect(c.length).toBeGreaterThanOrEqual(1);
    expect(c.map(x => x.id)).toContain('BUNDLE-FIN-1');
  });

  test('actor with creator alone trips nothing', () => {
    const c = reg.findActorBundleConflicts(['finance.creator']);
    expect(c).toEqual([]);
  });

  test('actor with super_admin + dpo trips BUNDLE-X-2 (critical)', () => {
    const c = reg.findActorBundleConflicts(['super_admin', 'dpo']);
    const x2 = c.find(cc => cc.id === 'BUNDLE-X-2');
    expect(x2).toBeDefined();
    expect(x2.severity).toBe('critical');
  });

  test('every bundle conflict has bilingual descriptions + severity', () => {
    for (const c of reg.ACTOR_BUNDLE_CONFLICTS) {
      expect(c.id).toBeTruthy();
      expect(c.descriptionEn).toBeTruthy();
      expect(c.descriptionAr).toBeTruthy();
      expect(['critical', 'high', 'medium', 'low']).toContain(c.severity);
      expect(c.requiresAll.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('access-review.registry — near-miss detection', () => {
  test('actor with creator only → near-miss BUNDLE-FIN-1 needRole approver_l1', () => {
    const nm = reg.findActorBundleNearMisses(['finance.creator']);
    const f1 = nm.find(x => x.id === 'BUNDLE-FIN-1');
    expect(f1).toBeDefined();
    expect(f1.needRole).toBe('finance.approver_l1');
  });

  test('actor with both already in a conflict is NOT a near-miss', () => {
    const nm = reg.findActorBundleNearMisses(['finance.creator', 'finance.approver_l1']);
    expect(nm.find(x => x.id === 'BUNDLE-FIN-1')).toBeUndefined();
  });

  test('triple-conflict near-miss surfaces the missing role', () => {
    // BUNDLE-IAM-1 requires creator + role_granter + activator
    const nm = reg.findActorBundleNearMisses(['iam.user_creator', 'iam.role_granter']);
    const f = nm.find(x => x.id === 'BUNDLE-IAM-1');
    expect(f).toBeDefined();
    expect(f.needRole).toBe('iam.user_activator');
  });
});

// ─── 2. AccessReviewAttestation model ──────────────────────────────

describe('AccessReviewAttestation — Mongoose model', () => {
  // Force a fresh registration since other tests might collide
  const AccessReviewAttestation = require('../models/AccessReviewAttestation');

  test('instantiates with required fields', () => {
    const doc = new AccessReviewAttestation({
      cycleId: 'Q2-2026',
      reviewType: 'quarterly',
      reviewerId: new mongoose.Types.ObjectId(),
      reviewerRole: 'branch_manager',
      targetUserId: new mongoose.Types.ObjectId(),
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
      currentHash: 'abc123',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('REVOKE without justification → validation error', () => {
    const doc = new AccessReviewAttestation({
      cycleId: 'Q2-2026',
      reviewType: 'quarterly',
      reviewerId: new mongoose.Types.ObjectId(),
      reviewerRole: 'branch_manager',
      targetUserId: new mongoose.Types.ObjectId(),
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'REVOKE',
      currentHash: 'abc123',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.justificationAr).toBeDefined();
  });

  test('REVOKE with AR justification → valid', () => {
    const doc = new AccessReviewAttestation({
      cycleId: 'Q2-2026',
      reviewType: 'quarterly',
      reviewerId: new mongoose.Types.ObjectId(),
      reviewerRole: 'branch_manager',
      targetUserId: new mongoose.Types.ObjectId(),
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'REVOKE',
      justificationAr: 'موظف غادر الفرع',
      currentHash: 'abc123',
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('privileged review without cosigners → validation error', () => {
    const doc = new AccessReviewAttestation({
      cycleId: 'M-05-2026',
      reviewType: 'privileged',
      reviewerId: new mongoose.Types.ObjectId(),
      reviewerRole: 'ciso',
      targetUserId: new mongoose.Types.ObjectId(),
      targetRole: 'super_admin',
      targetScope: 'GLOBAL',
      decision: 'CERTIFY',
      currentHash: 'abc123',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.coSignerNafathIds).toBeDefined();
  });

  test('privileged review with 1 cosigner → valid', () => {
    const doc = new AccessReviewAttestation({
      cycleId: 'M-05-2026',
      reviewType: 'privileged',
      reviewerId: new mongoose.Types.ObjectId(),
      reviewerRole: 'ciso',
      targetUserId: new mongoose.Types.ObjectId(),
      targetRole: 'super_admin',
      targetScope: 'GLOBAL',
      decision: 'CERTIFY',
      coSignerNafathIds: ['nafath-dpo-001'],
      currentHash: 'abc123',
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('hash-chain identity → validation error', () => {
    const doc = new AccessReviewAttestation({
      cycleId: 'Q2-2026',
      reviewType: 'quarterly',
      reviewerId: new mongoose.Types.ObjectId(),
      reviewerRole: 'branch_manager',
      targetUserId: new mongoose.Types.ObjectId(),
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
      priorAttestationHash: 'samehash',
      currentHash: 'samehash',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.currentHash).toBeDefined();
  });

  test('self-attestation → validation error', () => {
    const sameId = new mongoose.Types.ObjectId();
    const doc = new AccessReviewAttestation({
      cycleId: 'Q2-2026',
      reviewType: 'quarterly',
      reviewerId: sameId,
      reviewerRole: 'branch_manager',
      targetUserId: sameId,
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
      currentHash: 'abc',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.reviewerId).toBeDefined();
  });

  test('hq review with cosigners + CERTIFY → valid', () => {
    const doc = new AccessReviewAttestation({
      cycleId: 'Q2-2026',
      reviewType: 'hq',
      reviewerId: new mongoose.Types.ObjectId(),
      reviewerRole: 'ceo',
      targetUserId: new mongoose.Types.ObjectId(),
      targetRole: 'super_admin',
      targetScope: 'GLOBAL',
      decision: 'CERTIFY',
      coSignerNafathIds: ['nafath-ciso', 'nafath-dpo', 'nafath-cfo'],
      currentHash: 'abc',
    });
    expect(doc.validateSync()).toBeUndefined();
  });
});

// ─── 3. Simulator ──────────────────────────────────────────────────

describe('access-review-simulator — simulateActor', () => {
  const sim = createAccessReviewSimulator({ logger: { warn: () => {}, info: () => {} } });

  test('empty role bundle → no violations', () => {
    const r = sim.simulateActor({ userId: 'U-1', roles: [] });
    expect(r.violations).toEqual([]);
    expect(r.nearMisses).toEqual([]);
    expect(r.sensitiveRoleCount).toBe(0);
    expect(r.riskScore).toBe(0);
  });

  test('actor with creator + approver → violation surfaced', () => {
    const r = sim.simulateActor({
      userId: 'U-2',
      roles: ['finance.creator', 'finance.approver_l1'],
    });
    expect(r.violations.map(v => v.id)).toContain('BUNDLE-FIN-1');
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.recommendations[0].action).toBe('REVISE');
    expect(r.riskScore).toBeGreaterThan(0);
  });

  test('actor with creator only → near-miss surfaced', () => {
    const r = sim.simulateActor({ userId: 'U-3', roles: ['finance.creator'] });
    expect(r.violations).toEqual([]);
    expect(r.nearMisses.find(n => n.id === 'BUNDLE-FIN-1')).toBeDefined();
  });

  test('super_admin actor → sensitiveRoleCount=1 + requiredCadence=monthly', () => {
    const r = sim.simulateActor({ userId: 'U-4', roles: ['super_admin'] });
    expect(r.sensitiveRoleCount).toBe(1);
    expect(r.requiresHighSensitivity).toBe(true);
    expect(r.requiredCadence).toBe('monthly');
  });

  test('actor scope=GLOBAL → required review type=hq', () => {
    const r = sim.simulateActor({
      userId: 'U-5',
      roles: ['super_admin'],
      scope: 'GLOBAL',
    });
    expect(r.effectiveScope).toBe('GLOBAL');
    expect(r.requiredReviewType).toBe('hq');
    // GLOBAL adds +15 to riskScore
    expect(r.riskScore).toBeGreaterThanOrEqual(15);
  });

  test('riskScore is composite: violations + sensitive count + scope', () => {
    const baseline = sim.simulateActor({ userId: 'U-6', roles: ['therapist'] });
    const elevated = sim.simulateActor({
      userId: 'U-7',
      roles: ['super_admin', 'dpo'], // trips BUNDLE-X-2 critical
      scope: 'GLOBAL',
    });
    expect(elevated.riskScore).toBeGreaterThan(baseline.riskScore);
    // BUNDLE-X-2 is critical → 30 points + 2 HIGH roles (10) + GLOBAL (15) = 55+
    expect(elevated.riskScore).toBeGreaterThanOrEqual(50);
  });

  test('dormancy status maps correctly', () => {
    const cases = [
      { days: 10, expected: 'active' },
      { days: 45, expected: 'quiet' },
      { days: 100, expected: 'dormant' },
      { days: 200, expected: 'expired' },
      { days: 400, expected: 'retired' },
    ];
    for (const c of cases) {
      const r = sim.simulateActor({
        userId: 'U-D',
        roles: ['therapist'],
        lastUsedAt: new Date(Date.now() - c.days * 24 * 60 * 60 * 1000),
      });
      expect(r.dormancy.status).toBe(c.expected);
    }
  });

  test('SEVERITY_WEIGHT exports the 4 levels', () => {
    expect(SEVERITY_WEIGHT.critical).toBeGreaterThan(SEVERITY_WEIGHT.high);
    expect(SEVERITY_WEIGHT.high).toBeGreaterThan(SEVERITY_WEIGHT.medium);
    expect(SEVERITY_WEIGHT.medium).toBeGreaterThan(SEVERITY_WEIGHT.low);
  });
});

describe('access-review-simulator — simulateGrant', () => {
  const sim = createAccessReviewSimulator();

  test('grant that would trip a conflict → blocked', () => {
    const result = sim.simulateGrant(
      { userId: 'U-8', roles: ['finance.creator'] },
      'finance.approver_l1'
    );
    expect(result.grantAllowed).toBe(false);
    expect(result.newViolations.map(v => v.id)).toContain('BUNDLE-FIN-1');
    expect(result.riskScoreDelta).toBeGreaterThan(0);
  });

  test('grant that does not trip anything → allowed', () => {
    const result = sim.simulateGrant({ userId: 'U-9', roles: ['therapist'] }, 'receptionist');
    expect(result.grantAllowed).toBe(true);
    expect(result.newViolations).toEqual([]);
  });

  test('grant to actor with no roles → allowed', () => {
    const result = sim.simulateGrant({ userId: 'U-10', roles: [] }, 'therapist');
    expect(result.grantAllowed).toBe(true);
  });
});

describe('access-review-simulator — simulateBatch', () => {
  const sim = createAccessReviewSimulator();

  test('sorts actors by riskScore descending', () => {
    const actors = [
      { userId: 'low', roles: ['therapist'] },
      { userId: 'high', roles: ['super_admin', 'dpo'], scope: 'GLOBAL' },
      { userId: 'mid', roles: ['finance.creator', 'finance.approver_l1'] },
    ];
    const reports = sim.simulateBatch(actors);
    expect(reports[0].actorUserId).toBe('high');
    expect(reports[2].actorUserId).toBe('low');
  });

  test('empty batch returns empty array', () => {
    expect(sim.simulateBatch([])).toEqual([]);
  });
});

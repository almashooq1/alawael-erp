/**
 * sod-lib-wave89.test.js — Wave 89.
 *
 * Direct tests for the canonical separation-of-duties library and the
 * REASON-codes registry (G2 governance rule). 7 parallel SoD checks
 * across the platform are migrating to this one lib over the next
 * several waves; the tests pin its contract.
 */

'use strict';

const sod = require('../intelligence/sod.lib');
const reasons = require('../intelligence/reason-codes.registry');

describe('reason-codes.registry — Wave 89 (G2)', () => {
  test('REASON_CODES is frozen', () => {
    expect(Object.isFrozen(reasons.REASON_CODES)).toBe(true);
  });

  test('REASON_LABELS_AR is frozen and covers every canonical code', () => {
    expect(Object.isFrozen(reasons.REASON_LABELS_AR)).toBe(true);
    for (const code of Object.values(reasons.REASON_CODES)) {
      expect(typeof reasons.REASON_LABELS_AR[code]).toBe('string');
      expect(reasons.REASON_LABELS_AR[code].length).toBeGreaterThan(0);
    }
  });

  test('SELF_APPROVAL_FORBIDDEN is the canonical spelling', () => {
    expect(reasons.REASON_CODES.SELF_APPROVAL_FORBIDDEN).toBe('SELF_APPROVAL_FORBIDDEN');
  });

  test('all canonical codes are UPPER_SNAKE', () => {
    for (const code of Object.values(reasons.REASON_CODES)) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  test('isCanonicalReason returns true for canonical codes', () => {
    expect(reasons.isCanonicalReason('SELF_APPROVAL_FORBIDDEN')).toBe(true);
    expect(reasons.isCanonicalReason('MFA_TIER_REQUIRED')).toBe(true);
    expect(reasons.isCanonicalReason('HASH_MISMATCH')).toBe(true);
  });

  test('isCanonicalReason returns false for aliases and garbage', () => {
    expect(reasons.isCanonicalReason('self_approval_forbidden')).toBe(false);
    expect(reasons.isCanonicalReason('SELF_ATTESTATION')).toBe(false);
    expect(reasons.isCanonicalReason(null)).toBe(false);
    expect(reasons.isCanonicalReason(123)).toBe(false);
    expect(reasons.isCanonicalReason('unknown_code')).toBe(false);
  });

  test('normaliseReason maps known aliases to canonical', () => {
    expect(reasons.normaliseReason('self_approval_forbidden')).toBe('SELF_APPROVAL_FORBIDDEN');
    expect(reasons.normaliseReason('selfApprovalForbidden')).toBe('SELF_APPROVAL_FORBIDDEN');
    expect(reasons.normaliseReason('SELF_ATTESTATION')).toBe('SELF_APPROVAL_FORBIDDEN');
    expect(reasons.normaliseReason('SOD_SELF_APPROVAL')).toBe('SELF_APPROVAL_FORBIDDEN');
    expect(reasons.normaliseReason('ACTOR_BUNDLE_CONFLICTS')).toBe('ACTOR_BUNDLE_CONFLICT');
  });

  test('normaliseReason returns null for unknown codes', () => {
    expect(reasons.normaliseReason('totally_made_up')).toBeNull();
    expect(reasons.normaliseReason(null)).toBeNull();
  });

  test('normaliseReason returns same code for canonical input', () => {
    expect(reasons.normaliseReason('SELF_APPROVAL_FORBIDDEN')).toBe('SELF_APPROVAL_FORBIDDEN');
    expect(reasons.normaliseReason('MFA_TIER_REQUIRED')).toBe('MFA_TIER_REQUIRED');
  });
});

describe('sod.lib — checkSeparationOfDuties (Wave 89)', () => {
  test('ok when no prior actors', () => {
    expect(sod.checkSeparationOfDuties({ actorId: 'u1', priorActorIds: [] })).toEqual({ ok: true });
  });

  test('ok when actor differs from all prior actors', () => {
    expect(sod.checkSeparationOfDuties({ actorId: 'u1', priorActorIds: ['u2', 'u3'] })).toEqual({
      ok: true,
    });
  });

  test('refused when actor === single prior actor (string vs string)', () => {
    const r = sod.checkSeparationOfDuties({ actorId: 'u1', priorActorIds: ['u1'] });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('SELF_APPROVAL_FORBIDDEN');
    expect(r.conflictingPriorActorId).toBe('u1');
    expect(r.detail).toMatch(/prior participant/);
  });

  test('refused when actor matches ANY prior actor in array', () => {
    const r = sod.checkSeparationOfDuties({
      actorId: 'u5',
      priorActorIds: ['u1', 'u2', 'u5', 'u3'],
    });
    expect(r.ok).toBe(false);
    expect(r.conflictingPriorActorId).toBe('u5');
  });

  test('safe String() coercion — ObjectId-shaped object vs string', () => {
    const oid = { toString: () => 'abc123' };
    expect(sod.checkSeparationOfDuties({ actorId: 'abc123', priorActorIds: [oid] })).toEqual({
      ok: false,
      reason: 'SELF_APPROVAL_FORBIDDEN',
      detail: expect.any(String),
      conflictingPriorActorId: 'abc123',
    });
  });

  test('safe numeric vs string', () => {
    const r = sod.checkSeparationOfDuties({ actorId: 42, priorActorIds: ['42'] });
    expect(r.ok).toBe(false);
  });

  test('priorActorId (singular) honoured', () => {
    const r = sod.checkSeparationOfDuties({ actorId: 'u1', priorActorId: 'u1' });
    expect(r.ok).toBe(false);
  });

  test('priorActorId + priorActorIds combined', () => {
    const r = sod.checkSeparationOfDuties({
      actorId: 'u9',
      priorActorIds: ['u1', 'u2'],
      priorActorId: 'u9',
    });
    expect(r.ok).toBe(false);
  });

  test('allowSelf=true bypasses the check', () => {
    expect(
      sod.checkSeparationOfDuties({ actorId: 'u1', priorActorIds: ['u1'], allowSelf: true })
    ).toEqual({ ok: true });
  });

  test('missing actorId → ACTOR_REQUIRED', () => {
    expect(sod.checkSeparationOfDuties({ priorActorIds: ['u1'] })).toEqual({
      ok: false,
      reason: 'ACTOR_REQUIRED',
      detail: expect.any(String),
    });
  });

  test('empty string actor → ACTOR_REQUIRED', () => {
    expect(sod.checkSeparationOfDuties({ actorId: '', priorActorIds: ['u1'] })).toEqual({
      ok: false,
      reason: 'ACTOR_REQUIRED',
      detail: expect.any(String),
    });
  });

  test('null / undefined in priorActorIds is ignored, not treated as match', () => {
    expect(
      sod.checkSeparationOfDuties({ actorId: 'u1', priorActorIds: [null, undefined, 'u2'] })
    ).toEqual({ ok: true });
  });

  test('reason returned is in the canonical registry', () => {
    const r = sod.checkSeparationOfDuties({ actorId: 'u1', priorActorIds: ['u1'] });
    expect(reasons.isCanonicalReason(r.reason)).toBe(true);
  });
});

describe('sod.lib — checkActorBundleConflict (Wave 89)', () => {
  test('ok when no conflict bundles supplied', () => {
    expect(sod.checkActorBundleConflict({ heldRoles: ['a', 'b'] })).toEqual({ ok: true });
  });

  test('ok when only partial bundle held', () => {
    const r = sod.checkActorBundleConflict({
      heldRoles: ['invoice_creator'],
      conflictBundles: [['invoice_creator', 'invoice_approver']],
    });
    expect(r.ok).toBe(true);
  });

  test('refused when actor holds FULL bundle', () => {
    const r = sod.checkActorBundleConflict({
      heldRoles: ['invoice_creator', 'invoice_approver', 'other'],
      conflictBundles: [['invoice_creator', 'invoice_approver']],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ACTOR_BUNDLE_CONFLICT');
    expect(r.conflictingBundle).toEqual(['invoice_creator', 'invoice_approver']);
  });

  test('refused on FIRST matching bundle when multiple supplied', () => {
    const r = sod.checkActorBundleConflict({
      heldRoles: ['x', 'y', 'z'],
      conflictBundles: [
        ['a', 'b'],
        ['x', 'y'],
        ['y', 'z'],
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.conflictingBundle).toEqual(['x', 'y']);
  });

  test('single-element bundle is skipped (a bundle needs ≥2 roles)', () => {
    const r = sod.checkActorBundleConflict({
      heldRoles: ['solo'],
      conflictBundles: [['solo']],
    });
    expect(r.ok).toBe(true);
  });

  test('reason returned is in the canonical registry', () => {
    const r = sod.checkActorBundleConflict({
      heldRoles: ['a', 'b'],
      conflictBundles: [['a', 'b']],
    });
    expect(reasons.isCanonicalReason(r.reason)).toBe(true);
  });
});

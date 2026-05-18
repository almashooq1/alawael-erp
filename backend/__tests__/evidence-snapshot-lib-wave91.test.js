/**
 * evidence-snapshot-lib-wave91.test.js — Wave 91.
 *
 * Direct tests for the canonical evidence-snapshot library.
 *
 * Closes the lifecycle-snapshot gap from the Wave-87 unification
 * analysis (U6) — every HIGH/CRITICAL decision must carry a
 * tamper-evident snapshot of what the approver saw at decision time.
 */

'use strict';

const lib = require('../intelligence/evidence-snapshot.lib');
const { captureSnapshot, verifySnapshot, pickFields } = lib;

describe('evidence-snapshot.lib — pickFields (Wave 91)', () => {
  test('picks scalar fields, omits undefined', () => {
    const e = { name: 'فاطمة', status: 'active', extra: 'ignored' };
    expect(pickFields(e, ['name', 'status', 'missing'])).toEqual({
      name: 'فاطمة',
      status: 'active',
    });
  });

  test('serialises Date to ISO string', () => {
    const e = { dob: new Date('2020-01-15T00:00:00.000Z') };
    expect(pickFields(e, ['dob'])).toEqual({ dob: '2020-01-15T00:00:00.000Z' });
  });

  test('serialises ObjectId-like to string', () => {
    // Simulate ObjectId via constructor name match
    function ObjectId(s) {
      this.s = s;
    }
    ObjectId.prototype.toString = function () {
      return this.s;
    };
    const oid = new ObjectId('abc123');
    const e = { branchId: oid };
    expect(pickFields(e, ['branchId'])).toEqual({ branchId: 'abc123' });
  });

  test('supports dot-path nested fields', () => {
    const e = { guardian: { id: 'g1', name: 'علي' } };
    expect(pickFields(e, ['guardian.id', 'guardian.name'])).toEqual({
      'guardian.id': 'g1',
      'guardian.name': 'علي',
    });
  });

  test('returns {} for null/undefined entity', () => {
    expect(pickFields(null, ['x'])).toEqual({});
    expect(pickFields(undefined, ['x'])).toEqual({});
  });

  test('uses entity.toObject() when present (mongoose docs)', () => {
    const e = {
      _internal: 'hidden',
      toObject: () => ({ name: 'from-toObject', status: 'active' }),
    };
    expect(pickFields(e, ['name', 'status', '_internal'])).toEqual({
      name: 'from-toObject',
      status: 'active',
    });
  });
});

describe('evidence-snapshot.lib — captureSnapshot (Wave 91)', () => {
  const takenAt = new Date('2026-05-18T10:00:00.000Z');

  test('produces frozen snapshot with all required fields', () => {
    const snap = captureSnapshot({
      entity: { name: 'A', status: 'active' },
      dataKinds: ['beneficiary-core'],
      fields: ['name', 'status'],
      takenAt,
    });
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.payload)).toBe(true);
    expect(Object.isFrozen(snap.dataKinds)).toBe(true);
    expect(snap.takenAt).toEqual(takenAt);
    expect(snap.dataKinds).toEqual(['beneficiary-core']);
    expect(snap.payload).toEqual({ name: 'A', status: 'active' });
    expect(snap.hashEncodingVersion).toBe('epoch-ms');
    expect(snap.payloadHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('hash is deterministic across calls with same input', () => {
    const a = captureSnapshot({
      entity: { name: 'A', status: 'active' },
      fields: ['name', 'status'],
      takenAt,
    });
    const b = captureSnapshot({
      entity: { name: 'A', status: 'active' },
      fields: ['name', 'status'],
      takenAt,
    });
    expect(a.payloadHash).toBe(b.payloadHash);
  });

  test('field order in fields[] does NOT affect hash (keys sorted)', () => {
    const a = captureSnapshot({
      entity: { name: 'A', status: 'active', branchId: 'br1' },
      fields: ['name', 'status', 'branchId'],
      takenAt,
    });
    const b = captureSnapshot({
      entity: { name: 'A', status: 'active', branchId: 'br1' },
      fields: ['branchId', 'name', 'status'],
      takenAt,
    });
    expect(a.payloadHash).toBe(b.payloadHash);
  });

  test('different payloads → different hashes', () => {
    const a = captureSnapshot({
      entity: { name: 'A' },
      fields: ['name'],
      takenAt,
    });
    const b = captureSnapshot({
      entity: { name: 'B' },
      fields: ['name'],
      takenAt,
    });
    expect(a.payloadHash).not.toBe(b.payloadHash);
  });

  test('different takenAt → different hashes', () => {
    const a = captureSnapshot({
      entity: { name: 'A' },
      fields: ['name'],
      takenAt: new Date('2026-05-18T10:00:00.000Z'),
    });
    const b = captureSnapshot({
      entity: { name: 'A' },
      fields: ['name'],
      takenAt: new Date('2026-05-18T10:00:01.000Z'),
    });
    expect(a.payloadHash).not.toBe(b.payloadHash);
  });

  test('throws when fields[] empty', () => {
    expect(() => captureSnapshot({ entity: {}, fields: [] })).toThrow(/non-empty/);
    expect(() => captureSnapshot({ entity: {} })).toThrow(/non-empty/);
  });

  test('takenAt defaults to now() when omitted', () => {
    const before = Date.now();
    const snap = captureSnapshot({ entity: { x: 1 }, fields: ['x'] });
    const after = Date.now();
    expect(snap.takenAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(snap.takenAt.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('evidence-snapshot.lib — verifySnapshot (Wave 91)', () => {
  const takenAt = new Date('2026-05-18T10:00:00.000Z');

  test('intact snapshot → ok=true', () => {
    const snap = captureSnapshot({
      entity: { name: 'A', status: 'active' },
      fields: ['name', 'status'],
      takenAt,
    });
    const v = verifySnapshot(snap);
    expect(v.ok).toBe(true);
    expect(v.expected).toBe(snap.payloadHash);
  });

  test('payload tampered after capture → ok=false', () => {
    const snap = captureSnapshot({
      entity: { name: 'A', status: 'active' },
      fields: ['name', 'status'],
      takenAt,
    });
    // Reconstruct as a non-frozen copy to simulate Mongoose hydration
    // then tamper with one field.
    const tampered = {
      takenAt: snap.takenAt,
      dataKinds: [...snap.dataKinds],
      payload: { ...snap.payload, status: 'discharged' },
      payloadHash: snap.payloadHash,
      hashEncodingVersion: snap.hashEncodingVersion,
    };
    const v = verifySnapshot(tampered);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('HASH_MISMATCH');
  });

  test('hash overwritten → ok=false', () => {
    const snap = captureSnapshot({
      entity: { name: 'A' },
      fields: ['name'],
      takenAt,
    });
    const tampered = {
      ...snap,
      payload: { ...snap.payload },
      dataKinds: [...snap.dataKinds],
      payloadHash: 'a'.repeat(64),
    };
    const v = verifySnapshot(tampered);
    expect(v.ok).toBe(false);
    expect(v.actual).toBe('a'.repeat(64));
  });

  test('missing payload → INVALID_SNAPSHOT', () => {
    expect(verifySnapshot(null)).toEqual({
      ok: false,
      reason: 'INVALID_SNAPSHOT',
      expected: null,
      actual: null,
    });
    expect(verifySnapshot({})).toEqual({
      ok: false,
      reason: 'INVALID_SNAPSHOT',
      expected: null,
      actual: null,
    });
  });

  test('snapshot survives JSON round-trip (Mongoose-style rehydration)', () => {
    const snap = captureSnapshot({
      entity: { name: 'A', status: 'active', branchId: 'br1' },
      fields: ['name', 'status', 'branchId'],
      takenAt,
    });
    const rehydrated = JSON.parse(JSON.stringify(snap));
    // takenAt comes back as ISO string after JSON round-trip
    expect(typeof rehydrated.takenAt).toBe('string');
    const v = verifySnapshot(rehydrated);
    expect(v.ok).toBe(true);
  });

  test('different encoding versions verified correctly', () => {
    const snap = captureSnapshot({
      entity: { name: 'A' },
      fields: ['name'],
      takenAt,
      encodingVersion: 'iso',
    });
    expect(snap.hashEncodingVersion).toBe('iso');
    expect(verifySnapshot(snap).ok).toBe(true);
  });
});

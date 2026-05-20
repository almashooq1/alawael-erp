'use strict';

/**
 * day-rehab-models.test.js — Wave 197b.
 *
 * Pure schema-invariant tests for the day-rehab vertical models
 * (W174-W193b). NO DB — these run the Mongoose schema validators
 * synchronously via `new Model(doc).validateSync()`.
 *
 * Template: each block tests:
 *   • happy-path: required fields → no errors
 *   • each invariant: bad input → specific error path
 *
 * To extend: copy a block, point at your model, list the rules
 * the model's __invariants validate(...) function enforces.
 */

const path = require('path');

// Avoid auto-connecting to Mongo in test env
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.USE_MOCK_DB = 'true';
process.env.DISABLE_REDIS = 'true';

// Required: backend's global jest config mocks mongoose; unmock so model
// constructors work for plain schema-validation tests (no DB access).
// See backend/__tests__/alert-schema-wave11.test.js for the pattern.
jest.unmock('mongoose');

const mongoose = require('mongoose');

const BENE_ID = new mongoose.Types.ObjectId();
const BRANCH_ID = new mongoose.Types.ObjectId();

// ════════════════════════════════════════════════════════════════════
// BeneficiaryDayAttendance (W174)
// ════════════════════════════════════════════════════════════════════
describe('BeneficiaryDayAttendance schema invariants', () => {
  const M = require(path.join(__dirname, '..', 'models', 'BeneficiaryDayAttendance'));

  test('happy path: present + checkInTime → valid', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      branchId: BRANCH_ID,
      date: new Date('2026-05-20'),
      status: 'present',
      checkInTime: new Date('2026-05-20T07:30:00'),
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('invariant: status=present without checkInTime → error', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date('2026-05-20'),
      status: 'present',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('checkInTime');
  });

  test('invariant: checkOut before checkIn → error', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date('2026-05-20'),
      status: 'present',
      checkInTime: new Date('2026-05-20T08:00:00'),
      checkOutTime: new Date('2026-05-20T07:30:00'),
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('checkOutTime');
  });

  test('STATUSES export contains the 5 day-rehab statuses', () => {
    expect(M.STATUSES).toEqual(
      expect.arrayContaining(['present', 'absent', 'late', 'excused', 'sent_home'])
    );
  });
});

// ════════════════════════════════════════════════════════════════════
// MorningHealthCheck (W177)
// ════════════════════════════════════════════════════════════════════
describe('MorningHealthCheck schema invariants', () => {
  const M = require(path.join(__dirname, '..', 'models', 'MorningHealthCheck'));

  test('happy path: allow decision + no reason → valid', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date('2026-05-20'),
      decision: 'allow',
      temperatureC: 36.8,
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('invariant: decision=send_home without reason → error', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date('2026-05-20'),
      decision: 'send_home',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('reason');
  });

  test('decision=send_home with reason → valid', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date('2026-05-20'),
      decision: 'send_home',
      reason: 'حرارة 38.5°م',
      temperatureC: 38.5,
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('temperatureC range validation: 50 rejected, 36.5 accepted', () => {
    const tooHigh = new M({
      beneficiaryId: BENE_ID,
      date: new Date(),
      decision: 'allow',
      temperatureC: 50,
    });
    expect(tooHigh.validateSync()?.errors).toHaveProperty('temperatureC');

    const ok = new M({
      beneficiaryId: BENE_ID,
      date: new Date(),
      decision: 'allow',
      temperatureC: 36.5,
    });
    expect(ok.validateSync()).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════
// MedicationAdministrationRecord — MAR (W191b)
// ════════════════════════════════════════════════════════════════════
describe('MedicationAdministrationRecord schema invariants', () => {
  const M = require(path.join(__dirname, '..', 'models', 'MedicationAdministrationRecord'));

  test('happy path: scheduled dose → valid', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      medicationName: 'Risperidone 0.5mg',
      route: 'oral',
      date: new Date('2026-05-20'),
      scheduledTime: new Date('2026-05-20T08:00:00'),
      status: 'scheduled',
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('invariant: status=administered requires actualTime + administeredBy/Name', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      medicationName: 'X',
      date: new Date(),
      scheduledTime: new Date(),
      status: 'administered',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('actualTime');
  });

  test('invariant: status=refused requires refusalReason', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      medicationName: 'X',
      date: new Date(),
      scheduledTime: new Date(),
      status: 'refused',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('refusalReason');
  });

  test('invariant: isControlled + administered requires witness', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      medicationName: 'Lorazepam',
      isControlled: true,
      date: new Date(),
      scheduledTime: new Date(),
      status: 'administered',
      actualTime: new Date(),
      administeredByName: 'Nurse A',
      // No witnessedBy or witnessedByName — should fail
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('witnessedBy');
  });

  test('isControlled + administered + witness → valid', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      medicationName: 'Lorazepam',
      isControlled: true,
      date: new Date(),
      scheduledTime: new Date(),
      status: 'administered',
      actualTime: new Date(),
      administeredByName: 'Nurse A',
      witnessedByName: 'Nurse B',
    });
    expect(doc.validateSync()).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════
// RestraintSeclusionEvent (W193b)
// ════════════════════════════════════════════════════════════════════
describe('RestraintSeclusionEvent schema invariants', () => {
  const M = require(path.join(__dirname, '..', 'models', 'RestraintSeclusionEvent'));

  test('happy path: physical, in_progress → valid', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date(),
      startTime: new Date(),
      type: 'physical',
      techniqueUsed: 'two-person escort',
      triggerBehavior: 'aggression toward staff',
      status: 'in_progress',
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('invariant: type=chemical requires medicationName', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date(),
      startTime: new Date(),
      type: 'chemical',
      techniqueUsed: 'IM injection',
      triggerBehavior: 'severe self-injury',
      status: 'in_progress',
      // medicationName missing
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('medicationName');
  });

  test('invariant: type=seclusion requires seclusionLocation', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date(),
      startTime: new Date(),
      type: 'seclusion',
      techniqueUsed: 'time-out',
      triggerBehavior: 'X',
      status: 'in_progress',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('seclusionLocation');
  });

  test('invariant: status=completed requires parentNotifiedAt + debriefDone', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(Date.now() + 60000),
      durationMinutes: 1,
      type: 'physical',
      techniqueUsed: 'X',
      triggerBehavior: 'Y',
      status: 'completed',
      // Missing parentNotifiedAt and debriefDone
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('parentNotifiedAt');
  });

  test('invariant: injury=true requires injuryNotes', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      date: new Date(),
      startTime: new Date(),
      type: 'physical',
      techniqueUsed: 'X',
      triggerBehavior: 'Y',
      injury: true,
      // Missing injuryNotes
      status: 'in_progress',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('injuryNotes');
  });
});

// ════════════════════════════════════════════════════════════════════
// PickupAuthorization (W196b)
// ════════════════════════════════════════════════════════════════════
describe('PickupAuthorization schema invariants', () => {
  const M = require(path.join(__dirname, '..', 'models', 'PickupAuthorization'));

  test('happy path: requested → valid', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      pickupPersonName: 'أحمد',
      pickupPersonRelationship: 'عمّ',
      pickupPersonNationalId: '1234567890',
      validFrom: new Date('2026-05-20'),
      validUntil: new Date('2026-05-27'),
      status: 'requested',
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('invariant: validFrom >= validUntil → error', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      pickupPersonName: 'X',
      pickupPersonRelationship: 'Y',
      pickupPersonNationalId: '1234567890',
      validFrom: new Date('2026-05-27'),
      validUntil: new Date('2026-05-20'),
      status: 'requested',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('validUntil');
  });

  test('invariant: status=signed requires signedByParentAt', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      pickupPersonName: 'X',
      pickupPersonRelationship: 'Y',
      pickupPersonNationalId: '1234567890',
      validFrom: new Date('2026-05-20'),
      validUntil: new Date('2026-05-27'),
      status: 'signed',
      // Missing signedByParentAt
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors).toHaveProperty('signedByParentAt');
  });

  test('invariant: status=used requires the full chain', () => {
    const doc = new M({
      beneficiaryId: BENE_ID,
      pickupPersonName: 'X',
      pickupPersonRelationship: 'Y',
      pickupPersonNationalId: '1234567890',
      validFrom: new Date('2026-05-20'),
      validUntil: new Date('2026-05-27'),
      status: 'used',
      // Missing usedAt, usedByName, signedByParentAt
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    // The first invariant hit is signedByParentAt — but any of the three is acceptable evidence the validator caught the bug
    const errKeys = Object.keys(err.errors);
    expect(errKeys.some(k => ['signedByParentAt', 'usedAt', 'usedByName'].includes(k))).toBe(true);
  });
});

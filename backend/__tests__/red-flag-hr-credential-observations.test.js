/**
 * red-flag-hr-credential-observations.test.js — Phase 11 Commit 1.
 *
 * Integration: real SessionAttendance + HR/Employee + HR/Certification
 * models against mongodb-memory-server. Proves that the two new
 * blocking HR-credential flags fire end-to-end:
 *
 *   operational.therapist.license.expired
 *   operational.therapist.mandatory_cert.expired
 */

'use strict';

// jest.setup.js globally mocks mongoose for the unit-suite default.
// This adapter test drives real models against mongodb-memory-server,
// so we unmock first and reset the module graph before any model file
// is required (otherwise the mocked mongoose is still cached).
jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createHrCredentialObservations,
} = require('../services/redFlagObservations/hrCredentialObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let SessionAttendance;
let Employee;
let Certification;
let EmploymentContract;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-cred-obs-test' });
  SessionAttendance = require('../models/SessionAttendance');
  Employee = require('../models/HR/Employee');
  Certification = require('../models/hr/Certification');
  EmploymentContract = require('../models/hr/EmploymentContract');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await SessionAttendance.deleteMany({});
  await Employee.deleteMany({});
  await Certification.deleteMany({});
  await EmploymentContract.deleteMany({});
});

// ─── Fixture builders ───────────────────────────────────────────

let therapistCounter = 1;
async function seedTherapist({ scfhsExpiryDaysFromNow = 365, now = new Date() } = {}) {
  // Write straight through the native driver so we can seed the minimum
  // fields the adapter actually reads (_id, scfhs_expiry). The Employee
  // schema's required-field set is broad and not relevant to this
  // adapter's contract — mongoose's `collection.insertOne` proxy can be
  // unreliable in the harness, so we use the connection's raw collection
  // directly.
  const seq = therapistCounter++;
  const _id = new mongoose.Types.ObjectId();
  const collectionName = Employee.collection.collectionName;
  await mongoose.connection.db.collection(collectionName).insertOne({
    _id,
    employee_number: `HRC-${seq}`,
    national_id: `HRC${String(seq).padStart(6, '0')}`,
    email: `hrc-therapist-${seq}-${Date.now()}@test.local`,
    scfhs_expiry: new Date(now.getTime() + scfhsExpiryDaysFromNow * 24 * 3600 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id };
}

async function seedSession({ bId, therapistId, daysAgo, status = 'present', now = new Date() }) {
  return SessionAttendance.create({
    beneficiaryId: bId,
    therapistId,
    sessionId: new mongoose.Types.ObjectId(),
    scheduledDate: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
    status,
  });
}

async function seedCert({
  employeeId,
  certType = 'first_aid',
  isMandatory = true,
  expiryDaysFromNow = 365,
  deletedAt = null,
  now = new Date(),
} = {}) {
  return Certification.create({
    employee_id: employeeId,
    branch_id: new mongoose.Types.ObjectId(),
    cert_type: certType,
    cert_name_ar: 'شهادة اختبار',
    is_mandatory: isMandatory,
    expiry_date: new Date(now.getTime() + expiryDaysFromNow * 24 * 3600 * 1000),
    deleted_at: deletedAt,
  });
}

// EmploymentContract's legacy async-with-next pre-save hook is
// incompatible with modern mongoose here; write directly through
// the raw collection to bypass the hook.
async function seedContract({
  employeeId,
  endDateDaysFromNow = 365,
  status = 'active',
  deletedAt = null,
  now = new Date(),
} = {}) {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(EmploymentContract.collection.collectionName).insertOne({
    _id,
    contract_number: `TEST-HRC-CONTRACT-${_id.toString().slice(-6)}`,
    employee_id: employeeId,
    branch_id: new mongoose.Types.ObjectId(),
    contract_type: 'fixed_term',
    start_date: new Date(now.getTime() - 365 * 24 * 3600 * 1000),
    end_date:
      endDateDaysFromNow == null
        ? null
        : new Date(now.getTime() + endDateDaysFromNow * 24 * 3600 * 1000),
    position: 'Therapist',
    department: 'clinical',
    basic_salary: 10000,
    status,
    deleted_at: deletedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id };
}

// ─── expiredLicensesForBeneficiary ──────────────────────────────

describe('expiredLicensesForBeneficiary', () => {
  it('returns 0 when beneficiary has no recent sessions', async () => {
    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredLicensesForBeneficiary(new mongoose.Types.ObjectId());
    expect(count).toBe(0);
  });

  it('counts therapists whose SCFHS license is already expired', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const expired = await seedTherapist({ scfhsExpiryDaysFromNow: -5, now });
    const valid = await seedTherapist({ scfhsExpiryDaysFromNow: 120, now });
    await seedSession({ bId, therapistId: expired._id, daysAgo: 3, now });
    await seedSession({ bId, therapistId: valid._id, daysAgo: 4, now });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredLicensesForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('does NOT count therapists with licenses still valid (even expiring in 1 day)', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const almostExpired = await seedTherapist({ scfhsExpiryDaysFromNow: 1, now });
    await seedSession({ bId, therapistId: almostExpired._id, daysAgo: 2, now });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredLicensesForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('de-duplicates a therapist who has multiple expired-license sessions', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const expired = await seedTherapist({ scfhsExpiryDaysFromNow: -10, now });
    await seedSession({ bId, therapistId: expired._id, daysAgo: 1, now });
    await seedSession({ bId, therapistId: expired._id, daysAgo: 10, now });
    await seedSession({ bId, therapistId: expired._id, daysAgo: 20, now });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredLicensesForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });
});

// ─── expiredMandatoryCertsForBeneficiary ────────────────────────

describe('expiredMandatoryCertsForBeneficiary', () => {
  it('returns 0 when beneficiary has no recent sessions', async () => {
    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredMandatoryCertsForBeneficiary(new mongoose.Types.ObjectId());
    expect(count).toBe(0);
  });

  it('counts therapists with an expired mandatory cert (first_aid)', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 4, now });
    await seedCert({
      employeeId: t._id,
      certType: 'first_aid',
      isMandatory: true,
      expiryDaysFromNow: -2,
      now,
    });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredMandatoryCertsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('counts therapists with expired CPR', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 4, now });
    await seedCert({
      employeeId: t._id,
      certType: 'cpr',
      isMandatory: true,
      expiryDaysFromNow: -30,
      now,
    });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredMandatoryCertsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('ignores non-mandatory expired certs', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 4, now });
    await seedCert({
      employeeId: t._id,
      certType: 'language',
      isMandatory: false,
      expiryDaysFromNow: -100,
      now,
    });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredMandatoryCertsForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('ignores soft-deleted certs', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 4, now });
    await seedCert({
      employeeId: t._id,
      certType: 'first_aid',
      isMandatory: true,
      expiryDaysFromNow: -5,
      deletedAt: new Date(now.getTime() - 24 * 3600 * 1000),
      now,
    });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredMandatoryCertsForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('returns 0 when mandatory certs are still valid', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 4, now });
    await seedCert({
      employeeId: t._id,
      certType: 'cpr',
      isMandatory: true,
      expiryDaysFromNow: 90,
      now,
    });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredMandatoryCertsForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('de-duplicates when one therapist has multiple expired mandatory certs', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 4, now });
    // Three expired mandatory certs → still counts as ONE therapist.
    await seedCert({
      employeeId: t._id,
      certType: 'cpr',
      isMandatory: true,
      expiryDaysFromNow: -10,
      now,
    });
    await seedCert({
      employeeId: t._id,
      certType: 'first_aid',
      isMandatory: true,
      expiryDaysFromNow: -5,
      now,
    });
    await seedCert({
      employeeId: t._id,
      certType: 'bcba',
      isMandatory: true,
      expiryDaysFromNow: -20,
      now,
    });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredMandatoryCertsForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('counts two distinct therapists with different expired certs', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t1 = await seedTherapist({ now });
    const t2 = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t1._id, daysAgo: 4, now });
    await seedSession({ bId, therapistId: t2._id, daysAgo: 6, now });
    await seedCert({
      employeeId: t1._id,
      certType: 'cpr',
      isMandatory: true,
      expiryDaysFromNow: -10,
      now,
    });
    await seedCert({
      employeeId: t2._id,
      certType: 'first_aid',
      isMandatory: true,
      expiryDaysFromNow: -1,
      now,
    });

    const obs = createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
    });
    const { count } = await obs.expiredMandatoryCertsForBeneficiary(bId, { now });
    expect(count).toBe(2);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('HR-credential flags fire end-to-end', () => {
  function buildEngineWithHrService() {
    const locator = createLocator();
    locator.register(
      'hrCredentialService',
      createHrCredentialObservations({
        sessionAttendanceModel: SessionAttendance,
        employeeModel: Employee,
        certificationModel: Certification,
      })
    );
    return createEngine({ locator });
  }

  it('operational.therapist.license.expired raises on expired SCFHS license', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    const t = await seedTherapist({ scfhsExpiryDaysFromNow: -3, now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });

    const engine = buildEngineWithHrService();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.therapist.license.expired'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(1);
  });

  it('operational.therapist.license.expired does NOT raise for a valid license', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    const t = await seedTherapist({ scfhsExpiryDaysFromNow: 30, now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });

    const engine = buildEngineWithHrService();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.therapist.license.expired'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('operational.therapist.mandatory_cert.expired raises on expired CPR', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });
    await seedCert({
      employeeId: t._id,
      certType: 'cpr',
      isMandatory: true,
      expiryDaysFromNow: -1,
      now,
    });

    const engine = buildEngineWithHrService();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.therapist.mandatory_cert.expired'],
      now,
    });
    expect(result.raisedCount).toBe(1);
  });

  it('operational.therapist.mandatory_cert.expired does NOT raise when certs valid', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 2, now });
    await seedCert({
      employeeId: t._id,
      certType: 'cpr',
      isMandatory: true,
      expiryDaysFromNow: 120,
      now,
    });

    const engine = buildEngineWithHrService();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.therapist.mandatory_cert.expired'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});

// ─── contractsExpiringForBeneficiary ────────────────────────────

describe('contractsExpiringForBeneficiary', () => {
  function buildObs() {
    return createHrCredentialObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
      certificationModel: Certification,
      employmentContractModel: EmploymentContract,
    });
  }

  it('returns 0 with no recent sessions', async () => {
    const { count } = await buildObs().contractsExpiringForBeneficiary(
      new mongoose.Types.ObjectId()
    );
    expect(count).toBe(0);
  });

  it('counts therapists with contract expiring within 45 days', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedContract({ employeeId: t._id, endDateDaysFromNow: 20, status: 'active', now });

    const { count } = await buildObs().contractsExpiringForBeneficiary(bId, { now });
    expect(count).toBe(1);
  });

  it('excludes contracts ending beyond 45 days', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedContract({ employeeId: t._id, endDateDaysFromNow: 90, status: 'active', now });

    const { count } = await buildObs().contractsExpiringForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('excludes already-expired contracts (end_date < now)', async () => {
    // Already-past contracts are owned by the post-expiry workflow; this
    // flag only surfaces the heads-up window.
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedContract({ employeeId: t._id, endDateDaysFromNow: -5, status: 'active', now });

    const { count } = await buildObs().contractsExpiringForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('excludes non-active contracts', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedContract({
      employeeId: t._id,
      endDateDaysFromNow: 20,
      status: 'terminated',
      now,
    });

    const { count } = await buildObs().contractsExpiringForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('excludes soft-deleted contracts', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedContract({
      employeeId: t._id,
      endDateDaysFromNow: 20,
      status: 'active',
      deletedAt: new Date(now.getTime() - 24 * 3600 * 1000),
      now,
    });

    const { count } = await buildObs().contractsExpiringForBeneficiary(bId, { now });
    expect(count).toBe(0);
  });

  it('end-to-end: operational.employment_contract.expiring.45d raises', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    const t = await seedTherapist({ now });
    await seedSession({ bId, therapistId: t._id, daysAgo: 3, now });
    await seedContract({ employeeId: t._id, endDateDaysFromNow: 15, status: 'active', now });

    const locator = createLocator();
    locator.register('hrCredentialService', buildObs());
    const engine = createEngine({ locator });

    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.employment_contract.expiring.45d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(1);
  });
});

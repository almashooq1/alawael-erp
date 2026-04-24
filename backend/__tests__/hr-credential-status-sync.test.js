/**
 * hr-credential-status-sync.test.js — Phase 11 Commit 2.
 *
 * Unit + integration coverage for the HR credential status sync.
 *
 * The pure `computeCertificationStatus` helper is tested in isolation
 * (no DB, no mongoose). The three collection-walking functions are
 * exercised against real Mongoose models on mongodb-memory-server.
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  computeCertificationStatus,
  syncCertificationStatuses,
  syncEmploymentContractStatuses,
  summarizeSaudiLicenseExposure,
  runFullHrCredentialSync,
} = require('../services/hr/hrCredentialStatusSync');

let mongoServer;
let Certification;
let EmploymentContract;
let Employee;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-sync-test' });
  Certification = require('../models/hr/Certification');
  EmploymentContract = require('../models/hr/EmploymentContract');
  Employee = require('../models/HR/Employee');
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
  await Certification.deleteMany({});
  await EmploymentContract.deleteMany({});
  await Employee.deleteMany({});
});

const MS_PER_DAY = 24 * 3600 * 1000;

// ─── computeCertificationStatus (pure) ──────────────────────────

describe('computeCertificationStatus', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');

  it('returns null when expiry is missing', () => {
    expect(computeCertificationStatus({ expiryDate: null, now })).toBeNull();
    expect(computeCertificationStatus({ expiryDate: undefined, now })).toBeNull();
  });

  it('returns expired when expiry < now', () => {
    const past = new Date(now.getTime() - 1);
    expect(computeCertificationStatus({ expiryDate: past, now })).toBe('expired');
  });

  it('returns expiring_soon when within 60 days', () => {
    const in30 = new Date(now.getTime() + 30 * MS_PER_DAY);
    expect(computeCertificationStatus({ expiryDate: in30, now })).toBe('expiring_soon');
  });

  it('boundary: exactly 60 days from now is expiring_soon', () => {
    const in60 = new Date(now.getTime() + 60 * MS_PER_DAY);
    expect(computeCertificationStatus({ expiryDate: in60, now })).toBe('expiring_soon');
  });

  it('returns valid when expiry > window', () => {
    const in100 = new Date(now.getTime() + 100 * MS_PER_DAY);
    expect(computeCertificationStatus({ expiryDate: in100, now })).toBe('valid');
  });

  it('respects the expiringSoonDays override', () => {
    const in45 = new Date(now.getTime() + 45 * MS_PER_DAY);
    expect(computeCertificationStatus({ expiryDate: in45, now, expiringSoonDays: 30 })).toBe(
      'valid'
    );
    expect(computeCertificationStatus({ expiryDate: in45, now, expiringSoonDays: 60 })).toBe(
      'expiring_soon'
    );
  });

  it('accepts a string expiry date', () => {
    expect(computeCertificationStatus({ expiryDate: '2026-04-21T00:00:00.000Z', now })).toBe(
      'expired'
    );
  });
});

// ─── syncCertificationStatuses ──────────────────────────────────

describe('syncCertificationStatuses', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');

  async function seedCert({ expiryDaysFromNow, status = 'valid', deletedAt = null } = {}) {
    return Certification.create({
      employee_id: new mongoose.Types.ObjectId(),
      branch_id: new mongoose.Types.ObjectId(),
      cert_type: 'first_aid',
      cert_name_ar: 'شهادة اختبار',
      is_mandatory: true,
      expiry_date:
        expiryDaysFromNow == null ? null : new Date(now.getTime() + expiryDaysFromNow * MS_PER_DAY),
      status,
      deleted_at: deletedAt,
    });
  }

  it('flips stale valid → expired when expiry has passed', async () => {
    const cert = await seedCert({ expiryDaysFromNow: -1, status: 'valid' });

    const res = await syncCertificationStatuses({ Certification, now });
    expect(res.scanned).toBe(1);
    expect(res.modified).toBe(1);
    expect(res.tally.expired).toBe(1);

    const updated = await Certification.findById(cert._id).lean();
    expect(updated.status).toBe('expired');
  });

  it('flips valid → expiring_soon when within 60 days', async () => {
    const cert = await seedCert({ expiryDaysFromNow: 45, status: 'valid' });

    const res = await syncCertificationStatuses({ Certification, now });
    expect(res.modified).toBe(1);

    const updated = await Certification.findById(cert._id).lean();
    expect(updated.status).toBe('expiring_soon');
  });

  it('leaves already-correct statuses untouched', async () => {
    // Status already 'expired' and expiry is past → sync should not
    // write a redundant update (keeps updatedAt stable).
    const cert = await seedCert({ expiryDaysFromNow: -10, status: 'expired' });
    const before = await Certification.findById(cert._id).lean();

    const res = await syncCertificationStatuses({ Certification, now });
    expect(res.modified).toBe(0);

    const after = await Certification.findById(cert._id).lean();
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it('skips soft-deleted certs', async () => {
    await seedCert({
      expiryDaysFromNow: -30,
      status: 'valid',
      deletedAt: new Date(now.getTime() - MS_PER_DAY),
    });

    const res = await syncCertificationStatuses({ Certification, now });
    expect(res.scanned).toBe(0);
    expect(res.modified).toBe(0);
  });

  it('skips certs with no expiry_date', async () => {
    await seedCert({ expiryDaysFromNow: null, status: 'valid' });

    const res = await syncCertificationStatuses({ Certification, now });
    expect(res.scanned).toBe(0);
  });

  it('handles a mixed batch correctly', async () => {
    await seedCert({ expiryDaysFromNow: -5, status: 'valid' }); // → expired
    await seedCert({ expiryDaysFromNow: 30, status: 'valid' }); // → expiring_soon
    await seedCert({ expiryDaysFromNow: 200, status: 'valid' }); // → stays valid (no change)
    await seedCert({ expiryDaysFromNow: -1, status: 'expired' }); // already correct
    await seedCert({ expiryDaysFromNow: 10, status: 'valid' }); // → expiring_soon

    const res = await syncCertificationStatuses({ Certification, now });
    expect(res.scanned).toBe(5);
    expect(res.tally.expired).toBe(2);
    expect(res.tally.expiring_soon).toBe(2);
    expect(res.tally.valid).toBe(1);
    expect(res.modified).toBe(3);
  });

  it('throws when Certification model is missing', async () => {
    await expect(syncCertificationStatuses({ Certification: null, now })).rejects.toThrow(
      /Certification model is required/
    );
  });
});

// ─── syncEmploymentContractStatuses ─────────────────────────────

describe('syncEmploymentContractStatuses', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');

  // EmploymentContract has an async pre-save hook that uses the legacy
  // `next` callback signature — incompatible with modern mongoose in
  // this test harness. Write directly through the raw driver to
  // bypass the hook (we only need the stored fields here, not the
  // auto-numbering logic).
  async function seedContract({ endDateDaysFromNow, status = 'active', deletedAt = null } = {}) {
    const _id = new mongoose.Types.ObjectId();
    const collName = EmploymentContract.collection.collectionName;
    await mongoose.connection.db.collection(collName).insertOne({
      _id,
      contract_number: `TEST-CONTRACT-${_id.toString().slice(-6)}`,
      employee_id: new mongoose.Types.ObjectId(),
      branch_id: new mongoose.Types.ObjectId(),
      contract_type: 'fixed_term',
      start_date: new Date(now.getTime() - 365 * MS_PER_DAY),
      end_date:
        endDateDaysFromNow == null
          ? null
          : new Date(now.getTime() + endDateDaysFromNow * MS_PER_DAY),
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

  it('flips active → expired when end_date has passed', async () => {
    const c = await seedContract({ endDateDaysFromNow: -3, status: 'active' });

    const res = await syncEmploymentContractStatuses({ EmploymentContract, now });
    expect(res.modified).toBe(1);

    const after = await EmploymentContract.findById(c._id).lean();
    expect(after.status).toBe('expired');
  });

  it('does NOT touch terminated contracts even if end_date is past', async () => {
    const c = await seedContract({ endDateDaysFromNow: -10, status: 'terminated' });

    const res = await syncEmploymentContractStatuses({ EmploymentContract, now });
    expect(res.modified).toBe(0);

    const after = await EmploymentContract.findById(c._id).lean();
    expect(after.status).toBe('terminated');
  });

  it('does NOT touch draft contracts', async () => {
    const c = await seedContract({ endDateDaysFromNow: -10, status: 'draft' });

    const res = await syncEmploymentContractStatuses({ EmploymentContract, now });
    expect(res.modified).toBe(0);

    const after = await EmploymentContract.findById(c._id).lean();
    expect(after.status).toBe('draft');
  });

  it('does NOT flip contracts still in future', async () => {
    const c = await seedContract({ endDateDaysFromNow: 90, status: 'active' });

    const res = await syncEmploymentContractStatuses({ EmploymentContract, now });
    expect(res.modified).toBe(0);

    const after = await EmploymentContract.findById(c._id).lean();
    expect(after.status).toBe('active');
  });

  it('skips soft-deleted contracts', async () => {
    const c = await seedContract({
      endDateDaysFromNow: -10,
      status: 'active',
      deletedAt: new Date(now.getTime() - MS_PER_DAY),
    });

    const res = await syncEmploymentContractStatuses({ EmploymentContract, now });
    expect(res.modified).toBe(0);

    const after = await EmploymentContract.findById(c._id).lean();
    expect(after.status).toBe('active');
  });
});

// ─── summarizeSaudiLicenseExposure ──────────────────────────────

describe('summarizeSaudiLicenseExposure', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');

  async function seedEmployee({ scfhsExpiryDaysFromNow }) {
    const collName = Employee.collection.collectionName;
    const _id = new mongoose.Types.ObjectId();
    await mongoose.connection.db.collection(collName).insertOne({
      _id,
      employee_number: `HRS-${_id.toString().slice(-6)}`,
      national_id: `HRS${_id.toString().slice(-7).padStart(7, '0')}`,
      email: `hrs-${_id.toString()}@test.local`,
      scfhs_expiry:
        scfhsExpiryDaysFromNow == null
          ? null
          : new Date(now.getTime() + scfhsExpiryDaysFromNow * MS_PER_DAY),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return _id;
  }

  it('counts expired + expiring_within_60d correctly', async () => {
    await seedEmployee({ scfhsExpiryDaysFromNow: -10 }); // expired
    await seedEmployee({ scfhsExpiryDaysFromNow: -1 }); // expired
    await seedEmployee({ scfhsExpiryDaysFromNow: 20 }); // expiring soon
    await seedEmployee({ scfhsExpiryDaysFromNow: 50 }); // expiring soon
    await seedEmployee({ scfhsExpiryDaysFromNow: 120 }); // valid
    await seedEmployee({ scfhsExpiryDaysFromNow: null }); // no date

    const res = await summarizeSaudiLicenseExposure({ Employee, now });
    expect(res.expired).toBe(2);
    expect(res.expiring_within_60d).toBe(2);
  });

  it('returns zeros on an empty collection', async () => {
    const res = await summarizeSaudiLicenseExposure({ Employee, now });
    expect(res.expired).toBe(0);
    expect(res.expiring_within_60d).toBe(0);
  });
});

// ─── runFullHrCredentialSync ────────────────────────────────────

describe('runFullHrCredentialSync', () => {
  const now = new Date('2026-04-22T12:00:00.000Z');

  it('runs all three phases and returns a consolidated report', async () => {
    await Certification.create({
      employee_id: new mongoose.Types.ObjectId(),
      branch_id: new mongoose.Types.ObjectId(),
      cert_type: 'cpr',
      cert_name_ar: 'إنعاش قلبي رئوي',
      is_mandatory: true,
      expiry_date: new Date(now.getTime() - 2 * MS_PER_DAY),
      status: 'valid',
    });

    const ecId = new mongoose.Types.ObjectId();
    await mongoose.connection.db
      .collection(EmploymentContract.collection.collectionName)
      .insertOne({
        _id: ecId,
        contract_number: `TEST-CONTRACT-FULL-${ecId.toString().slice(-6)}`,
        employee_id: new mongoose.Types.ObjectId(),
        branch_id: new mongoose.Types.ObjectId(),
        contract_type: 'fixed_term',
        start_date: new Date(now.getTime() - 400 * MS_PER_DAY),
        end_date: new Date(now.getTime() - 1 * MS_PER_DAY),
        position: 'Therapist',
        department: 'clinical',
        basic_salary: 10000,
        status: 'active',
        deleted_at: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const report = await runFullHrCredentialSync({
      Certification,
      EmploymentContract,
      Employee,
      now,
    });

    expect(report.certifications.modified).toBe(1);
    expect(report.certifications.tally.expired).toBe(1);
    expect(report.employmentContracts.modified).toBe(1);
    expect(report.saudiLicenseExposure).toEqual({ expired: 0, expiring_within_60d: 0 });
    expect(typeof report.durationMs).toBe('number');
    expect(typeof report.startedAt).toBe('string');
    expect(typeof report.finishedAt).toBe('string');
  });

  it('works when Employee is not provided (contract + certs only)', async () => {
    const report = await runFullHrCredentialSync({
      Certification,
      EmploymentContract,
      now,
    });
    expect(report.saudiLicenseExposure).toBeNull();
    expect(report.certifications.scanned).toBe(0);
    expect(report.employmentContracts.modified).toBe(0);
  });
});

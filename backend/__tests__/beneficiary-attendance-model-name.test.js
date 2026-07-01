'use strict';

/**
 * beneficiary-attendance-model-name.test.js
 *
 * services/beneficiaryCore.service.js `_getAttendanceSummary` queries
 * `{ beneficiaryId, date: {$gte} }.select('date status')` and counts status
 * === 'present' / 'حاضر'. But its model factory looked up
 * mongoose.model('AttendanceRecord') — a name registered by NO model — so the
 * try/catch swallowed the throw and returned null → safeQuery fell back to [] →
 * EVERY beneficiary's attendance summary was silently empty (last90Days 0, rate null).
 *
 * The model whose schema matches that query is BeneficiaryDayAttendance
 * (beneficiaryId + date + status ∈ {present,absent,late,…}). Static: the factory now
 * targets it. Behavioral: that model supports the exact query + present-count the
 * summary depends on.
 */

const fs = require('fs');
const path = require('path');

describe('beneficiary attendance model name (static)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'services', 'beneficiaryCore.service.js'),
    'utf8'
  );
  test('the Attendance factory targets BeneficiaryDayAttendance, not the unregistered AttendanceRecord', () => {
    expect(src).toMatch(/mongoose\.model\('BeneficiaryDayAttendance'\)/);
    expect(src).not.toMatch(/mongoose\.model\('AttendanceRecord'\)/);
  });
});

describe('beneficiary attendance summary query (behavioral)', () => {
  jest.unmock('mongoose');
  jest.setTimeout(60000);
  let mongoose;
  let mongod;
  let BDA;

  beforeAll(async () => {
    mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'ben-attendance' } });
    await mongoose.connect(mongod.getUri());
    BDA = require('../models/BeneficiaryDayAttendance');
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => null);
    if (mongod) await mongod.stop().catch(() => null);
  });

  test('the exact summary query resolves real present/absent counts (not the empty fallback)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const day = d => new Date(Date.now() - d * 86400000);
    await BDA.create([
      { beneficiaryId, branchId, date: day(1), status: 'present', checkInTime: new Date() },
      { beneficiaryId, branchId, date: day(2), status: 'present', checkInTime: new Date() },
      { beneficiaryId, branchId, date: day(3), status: 'absent' },
      { beneficiaryId, branchId, date: day(4), status: 'late', checkInTime: new Date() },
    ]);

    // same query + counting _getAttendanceSummary performs
    const records = await BDA.find({
      beneficiaryId,
      date: { $gte: new Date(Date.now() - 90 * 86400000) },
    })
      .select('date status')
      .lean();
    const total = records.length;
    const present = records.filter(r => r.status === 'present' || r.status === 'حاضر').length;

    expect(total).toBe(4); // pre-fix: 0 (AttendanceRecord unregistered → [] fallback)
    expect(present).toBe(2);
    expect(Math.round((present / total) * 100)).toBe(50);
  });
});

'use strict';

/**
 * diversity-behavioral-wave1199.test.js — DiversitySnapshot against MongoMemoryServer.
 * Valid save, aggregate-only (no individual rows persisted), Wave-18 invariants on
 * save AND update-save (markModified gotcha).
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Snap;
const oid = () => new mongoose.Types.ObjectId();

function base(over = {}) {
  return {
    branchId: oid(),
    scope: { level: 'branch', department: null },
    computedAt: new Date('2026-06-01'),
    headcount: 12,
    gender: { counts: { male: 6, female: 6 }, pct: { male: 50, female: 50 } },
    nationality: { counts: { saudi: 7, nonSaudi: 5 }, pct: { saudi: 58.3, nonSaudi: 41.7 } },
    saudizationRatePct: 58.3,
    diversityIndex: { genderBlau: 0.5, nationalityBlau: 0.49, departmentShannon: 1 },
    seniorityCliff: { gender: { female: -40, male: 40 }, nationality: {}, reportable: true },
    ...over,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1199-dei' } });
  await mongoose.connect(mongod.getUri());
  Snap = require('../models/HR/DiversitySnapshot');
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('W1199 DiversitySnapshot — happy path', () => {
  test('a valid snapshot saves; stores aggregate maps only (no salaries/identities)', async () => {
    const d = await Snap.create(base());
    expect(d._id).toBeDefined();
    expect(d.saudizationRatePct).toBe(58.3);
    expect(d.gender.pct.male).toBe(50);
    const json = JSON.stringify(d.toObject());
    expect(json).not.toMatch(/employeeId|basic_salary|"salary"/);
  });

  test('department-scoped snapshot saves with a department', async () => {
    const d = await Snap.create(base({ scope: { level: 'department', department: 'PT' } }));
    expect(d.scope.department).toBe('PT');
  });
});

describe('W1199 DiversitySnapshot — Wave-18 invariants', () => {
  test('saudization out of [0,100] rejected', async () => {
    await expect(Snap.create(base({ saudizationRatePct: 120 }))).rejects.toThrow(/saudizationRatePct/);
  });
  test('a diversity index out of [0,1] rejected', async () => {
    await expect(
      Snap.create(base({ diversityIndex: { genderBlau: 1.5, nationalityBlau: 0.4, departmentShannon: 1 } }))
    ).rejects.toThrow(/genderBlau/);
  });
  test('department scope requires a department; branch scope forbids one', async () => {
    await expect(Snap.create(base({ scope: { level: 'department', department: null } }))).rejects.toThrow(/department/);
    await expect(Snap.create(base({ scope: { level: 'branch', department: 'PT' } }))).rejects.toThrow(/department/);
  });
  test('invariants fire on UPDATE-save too (markModified)', async () => {
    const d = await Snap.create(base());
    d.saudizationRatePct = 999;
    await expect(d.save()).rejects.toThrow(/saudizationRatePct/);
  });
});

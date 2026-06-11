'use strict';

/**
 * skills-gap-behavioral-wave1201.test.js — EmployeeCompetency + RoleCompetencyRequirement
 * against MongoMemoryServer: schema validation + unique indexes. Employee is NOT
 * registered → the hrBranchScope plugin's derive is a graceful no-op.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let EC;
let RCR;
const oid = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1201-skg' } });
  await mongoose.connect(mongod.getUri());
  EC = require('../models/HR/EmployeeCompetency');
  RCR = require('../models/HR/RoleCompetencyRequirement');
  // Build indexes NOW instead of racing autoIndex (W1222 lesson, inverse
  // direction): the unique-index test needs the index to EXIST before the
  // duplicate insert — on fast CI runners autoIndex sometimes hadn't
  // finished and both inserts succeeded → flaky deploy-gate red.
  await EC.init();
  await RCR.init();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
afterEach(async () => {
  if (EC) await EC.deleteMany({});
  if (RCR) await RCR.deleteMany({});
});

describe('W1201 EmployeeCompetency', () => {
  test('valid assessment saves; defaults assessedAt', async () => {
    const d = await EC.create({ employeeId: oid(), competencyKey: 'assessment', currentLevel: 3 });
    expect(d.currentLevel).toBe(3);
    expect(d.assessedAt).toBeInstanceOf(Date);
  });
  test('currentLevel out of [0,5] is rejected', async () => {
    await expect(EC.create({ employeeId: oid(), competencyKey: 'x', currentLevel: 6 })).rejects.toThrow(/currentLevel/);
    await expect(EC.create({ employeeId: oid(), competencyKey: 'x', currentLevel: -1 })).rejects.toThrow(/currentLevel/);
  });
  test('one row per (employee, competency) — unique index', async () => {
    const emp = oid();
    await EC.create({ employeeId: emp, competencyKey: 'assessment', currentLevel: 2 });
    await expect(EC.create({ employeeId: emp, competencyKey: 'assessment', currentLevel: 4 })).rejects.toThrow(/duplicate key|E11000/);
  });
});

describe('W1201 RoleCompetencyRequirement', () => {
  test('valid requirement saves with default criticality + active', async () => {
    const d = await RCR.create({ jobTitle: 'أخصائي تخاطب', competencyKey: 'assessment', competencyNameAr: 'التقييم', requiredLevel: 4 });
    expect(d.criticality).toBe('important');
    expect(d.active).toBe(true);
  });
  test('requiredLevel out of [1,5] rejected; bad criticality rejected', async () => {
    await expect(RCR.create({ jobTitle: 'r', competencyKey: 'c', competencyNameAr: 'x', requiredLevel: 6 })).rejects.toThrow(/requiredLevel/);
    await expect(RCR.create({ jobTitle: 'r', competencyKey: 'c', competencyNameAr: 'x', requiredLevel: 3, criticality: 'bogus' })).rejects.toThrow(/criticality/);
  });
  test('one requirement per (jobTitle, competency) — unique index', async () => {
    await RCR.create({ jobTitle: 'role-A', competencyKey: 'k', competencyNameAr: 'x', requiredLevel: 3 });
    await expect(RCR.create({ jobTitle: 'role-A', competencyKey: 'k', competencyNameAr: 'y', requiredLevel: 4 })).rejects.toThrow(/duplicate key|E11000/);
  });
});

'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let runBackfill;
let UniversalCode;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // Loading models registers them under their canonical names.
  // We DON'T load the plugin so we can simulate "existing data" without
  // codes — then run backfill and verify it fills them in.
  // Each model file already loads the plugin; to avoid it firing on save,
  // we insert via insertMany() with `{ collection.insertMany }` directly
  // (bypassing mongoose middleware).
  require('../models/Beneficiary');
  require('../models/HR/Employee');
  UniversalCode = require('../models/UniversalCode');
  runBackfill = require('../services/universalCode/backfill').runBackfill;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await UniversalCode.deleteMany({});
  await mongoose.connection.db.collection('beneficiaries').deleteMany({});
  await mongoose.connection.db.collection('employees').deleteMany({});
});

describe('UniversalCode backfill', () => {
  test('issues codes for entities created BEFORE the plugin was installed', async () => {
    // Bypass mongoose save hooks by writing through the native driver.
    const beneCol = mongoose.connection.db.collection('beneficiaries');
    await beneCol.insertMany([
      { _id: new mongoose.Types.ObjectId(), firstName: 'Ali', lastName: 'Saeed' },
      { _id: new mongoose.Types.ObjectId(), firstName: 'Sara', lastName: 'Hassan' },
      { _id: new mongoose.Types.ObjectId(), fullName: 'Test Three' },
    ]);
    expect(await UniversalCode.countDocuments()).toBe(0);

    const summary = await runBackfill({ entityTypes: ['BNF'] });
    expect(summary.totals.scanned).toBe(3);
    expect(summary.totals.issued).toBe(3);
    expect(summary.totals.skipped).toBe(0);

    const codes = await UniversalCode.find({ entityType: 'BNF' }).lean();
    expect(codes).toHaveLength(3);
    expect(codes.every(c => /^RH-BNF-[0-9A-Z]{6}$/.test(c.code))).toBe(true);
    const labels = codes.map(c => c.entityLabel).sort();
    expect(labels).toEqual(['Ali Saeed', 'Sara Hassan', 'Test Three']);
  });

  test('is idempotent — re-running does NOT issue duplicates', async () => {
    const beneCol = mongoose.connection.db.collection('beneficiaries');
    await beneCol.insertOne({ _id: new mongoose.Types.ObjectId(), firstName: 'X', lastName: 'Y' });

    const r1 = await runBackfill({ entityTypes: ['BNF'] });
    expect(r1.totals.issued).toBe(1);

    const r2 = await runBackfill({ entityTypes: ['BNF'] });
    expect(r2.totals.issued).toBe(0);
    expect(r2.totals.skipped).toBe(1);

    expect(await UniversalCode.countDocuments()).toBe(1);
  });

  test('dryRun reports counts without writing', async () => {
    const beneCol = mongoose.connection.db.collection('beneficiaries');
    await beneCol.insertOne({ _id: new mongoose.Types.ObjectId(), firstName: 'X', lastName: 'Y' });

    const r = await runBackfill({ entityTypes: ['BNF'], dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.totals.issued).toBe(1);
    expect(await UniversalCode.countDocuments()).toBe(0); // nothing actually written
  });

  test('handles unloaded model gracefully (missingModel flag)', async () => {
    const r = await runBackfill({ entityTypes: ['VEH'] }); // model not required above
    expect(r.byType[0].missingModel).toBe(true);
    expect(r.totals.issued).toBe(0);
  });

  test('covers multiple types in one run', async () => {
    const beneCol = mongoose.connection.db.collection('beneficiaries');
    const empCol = mongoose.connection.db.collection('employees');
    await beneCol.insertOne({ _id: new mongoose.Types.ObjectId(), firstName: 'B', lastName: 'X' });
    // insertOne sequentially: Employee schema has multiple unique sparse
    // indexes that an insertMany with null values trips over.
    await empCol.insertOne({
      _id: new mongoose.Types.ObjectId(),
      full_name_ar: 'موظف 1',
      employee_number: 'E001',
      national_id: '1000000001',
      email: 'emp1@test.local',
    });
    await empCol.insertOne({
      _id: new mongoose.Types.ObjectId(),
      full_name_ar: 'موظف 2',
      employee_number: 'E002',
      national_id: '1000000002',
      email: 'emp2@test.local',
    });

    const r = await runBackfill({ entityTypes: ['BNF', 'EMP'] });
    expect(r.totals.scanned).toBe(3);
    expect(r.totals.issued).toBe(3);

    const byType = Object.fromEntries(r.byType.map(x => [x.entityType, x]));
    expect(byType.BNF.issued).toBe(1);
    expect(byType.EMP.issued).toBe(2);
  });
});

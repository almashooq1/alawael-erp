'use strict';

/**
 * W1385 — JobBandMapping behavioral (MongoMemoryServer).
 * Verifies the org-global job→band config: defaults, one-band-per-title unique
 * index, and that the service upsert is idempotent per title.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let JobBandMapping;
let svc;
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  JobBandMapping = require('../models/HR/JobBandMapping');
  await JobBandMapping.init(); // build indexes before the unique-constraint assertion
  svc = require('../services/hr/payEquityService');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await JobBandMapping.deleteMany({});
});

describe('W1385 JobBandMapping model', () => {
  test('requires jobTitle + bandCode', async () => {
    await expect(JobBandMapping.create({ jobTitle: 'Senior Therapist' })).rejects.toThrow(/bandCode/);
    await expect(JobBandMapping.create({ bandCode: 'L4' })).rejects.toThrow(/jobTitle/);
  });

  test('defaults active=true; is org-global (no branchId in schema)', async () => {
    const m = await JobBandMapping.create({ jobTitle: 'Senior Therapist', bandCode: 'L4' });
    expect(m.active).toBe(true);
    expect(m.schema.path('branchId')).toBeUndefined(); // reference data, NOT branch-scoped
  });

  test('one band per job title (unique index)', async () => {
    await JobBandMapping.create({ jobTitle: 'Therapist', bandCode: 'L3' });
    await expect(JobBandMapping.create({ jobTitle: 'Therapist', bandCode: 'L4' })).rejects.toThrow(/E11000|duplicate/);
  });
});

describe('W1385 payEquityService.upsertJobBandMapping', () => {
  test('creates then UPDATES the same title (idempotent per title, not duplicated)', async () => {
    const a = await svc.upsertJobBandMapping({ jobTitle: 'Manager', bandCode: 'L5' });
    expect(a.bandCode).toBe('L5');
    const b = await svc.upsertJobBandMapping({ jobTitle: 'Manager', bandCode: 'L6', note: 'regrade' });
    expect(b.bandCode).toBe('L6');
    expect(b.note).toBe('regrade');
    expect(await JobBandMapping.countDocuments({ jobTitle: 'Manager' })).toBe(1);
  });

  test('rejects missing jobTitle/bandCode with a VALIDATION code', async () => {
    await expect(svc.upsertJobBandMapping({ jobTitle: '', bandCode: 'L1' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(svc.upsertJobBandMapping({ jobTitle: 'X', bandCode: '  ' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  test('listJobBandMappings returns all, sorted by jobTitle', async () => {
    await svc.upsertJobBandMapping({ jobTitle: 'Zed', bandCode: 'L1' });
    await svc.upsertJobBandMapping({ jobTitle: 'Abe', bandCode: 'L2' });
    const list = await svc.listJobBandMappings();
    expect(list.map((m) => m.jobTitle)).toEqual(['Abe', 'Zed']);
  });
});

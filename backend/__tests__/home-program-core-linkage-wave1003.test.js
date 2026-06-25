'use strict';

/**
 * home-program-core-linkage-wave1003.test.js — W1003.
 *
 * Wires home-program lifecycle onto the unified-core timeline via a SHARED
 * `home_program` vocabulary across FamilyHomeProgram + HomeAssignment (the same
 * shared-domain pattern as W997 referrals). A program ASSIGNED (parent-administered
 * home exercises — care extends home, info) and COMPLETED (success). Fills the
 * long-declared-but-producerless `home_program_assigned` CareTimeline enum + a new
 * `home_program_completed`. RUNTIME end-to-end against real in-memory Mongo + the
 * real integration bus + real subscribers. Covers both field-name variants
 * (`beneficiaryId` for FamilyHomeProgram, `beneficiary` for HomeAssignment).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let FamilyHomeProgram, HomeAssignment, CareTimeline;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1003-homeprog' } });
  await mongoose.connect(mongod.getUri());

  // Install the global legacy-hook shim EXACTLY as server.js does, BEFORE the
  // models declare their hooks. This makes FamilyHomeProgram's existing
  // `pre('validate', function (next))` callback hook work under Mongoose 9 (the
  // W946/W954 rescue) AND — crucially — exercises MY new `post('save',
  // function(doc))` / 0-param hooks through the REAL prod shim, proving they are
  // W954-safe (don't hang). This is the prod boot path the W974/W954 saga showed
  // a plain MMS test does NOT replicate.
  const plugins = require('../config/mongoose.plugins');
  plugins.registerGlobalPlugins();

  FamilyHomeProgram = require('../models/FamilyHomeProgram');
  HomeAssignment = require('../models/HomeAssignment');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');
  const { integrationBus } = require('../integration/systemIntegrationBus');
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([
    FamilyHomeProgram.deleteMany({}),
    HomeAssignment.deleteMany({}),
    CareTimeline.deleteMany({}),
  ]);
});

describe('W1003 — home programs reach the unified-core timeline', () => {
  it('FamilyHomeProgram (beneficiaryId): assigned on create → INFO, completed → SUCCESS', async () => {
    const ben = new mongoose.Types.ObjectId();
    const p = await FamilyHomeProgram.create({
      beneficiaryId: ben,
      branchId: new mongoose.Types.ObjectId(),
      title: 'Daily stretching',
      startDate: new Date(),
    });
    const assignedRows = await waitForRows(
      {
        beneficiaryId: ben,
        eventType: 'home_program_assigned',
      },
      1
    );
    const assigned = assignedRows[0];
    expect(assigned).toBeTruthy();
    expect(assigned.category).toBe('clinical');
    expect(assigned.severity).toBe('info');
    expect(assigned.metadata.programType).toBe('family');

    const loaded = await FamilyHomeProgram.findById(p._id);
    loaded.status = 'COMPLETED';
    await loaded.save();
    const completedRows = await waitForRows(
      {
        beneficiaryId: ben,
        eventType: 'home_program_completed',
      },
      1
    );
    const completed = completedRows[0];
    expect(completed).toBeTruthy();
    expect(completed.severity).toBe('success');
  });

  it('HomeAssignment (beneficiary): assigned on create → INFO, completed → SUCCESS', async () => {
    const ben = new mongoose.Types.ObjectId();
    const a = await HomeAssignment.create({
      beneficiary: ben,
      assignedBy: new mongoose.Types.ObjectId(),
      title: 'Balance drills',
      description: 'Stand on one leg 30s x3',
    });
    const assignedRows = await waitForRows(
      {
        beneficiaryId: ben,
        eventType: 'home_program_assigned',
      },
      1
    );
    const assigned = assignedRows[0];
    expect(assigned).toBeTruthy();
    expect(assigned.metadata.programType).toBe('assignment');

    const loaded = await HomeAssignment.findById(a._id);
    loaded.status = 'COMPLETED';
    await loaded.save();
    const completedRows = await waitForRows(
      {
        beneficiaryId: ben,
        eventType: 'home_program_completed',
      },
      1
    );
    const completed = completedRows[0];
    expect(completed).toBeTruthy();
    expect(completed.severity).toBe('success');
  });

  it('a metadata-only re-save (no status change) does NOT re-fire — exactly one row', async () => {
    const ben = new mongoose.Types.ObjectId();
    const a = await HomeAssignment.create({
      beneficiary: ben,
      assignedBy: new mongoose.Types.ObjectId(),
      title: 'x',
      description: 'y',
    });
    await waitForRows({ beneficiaryId: ben, eventType: 'home_program_assigned' }, 1);
    const loaded = await HomeAssignment.findById(a._id);
    loaded.videoUrl = 'http://example/v';
    await loaded.save();
    await waitForCount({ beneficiaryId: ben }, 1);
  });
});

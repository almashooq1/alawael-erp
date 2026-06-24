'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const { MeasureAlert } = require('../domains/goals/models/MeasureAlert');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await MeasureAlert.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function alert(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    alertType: 'REGRESSION_DETECTED',
    measureCode: 'VABS3',
    measureId: new mongoose.Types.ObjectId(),
    severity: 'medium',
    ...overrides,
  };
}

describe('W1116 — MeasureAlert raised → unified-core CareTimeline linkage', () => {
  test('records a clinical row when a measure-driven alert is raised', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await MeasureAlert.create(
      alert(beneficiaryId, { branchId, measureCode: 'CARS2', severity: 'high' })
    );
    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('measure_alert_raised');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('error'); // high → error
    expect(String(row.metadata.alertId)).toBe(String(doc._id));
    expect(row.metadata.measureCode).toBe('CARS2');
    expect(row.metadata.alertType).toBe('REGRESSION_DETECTED');
    expect(row.title).toContain('(CARS2)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('maps a critical alert to a critical timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MeasureAlert.create(
      alert(beneficiaryId, { severity: 'critical', alertType: 'PLATEAU_DETECTED' })
    );
    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].severity).toBe('critical');
  });

  test('does not double-record on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await MeasureAlert.create(alert(beneficiaryId));
    await waitForCount({ beneficiaryId }, 1);

    doc.status = 'acknowledged';
    doc.acknowledgedAt = new Date();
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });

  test('records one row per distinct alert', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await MeasureAlert.create(alert(beneficiaryId, { alertType: 'MCID_NOT_MET' }));
    await MeasureAlert.create(alert(beneficiaryId, { alertType: 'FORECAST_OFF_TRACK' }));
    await waitForCount({ beneficiaryId }, 2);
  });
});

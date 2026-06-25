'use strict';

/**
 * W1094 — CdssAlert → unified core timeline linkage.
 *
 * Raising a critical/emergency clinical-decision-support alert publishes
 * `cdss-alert.cdss_alert.raised`, which the DDD cross-module subscriber
 * materialises into a per-beneficiary CareTimeline row (category: clinical).
 * Info/warning alerts must NOT surface on the beneficiary timeline.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const CdssAlert = require('../models/CdssAlert');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1094-cdss-alert' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await CdssAlert.deleteMany({});
  await CareTimeline.deleteMany({});
});

function alert(overrides = {}) {
  return {
    branchId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    ruleId: new mongoose.Types.ObjectId(),
    alertType: 'allergy',
    severity: 'critical',
    message: 'Known allergy contraindication',
    messageAr: 'يوجد تعارض مع حساسية معروفة',
    ...overrides,
  };
}

describe('W1094 — CdssAlert → CareTimeline linkage', () => {
  it('records a clinical timeline row on a critical alert', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await CdssAlert.create(
      alert({ beneficiaryId, branchId, severity: 'critical', alertType: 'drug_interaction' })
    );

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('cdss_alert_raised');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('error'); // critical → error
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.alertId)).toBe(String(doc._id));
    expect(row.metadata.alertType).toBe('drug_interaction');
    expect(row.title).toContain('drug_interaction');
  });

  it('maps an emergency alert to critical timeline severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await CdssAlert.create(alert({ beneficiaryId, severity: 'emergency' }));

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.severity).toBe('critical'); // emergency → critical
  });

  it('does NOT fire for an info/warning alert', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await CdssAlert.create(alert({ beneficiaryId, severity: 'warning' }));

    await waitForCount({ beneficiaryId }, 0);
  });

  it('does not duplicate the timeline row when the alert is acknowledged', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await CdssAlert.create(alert({ beneficiaryId, severity: 'critical' }));

    await waitForRows({ beneficiaryId }, 1);

    doc.status = 'acknowledged';
    doc.acknowledgedAt = new Date();
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});

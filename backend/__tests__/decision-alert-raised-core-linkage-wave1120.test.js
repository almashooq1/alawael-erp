'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const DecisionAlert = require('../domains/dashboards/models/DecisionAlert');
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
  await DecisionAlert.deleteMany({});
});

/**
 * @param {mongoose.Types.ObjectId} beneficiaryId
 * @param {Record<string, unknown>} [overrides]
 */
function alert(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    title: 'Clinical risk detected',
    description: 'Outcome decline observed across two measurement cycles.',
    category: 'clinical_risk',
    severity: 'high',
    source: { type: 'rule_engine' },
    ...overrides,
  };
}

async function settle() {
  await new Promise(r => setTimeout(r, 60));
}

describe('W1120 — DecisionAlert raised → unified-core CareTimeline linkage', () => {
  test('records a system row when a beneficiary decision alert is raised', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await DecisionAlert.create(
      alert(beneficiaryId, { branchId, category: 'treatment_gap', severity: 'high' })
    );
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('decision_alert_raised');
    expect(row.category).toBe('system');
    expect(row.severity).toBe('error'); // high → error
    expect(String(row.metadata.alertId)).toBe(String(doc._id));
    expect(row.metadata.category).toBe('treatment_gap');
    expect(row.title).toContain('(treatment_gap)');
    expect(String(row.branchId)).toBe(String(branchId));
  });

  test('maps a critical alert to a critical row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await DecisionAlert.create(alert(beneficiaryId, { severity: 'critical' }));
    await settle();

    const rows = await CareTimeline.find({ beneficiaryId }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].severity).toBe('critical');
  });

  test('does NOT link a non-beneficiary-scoped alert', async () => {
    const doc = await DecisionAlert.create({
      title: 'System-wide KPI breach',
      description: 'Branch occupancy below threshold.',
      category: 'kpi_breach',
      severity: 'medium',
      source: { type: 'kpi_monitor' },
      branchId: new mongoose.Types.ObjectId(),
    });
    await settle();

    expect(await CareTimeline.countDocuments({})).toBe(0);
    expect(doc.category).toBe('kpi_breach');
  });

  test('does not double-record on a later status save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await DecisionAlert.create(alert(beneficiaryId));
    await settle();
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);

    doc.status = 'acknowledged';
    doc.acknowledgedAt = new Date();
    await doc.save();
    await settle();

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });
});

'use strict';

/**
 * ai-report-sent-core-linkage-wave1043.test.js — W1043.
 *
 * Links AI-generated REPORT delivery into the unified core (per-beneficiary
 * CareTimeline). When an AiGeneratedReport reaches status 'sent' (the family
 * receives the AI-generated progress / discharge / regulatory report), the model
 * emits ai-report.ai_report.sent → CareTimeline 'ai_report_sent'
 * (communication/success).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers):
 * asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let AiGeneratedReport;
let CareTimeline;
let integrationBus;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function baseReport(overrides = {}) {
  return {
    beneficiary_id: new mongoose.Types.ObjectId(),
    branch_id: new mongoose.Types.ObjectId(),
    report_type: 'progress_summary',
    period_type: 'monthly',
    period_start: new Date('2026-05-01'),
    period_end: new Date('2026-05-31'),
    status: 'draft',
    ...overrides,
  };
}

async function send(report) {
  report.status = 'sent';
  report.sent_via = 'email';
  report.sent_at = new Date();
  await report.save();
  return report;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w1043-ai-report-core' },
  });
  await mongoose.connect(mongod.getUri());

  AiGeneratedReport = require('../models/AiGeneratedReport');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  ({ integrationBus } = require('../integration/systemIntegrationBus'));
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([AiGeneratedReport.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1043 — AI-generated report delivery reaches the unified-core timeline', () => {
  it('sending an AI report lands an ai_report_sent row (communication/success)', async () => {
    const beneficiary_id = new mongoose.Types.ObjectId();
    const report = await send(await AiGeneratedReport.create(baseReport({ beneficiary_id })));

    const tl = await waitForTimeline({
      beneficiaryId: beneficiary_id,
      eventType: 'ai_report_sent',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('communication');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.reportId)).toBe(String(report._id));
    expect(tl.metadata.reportType).toBe('progress_summary');
    expect(tl.metadata.sentVia).toBe('email');
  });

  it('a draft AI report produces NO sent timeline row', async () => {
    const beneficiary_id = new mongoose.Types.ObjectId();
    await AiGeneratedReport.create(baseReport({ beneficiary_id, status: 'draft' }));

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'ai_report_sent' })).toBe(0);
  });

  it('re-saving an already-sent report does not re-fire the event', async () => {
    const beneficiary_id = new mongoose.Types.ObjectId();
    const report = await send(await AiGeneratedReport.create(baseReport({ beneficiary_id })));

    const tl = await waitForTimeline({
      beneficiaryId: beneficiary_id,
      eventType: 'ai_report_sent',
    });
    expect(tl).toBeTruthy();

    const again = await AiGeneratedReport.findById(report._id);
    again.model_version = 'gpt-4o-2026-05';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId: beneficiary_id,
        eventType: 'ai_report_sent',
      })
    ).toBe(1);
  });
});

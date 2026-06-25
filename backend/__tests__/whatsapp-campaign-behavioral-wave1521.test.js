'use strict';

/**
 * whatsapp-campaign-behavioral-wave1521.test.js — behavioral counterpart to the
 * static drift guards whatsapp-campaigns-wave1495 + whatsapp-campaign-scheduler-
 * wave1501.
 *
 * The static guards check SOURCE TEXT; they cannot prove the campaign actually
 * transitions status, filters recipients by consent, computes metrics, stays
 * idempotent under a double sweep, or isolates by branch. Those are exactly the
 * risky behaviors — the scheduler MUTATES (status→running→completed) and SENDS.
 * This file exercises the real service against an in-memory MongoDB, with only
 * the transport (template send + rate-limit) mocked.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/whatsapp-campaign-behavioral-wave1521.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

// Mock the transport only — never actually send.
jest.mock('../services/whatsapp/whatsappTemplates.service', () => ({
  sendTemplate: jest.fn(async () => ({ success: true })),
}));
jest.mock('../services/whatsapp/rateLimit.service', () => ({
  checkAndRecord: jest.fn(async () => ({ allowed: true })),
}));

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const templates = require('../services/whatsapp/whatsappTemplates.service');
const rateLimit = require('../services/whatsapp/rateLimit.service');

let mongod;
let Campaign;
let Group;
let Consent;
let svc;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

beforeAll(async () => {
  // Reuse the shared MMS started by jest.globalSetup (CI) if present; else spin
  // up our own (standalone local run).
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'wa-campaign-1521' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Campaign = require('../models/WhatsAppCampaign');
  Group = require('../models/WhatsAppContactGroup');
  Consent = require('../models/WhatsAppConsent');
  svc = require('../services/whatsapp/whatsappCampaign.service');
  await Promise.all([Campaign.init(), Group.init(), Consent.init()]);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Promise.all([Campaign.deleteMany({}), Group.deleteMany({}), Consent.deleteMany({})]);
  templates.sendTemplate.mockClear();
  rateLimit.checkAndRecord.mockClear();
});

// helper: a group in BRANCH_A with the given member phones
async function makeGroup(phones, branchId = BRANCH_A) {
  return Group.create({
    name: 'مجموعة اختبار',
    branchId,
    members: phones.map((p, i) => ({ phone: p, name: `عضو ${i}` })),
  });
}

describe('W1521 createCampaign — status + validation', () => {
  test('no schedule → draft; with schedule → scheduled; branchId persisted', async () => {
    const g = await makeGroup(['966500000001']);
    const draft = await svc.createCampaign(
      { name: 'حملة', contactGroupId: g._id, templateKey: 'reminder' },
      { branchId: String(BRANCH_A) }
    );
    expect(draft.status).toBe('draft');
    expect(String(draft.branchId)).toBe(String(BRANCH_A));

    const sched = await svc.createCampaign(
      { name: 'مجدولة', contactGroupId: g._id, templateKey: 'reminder', scheduledAt: new Date(Date.now() + 3600_000) },
      { branchId: String(BRANCH_A) }
    );
    expect(sched.status).toBe('scheduled');
  });

  test('rejects missing name / bad group id / missing template', async () => {
    const g = await makeGroup(['966500000001']);
    await expect(svc.createCampaign({ contactGroupId: g._id, templateKey: 't' }, {})).rejects.toMatchObject({ statusCode: 400 });
    await expect(svc.createCampaign({ name: 'x', contactGroupId: 'not-an-id', templateKey: 't' }, {})).rejects.toMatchObject({ statusCode: 400 });
    await expect(svc.createCampaign({ name: 'x', contactGroupId: g._id }, {})).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('W1521 runCampaign — consent gating + metrics + state machine', () => {
  test('sends only to consenting members; metrics + status completed', async () => {
    // member 1 opted-in (eligible), member 2 has no consent record (blocked)
    await Consent.setConsent('966500000001', true);
    const g = await makeGroup(['966500000001', '966500000002']);
    const c = await svc.createCampaign(
      { name: 'حملة', contactGroupId: g._id, templateKey: 'reminder' },
      { branchId: String(BRANCH_A) }
    );

    const ran = await svc.runCampaign(String(c._id), String(BRANCH_A));

    expect(ran.status).toBe('completed');
    expect(ran.metrics).toMatchObject({ targeted: 2, eligible: 1, blocked: 1, sent: 1 });
    // sent to the eligible phone only
    expect(templates.sendTemplate).toHaveBeenCalledTimes(1);
    expect(templates.sendTemplate.mock.calls[0][1]).toBe('966500000001');
  });

  test('a completed campaign is not runnable again (409) → no re-send', async () => {
    await Consent.setConsent('966500000001', true);
    const g = await makeGroup(['966500000001']);
    const c = await svc.createCampaign({ name: 'h', contactGroupId: g._id, templateKey: 'reminder' }, { branchId: String(BRANCH_A) });
    await svc.runCampaign(String(c._id), String(BRANCH_A));
    templates.sendTemplate.mockClear();
    await expect(svc.runCampaign(String(c._id), String(BRANCH_A))).rejects.toMatchObject({ statusCode: 409 });
    expect(templates.sendTemplate).not.toHaveBeenCalled();
  });
});

describe('W1521 cancelCampaign', () => {
  test('draft → cancelled; cancelling a completed campaign → 409', async () => {
    const g = await makeGroup(['966500000001']);
    const c = await svc.createCampaign({ name: 'h', contactGroupId: g._id, templateKey: 'reminder' }, { branchId: String(BRANCH_A) });
    const cancelled = await svc.cancelCampaign(String(c._id), String(BRANCH_A));
    expect(cancelled.status).toBe('cancelled');

    await Consent.setConsent('966500000001', true);
    const c2 = await svc.createCampaign({ name: 'h2', contactGroupId: g._id, templateKey: 'reminder' }, { branchId: String(BRANCH_A) });
    await svc.runCampaign(String(c2._id), String(BRANCH_A));
    await expect(svc.cancelCampaign(String(c2._id), String(BRANCH_A))).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('W1521 runDueCampaigns — scheduler mutation + idempotency', () => {
  test('launches only past-due scheduled campaigns; second sweep is a no-op', async () => {
    await Consent.setConsent('966500000001', true);
    const g = await makeGroup(['966500000001']);
    // one due (past), one future
    await svc.createCampaign(
      { name: 'مستحقة', contactGroupId: g._id, templateKey: 'reminder', scheduledAt: new Date(Date.now() - 1000) },
      { branchId: String(BRANCH_A) }
    );
    await svc.createCampaign(
      { name: 'لاحقة', contactGroupId: g._id, templateKey: 'reminder', scheduledAt: new Date(Date.now() + 3600_000) },
      { branchId: String(BRANCH_A) }
    );

    const first = await svc.runDueCampaigns({ now: Date.now() });
    expect(first).toMatchObject({ due: 1, processed: 1, failed: 0 });
    expect(templates.sendTemplate).toHaveBeenCalledTimes(1);

    // second sweep: the launched campaign is now 'completed' (not 'scheduled')
    templates.sendTemplate.mockClear();
    const second = await svc.runDueCampaigns({ now: Date.now() });
    expect(second.due).toBe(0);
    expect(templates.sendTemplate).not.toHaveBeenCalled();
  });
});

describe('W1521 branch isolation', () => {
  test('a campaign in branch A is invisible to branch B', async () => {
    const g = await makeGroup(['966500000001']);
    const c = await svc.createCampaign({ name: 'h', contactGroupId: g._id, templateKey: 'reminder' }, { branchId: String(BRANCH_A) });
    expect(await svc.getCampaign(String(c._id), String(BRANCH_B))).toBeNull();
    expect(await svc.getCampaign(String(c._id), String(BRANCH_A))).not.toBeNull();
    await expect(svc.runCampaign(String(c._id), String(BRANCH_B))).rejects.toMatchObject({ statusCode: 404 });
  });
});

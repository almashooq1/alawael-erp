'use strict';

/**
 * whatsapp-engagement-insight-behavioral-wave1526.test.js
 *
 * Behavioral coverage for the WhatsApp engagement-health insight (W1526): given
 * conversations at various lastMessageAt recencies, prove the tiering, the
 * actionable outreach list, branch isolation, and the never-throw contract.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/whatsapp-engagement-insight-behavioral-wave1526.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Conversation;
let svc;

const NOW = new Date('2026-06-25T12:00:00Z').getTime();
const daysAgo = d => new Date(NOW - d * 86400000);
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'wa-engagement-1526' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Conversation = require('../models/WhatsAppConversation');
  svc = require('../services/whatsapp/whatsappEngagementInsight.service');
  await Conversation.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Conversation.deleteMany({});
});

async function convo(phone, dAgo, over = {}) {
  return Conversation.create({
    phone,
    status: 'active',
    branchId: BRANCH_A,
    lastMessageAt: daysAgo(dAgo),
    beneficiaryId: new mongoose.Types.ObjectId(),
    ...over,
  });
}

describe('W1526 pure tiering', () => {
  test('engagementTier buckets by recency', () => {
    expect(svc.engagementTier(daysAgo(2), NOW)).toBe('active');
    expect(svc.engagementTier(daysAgo(14), NOW)).toBe('cooling');
    expect(svc.engagementTier(daysAgo(40), NOW)).toBe('silent');
    expect(svc.engagementTier(daysAgo(120), NOW)).toBe('dormant');
    expect(svc.engagementTier(null, NOW)).toBe('dormant'); // never engaged
  });
  test('daysSince + needsOutreach', () => {
    expect(svc.daysSince(daysAgo(10), NOW)).toBe(10);
    expect(svc.daysSince(null)).toBe(Infinity);
    expect(svc.needsOutreach('silent')).toBe(true);
    expect(svc.needsOutreach('active')).toBe(false);
  });
});

describe('W1526 buildEngagementInsight', () => {
  test('counts each tier + builds the outreach list (silent+dormant only)', async () => {
    await convo('966500000001', 1); // active
    await convo('966500000002', 14); // cooling
    await convo('966500000003', 40); // silent
    await convo('966500000004', 120); // dormant
    const out = await svc.buildEngagementInsight({ branchScope: String(BRANCH_A), now: NOW });
    expect(out.tiers).toEqual({ active: 1, cooling: 1, silent: 1, dormant: 1 });
    expect(out.total).toBe(4);
    expect(out.outreachList).toHaveLength(2); // silent + dormant
    // oldest first
    expect(out.outreachList[0].tier).toBe('dormant');
    expect(out.outreachList[0].daysSilent).toBe(120);
    expect(out.outreachList[1].tier).toBe('silent');
  });

  test('only active-status conversations are scanned', async () => {
    await convo('966500000005', 40); // silent + active
    await convo('966500000006', 90, { status: 'archived' }); // ignored
    const out = await svc.buildEngagementInsight({ branchScope: String(BRANCH_A), now: NOW });
    expect(out.total).toBe(1);
    expect(out.tiers.silent).toBe(1);
  });

  test('branch isolation — branch B sees nothing of branch A', async () => {
    await convo('966500000007', 40);
    const out = await svc.buildEngagementInsight({ branchScope: String(BRANCH_B), now: NOW });
    expect(out.total).toBe(0);
    expect(out.outreachList).toEqual([]);
  });

  test('custom thresholds shift the buckets', async () => {
    await convo('966500000008', 10);
    const tight = await svc.buildEngagementInsight({ branchScope: String(BRANCH_A), now: NOW, thresholds: { active: 3, cooling: 7, silent: 30 } });
    expect(tight.tiers.silent).toBe(1); // 10d > cooling(7), <= silent(30)
  });

  test('never throws when the model is unavailable', async () => {
    const out = await svc.buildEngagementInsight({ deps: { Conversation: null }, now: NOW });
    expect(out.sources).toEqual({ conversations: 'unavailable' });
    expect(out.total).toBe(0);
  });
});

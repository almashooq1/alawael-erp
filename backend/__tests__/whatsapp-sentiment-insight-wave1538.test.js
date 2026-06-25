'use strict';

/**
 * whatsapp-sentiment-insight-wave1538.test.js — family-mood intelligence.
 * Pure scoring/trend + behavioral aggregation (MongoMemoryServer) + route/static.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const svc = require('../services/whatsapp/whatsappSentimentInsight.service');
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '../routes/whatsapp-insights.routes.js'),
  'utf8'
);

let mongod;
let Conversation;
const NOW = new Date('2026-06-25T12:00:00Z').getTime();
const daysAgo = d => new Date(NOW - d * 86400000);
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'wa-sentiment-1538' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Conversation = require('../models/WhatsAppConversation');
  await Conversation.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Conversation.deleteMany({});
});

// helper: a conversation with incoming messages of the given sentiments (oldest→newest)
async function convo(phone, sentiments, over = {}) {
  const messages = sentiments.map((s, i) => ({
    direction: 'incoming',
    text: `m${i}`,
    sentiment: s,
    timestamp: daysAgo(sentiments.length - i), // spread across recent days
  }));
  return Conversation.create({
    phone,
    status: 'active',
    branchId: BRANCH_A,
    lastMessageAt: daysAgo(1),
    beneficiaryId: new mongoose.Types.ObjectId(),
    messages,
    ...over,
  });
}

describe('W1538 pure scoring + trend', () => {
  test('sentimentScore: urgent counts negative', () => {
    expect(svc.sentimentScore('positive')).toBe(1);
    expect(svc.sentimentScore('negative')).toBe(-1);
    expect(svc.sentimentScore('urgent')).toBe(-1);
    expect(svc.sentimentScore('neutral')).toBe(0);
  });
  test('classifyMood thresholds', () => {
    expect(svc.classifyMood(0.5)).toBe('positive');
    expect(svc.classifyMood(-0.5)).toBe('negative');
    expect(svc.classifyMood(0)).toBe('neutral');
  });
  test('trendOf: newer-half vs older-half', () => {
    expect(svc.trendOf([-1, -1, 1, 1])).toBe('improving');
    expect(svc.trendOf([1, 1, -1, -1])).toBe('declining');
    expect(svc.trendOf([0, 0, 0, 0])).toBe('stable');
    expect(svc.trendOf([1, -1])).toBe('unknown'); // too few
  });
});

describe('W1538 buildSentimentInsight', () => {
  test('classifies mood per family + builds the attention list (negative/declining)', async () => {
    await convo('966500000001', ['positive', 'positive', 'positive', 'positive']); // positive
    await convo('966500000002', ['positive', 'positive', 'negative', 'negative']); // declining
    await convo('966500000003', ['negative', 'negative', 'negative', 'negative']); // negative
    await convo('966500000004', ['neutral', 'neutral']); // neutral (too few for trend)

    const out = await svc.buildSentimentInsight({ branchScope: String(BRANCH_A), now: NOW });
    expect(out.total).toBe(4);
    expect(out.moods.negative).toBe(1);
    expect(out.moods.positive).toBe(1);
    expect(out.trends.declining).toBe(1);
    // attention = negative mood OR declining trend → conv 2 + conv 3
    expect(out.attentionList).toHaveLength(2);
    expect(out.attentionList[0].mood).toBe('negative'); // worst first
  });

  test('only incoming messages with sentiment in the window count', async () => {
    await convo('966500000005', ['positive', 'negative'], {
      messages: [
        { direction: 'outgoing', sentiment: 'negative', text: 'x', timestamp: daysAgo(1) }, // outgoing — ignored
        { direction: 'incoming', text: 'y', timestamp: daysAgo(1) }, // no sentiment — ignored
        { direction: 'incoming', sentiment: 'negative', text: 'z', timestamp: daysAgo(400) }, // out of window
      ],
    });
    const out = await svc.buildSentimentInsight({
      branchScope: String(BRANCH_A),
      now: NOW,
      windowDays: 30,
    });
    expect(out.total).toBe(0); // nothing qualifies
  });

  test('branch isolation', async () => {
    await convo('966500000006', ['negative', 'negative', 'negative', 'negative']);
    const out = await svc.buildSentimentInsight({ branchScope: String(BRANCH_B), now: NOW });
    expect(out.total).toBe(0);
  });

  test('never throws when model unavailable', async () => {
    const out = await svc.buildSentimentInsight({ deps: { Conversation: null }, now: NOW });
    expect(out.sources).toEqual({ conversations: 'unavailable' });
  });
});

describe('W1538 static — route mounted + branch-scoped', () => {
  test('GET /sentiment exists + uses effectiveBranchScope', () => {
    expect(ROUTE_SRC).toMatch(/'\/sentiment'/);
    expect(ROUTE_SRC).toMatch(/whatsappSentimentInsight\.service/);
    expect(ROUTE_SRC).toMatch(/effectiveBranchScope\(req\)/);
  });
});

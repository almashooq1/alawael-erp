/**
 * whatsapp-system — route-level integration tests
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mounts the WhatsApp router on a bare Express app and exercises:
 *  - Webhook GET verification challenge
 *  - Webhook POST inbound event acknowledgement
 *  - Conversation list endpoint (shape + pagination)
 *  - Send-text validation (missing fields → 400)
 *  - AI classify endpoint (validation + happy path)
 *  - AI suggest-replies endpoint
 *  - Templates list (static catalog)
 *  - Status endpoint (enabled/disabled)
 *  - Analytics endpoint (shape)
 *
 * All service calls are mocked — no real HTTP, DB, or OpenAI traffic.
 *
 * @module tests/unit/whatsapp-system.test.js
 */

'use strict';

const express = require('express');
const request = require('supertest');

// ─── Mock WhatsApp services ──────────────────────────────────────────────────
const mockVerifyWebhook = jest.fn();
const mockSendText = jest.fn();
const mockGetTemplates = jest.fn().mockResolvedValue([]);
const mockGetPhoneInfo = jest
  .fn()
  .mockResolvedValue({ id: '123', displayPhoneNumber: '+966501234567' });
const mockIsEnabled = jest.fn().mockReturnValue(true);

jest.mock('../../services/whatsapp/whatsappService', () => ({
  verifyWebhook: (...args) => mockVerifyWebhook(...args),
  sendText: (...args) => mockSendText(...args),
  getTemplates: (...args) => mockGetTemplates(...args),
  getPhoneInfo: (...args) => mockGetPhoneInfo(...args),
  isEnabled: (...args) => mockIsEnabled(...args),
  normalizePhone: jest.fn(phone => phone),
}));

const mockClassifyIntent = jest.fn();
const mockSuggestReplies = jest.fn();
const mockSummarize = jest.fn();
const mockAnalyzePatterns = jest.fn();
const mockIsAIEnabled = jest.fn().mockReturnValue(true);

jest.mock('../../services/whatsapp/whatsappAI.service', () => ({
  classifyIntent: (...args) => mockClassifyIntent(...args),
  suggestReplies: (...args) => mockSuggestReplies(...args),
  summarizeConversation: (...args) => mockSummarize(...args),
  analyzeEngagementPatterns: (...args) => mockAnalyzePatterns(...args),
  isAIEnabled: (...args) => mockIsAIEnabled(...args),
}));

const mockProcessWebhook = jest.fn().mockResolvedValue({ processed: true });

jest.mock('../../services/whatsapp/whatsappWebhook.service', () => ({
  processWebhook: (...args) => mockProcessWebhook(...args),
}));

const TEMPLATE_LIST = [
  { key: 'session_reminder', name: 'Session Reminder' },
  { key: 'progress_report', name: 'Progress Report' },
  { key: 'welcome_new', name: 'Welcome New' },
];
const mockListTemplates = jest.fn().mockReturnValue(TEMPLATE_LIST);
const mockSendSessionReminder = jest.fn();
const mockSendProgressReport = jest.fn();

jest.mock('../../services/whatsapp/whatsappTemplates.service', () => ({
  listTemplates: (...args) => mockListTemplates(...args),
  sendSessionReminder: (...args) => mockSendSessionReminder(...args),
  sendProgressReport: (...args) => mockSendProgressReport(...args),
  sendHomeworkAssignment: jest.fn(),
  sendAppointmentConfirmation: jest.fn(),
  sendWelcomeMessage: jest.fn(),
}));

// ─── Mock logger to suppress output during tests ─────────────────────────────
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// ─── Mock WhatsAppConversation model ─────────────────────────────────────────
const mockFindReturn = {
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
};
const mockConversationFind = jest.fn().mockReturnValue(mockFindReturn);
const mockConversationCountDocuments = jest.fn().mockResolvedValue(0);
const mockConversationFindById = jest.fn();
const mockConversationFindPendingReview = jest.fn().mockResolvedValue([]);
const mockConversationGetAnalytics = jest.fn().mockResolvedValue({
  totalConversations: 0,
  byStatus: [],
  byUrgency: [],
  avgResponseTime: 0,
});

const MockConversationModel = {
  find: mockConversationFind,
  findById: mockConversationFindById,
  countDocuments: mockConversationCountDocuments,
  findPendingReview: mockConversationFindPendingReview,
  getAnalytics: mockConversationGetAnalytics,
  findByIdAndUpdate: jest.fn().mockResolvedValue(null),
  findOneAndUpdate: jest.fn().mockResolvedValue(null),
};

// Prevent mongoose.model() lookup from throwing — inject our mock
const mongoose = require('mongoose');
jest.spyOn(mongoose, 'model').mockImplementation(name => {
  if (name === 'WhatsAppConversation') return MockConversationModel;
  throw new Error(`Model ${name} not registered`);
});

// ─── App factory ─────────────────────────────────────────────────────────────
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/whatsapp', require('../../routes/whatsapp.routes'));
  return app;
}

// ─── Reset mocks between tests ────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockIsEnabled.mockReturnValue(true);
  mockIsAIEnabled.mockReturnValue(true);
  mockListTemplates.mockReturnValue(TEMPLATE_LIST);
  mockConversationFind.mockReturnValue(mockFindReturn);
  mockConversationCountDocuments.mockResolvedValue(0);
  mockFindReturn.lean.mockResolvedValue([]);
  mockConversationFindPendingReview.mockResolvedValue([]);
  mockConversationGetAnalytics.mockResolvedValue({
    totalConversations: 0,
    byStatus: [],
    byUrgency: [],
    avgResponseTime: 0,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════

describe('WhatsApp Webhook', () => {
  test('GET /webhook — calls verifyWebhook service', async () => {
    mockVerifyWebhook.mockImplementation((_req, res) => res.status(200).send('VERIFIED'));
    const app = makeApp();
    const res = await request(app).get(
      '/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.challenge=xyz&hub.verify_token=token'
    );
    expect(res.status).toBe(200);
    expect(mockVerifyWebhook).toHaveBeenCalledTimes(1);
  });

  test('POST /webhook — acknowledges with 200 immediately', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/v1/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .send({ object: 'whatsapp_business_account', entry: [] });
    expect(res.status).toBe(200);
  });

  test('POST /webhook — calls processWebhook service', async () => {
    const app = makeApp();
    await request(app)
      .post('/api/v1/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .send({ object: 'whatsapp_business_account', entry: [] });
    // processWebhook is called asynchronously after 200 is sent
    await new Promise(r => setImmediate(r));
    expect(mockProcessWebhook).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /conversations', () => {
  test('returns success:true with empty list', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/conversations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBe(0);
  });

  test('includes page and limit in response', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/conversations?page=2&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(10);
  });

  test('applies status filter to query', async () => {
    const app = makeApp();
    await request(app).get('/api/v1/whatsapp/conversations?status=open');
    expect(mockConversationFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'open' }));
  });

  test('applies requiresReview filter when true', async () => {
    const app = makeApp();
    await request(app).get('/api/v1/whatsapp/conversations?requiresReview=true');
    expect(mockConversationFind).toHaveBeenCalledWith(
      expect.objectContaining({ requiresHumanReview: true })
    );
  });
});

describe('GET /conversations/pending-review', () => {
  test('returns pending conversations list', async () => {
    mockConversationFindPendingReview.mockResolvedValue([{ _id: 'c1', phone: '+966501234567' }]);
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/conversations/pending-review');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});

describe('GET /conversations/:id', () => {
  test('returns 404 when conversation not found', async () => {
    mockConversationFindById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/conversations/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('returns conversation when found', async () => {
    const conv = { _id: '507f1f77bcf86cd799439011', phone: '+966501234567', messages: [] };
    mockConversationFindById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(conv),
    });
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/conversations/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe('+966501234567');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGING
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /send/text', () => {
  test('returns 400 when to is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/v1/whatsapp/send/text').send({ text: 'Hello' }); // missing to
    expect(res.status).toBe(400);
  });

  test('returns 400 when text is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/v1/whatsapp/send/text').send({ to: '+966501234567' }); // missing text
    expect(res.status).toBe(400);
  });

  test('calls sendText service on valid payload', async () => {
    mockSendText.mockResolvedValue({ success: true, messageId: 'mid_123' });
    const app = makeApp();
    const res = await request(app)
      .post('/api/v1/whatsapp/send/text')
      .send({ to: '+966501234567', text: 'مرحباً' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSendText).toHaveBeenCalledWith('+966501234567', 'مرحباً');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AI ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /ai/classify', () => {
  test('returns 400 when text is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/v1/whatsapp/ai/classify').send({});
    expect(res.status).toBe(400);
  });

  test('returns classification result on valid text', async () => {
    mockClassifyIntent.mockResolvedValue({ intent: 'appointment_query', confidence: 0.95 });
    const app = makeApp();
    const res = await request(app)
      .post('/api/v1/whatsapp/ai/classify')
      .send({ text: 'متى موعد الجلسة القادمة؟' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.intent).toBe('appointment_query');
    expect(mockClassifyIntent).toHaveBeenCalledWith('متى موعد الجلسة القادمة؟', {});
  });

  test('passes context when provided', async () => {
    mockClassifyIntent.mockResolvedValue({ intent: 'progress_inquiry', confidence: 0.88 });
    const app = makeApp();
    const ctx = { beneficiaryName: 'Ahmed' };
    await request(app)
      .post('/api/v1/whatsapp/ai/classify')
      .send({ text: 'كيف التقدم؟', context: ctx });
    expect(mockClassifyIntent).toHaveBeenCalledWith('كيف التقدم؟', ctx);
  });
});

describe('POST /ai/suggest-replies', () => {
  test('returns 400 when intent is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/v1/whatsapp/ai/suggest-replies').send({});
    expect(res.status).toBe(400);
  });

  test('returns suggestions array on valid intent', async () => {
    const suggestions = ['سنتواصل معك قريباً', 'الموعد القادم يوم الثلاثاء'];
    mockSuggestReplies.mockResolvedValue(suggestions);
    const app = makeApp();
    const res = await request(app)
      .post('/api/v1/whatsapp/ai/suggest-replies')
      .send({ intent: 'appointment_query' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('POST /ai/summarize', () => {
  test('returns 400 when messages is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/v1/whatsapp/ai/summarize').send({});
    expect(res.status).toBe(400);
  });

  test('returns summary on valid messages', async () => {
    const summary = { summary: 'Family asked about schedule', urgency: 'low' };
    mockSummarize.mockResolvedValue(summary);
    const app = makeApp();
    const res = await request(app)
      .post('/api/v1/whatsapp/ai/summarize')
      .send({ messages: [{ text: 'Hello', direction: 'incoming' }] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBe('Family asked about schedule');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /templates', () => {
  test('returns template catalog array', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/templates');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(TEMPLATE_LIST.length);
    const keys = res.body.data.map(t => t.key);
    expect(keys).toContain('session_reminder');
    expect(keys).toContain('progress_report');
  });
});

describe('POST /templates/session-reminder', () => {
  const validPayload = {
    phone: '+966501234567',
    guardianName: 'أحمد',
    beneficiaryName: 'سارة',
    sessionDate: '2025-12-01',
    sessionTime: '10:00',
    therapistName: 'د. محمد',
  };

  test('returns 400 when required fields missing', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/v1/whatsapp/templates/session-reminder')
      .send({ phone: '+966501234567' }); // missing other fields
    expect(res.status).toBe(400);
  });

  test('calls sendSessionReminder on valid payload', async () => {
    mockSendSessionReminder.mockResolvedValue({ success: true, messageId: 'tmpl_001' });
    const app = makeApp();
    const res = await request(app)
      .post('/api/v1/whatsapp/templates/session-reminder')
      .send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSendSessionReminder).toHaveBeenCalledWith(validPayload.phone, validPayload);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STATUS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /status', () => {
  test('returns enabled:true when service is active', async () => {
    mockIsEnabled.mockReturnValue(true);
    mockIsAIEnabled.mockReturnValue(true);
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enabled).toBe(true);
    expect(res.body.data.aiEnabled).toBe(true);
  });

  test('returns enabled:false when service is disabled', async () => {
    mockIsEnabled.mockReturnValue(false);
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/status');
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
    // phoneInfo should not be fetched when disabled
    expect(mockGetPhoneInfo).not.toHaveBeenCalled();
  });

  test('includes phoneInfo when enabled', async () => {
    mockIsEnabled.mockReturnValue(true);
    mockGetPhoneInfo.mockResolvedValue({ id: 'p1', displayPhoneNumber: '+966501234567' });
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/status');
    expect(res.body.data.phoneInfo).not.toBeNull();
    expect(res.body.data.phoneInfo.displayPhoneNumber).toBe('+966501234567');
  });
});

describe('GET /analytics', () => {
  test('returns analytics shape with success:true', async () => {
    // Route does: ...(analytics[0] || {}) so getAnalytics must return an array
    mockConversationGetAnalytics.mockResolvedValue([
      { totalConversations: 42, avgResponseTime: 5.2 },
    ]);
    mockConversationCountDocuments.mockResolvedValue(0);
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/analytics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalConversations).toBe(42);
  });

  test('returns pendingReview and critical counts', async () => {
    mockConversationGetAnalytics.mockResolvedValue([{ totalConversations: 5 }]);
    mockConversationCountDocuments
      .mockResolvedValueOnce(3) // pendingReview
      .mockResolvedValueOnce(1); // critical
    const app = makeApp();
    const res = await request(app).get('/api/v1/whatsapp/analytics');
    expect(res.body.data.pendingReview).toBe(3);
    expect(res.body.data.critical).toBe(1);
  });
});

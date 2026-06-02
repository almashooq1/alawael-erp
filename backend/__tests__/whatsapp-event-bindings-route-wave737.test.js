'use strict';

/**
 * W737 — HTTP contract test for GET /event-bindings.
 *
 * W727b exposed the route; W732 made it `async` so it returns each binding
 * augmented with `templateStatus` + `deliverable` (computed by
 * listBindingsWithStatus). The existing wave727 suite covers the service in
 * isolation; this suite locks the *HTTP envelope* over supertest so a future
 * refactor can't silently drop the augmented fields or the {success,data}
 * wrapper.
 *
 * Boots only the WhatsApp router (stub mode). `authenticate` is mocked to a
 * pass-through (the route is auth-gated; we exercise the handler contract, not
 * the auth boundary — that lives in whatsapp-activation-phase-a.test.js). The
 * bindings service is mocked so the test needs no Mongo.
 */

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth');
  const passThrough = (req, _res, next) => {
    req.user = { id: 'u-test', role: 'admin' };
    next();
  };
  return { ...actual, authenticate: passThrough, authenticateToken: passThrough };
});

const FAKE_BINDINGS = [
  {
    eventType: 'session.reminder',
    templateKey: 'session_reminder',
    templateName: 'session_reminder_ar',
    consentRequired: true,
    templateStatus: 'APPROVED',
    deliverable: true,
  },
  {
    eventType: 'survey.requested',
    templateKey: 'survey_request',
    templateName: 'survey_request_ar',
    consentRequired: false,
    templateStatus: 'REJECTED',
    deliverable: false,
  },
];

jest.mock('../services/whatsapp/whatsappEventBindings.service', () => ({
  listBindingsWithStatus: jest.fn(),
  listBindings: jest.fn(() => []),
}));

const bindingsService = require('../services/whatsapp/whatsappEventBindings.service');

describe('W737 — GET /event-bindings HTTP contract', () => {
  let app;

  beforeAll(() => {
    delete process.env.WHATSAPP_API_TOKEN;
    delete process.env.WHATSAPP_ENABLED;
    app = express();
    app.use(express.json());
    const whatsappRoutes = require('../routes/whatsapp.routes');
    app.use('/api/whatsapp', whatsappRoutes);
    // Minimal error handler so asyncHandler-forwarded errors surface as 500.

    app.use((err, _req, res, _next) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  beforeEach(() => {
    bindingsService.listBindingsWithStatus.mockReset();
  });

  test('returns 200 with the {success, data} envelope', async () => {
    bindingsService.listBindingsWithStatus.mockResolvedValue(FAKE_BINDINGS);
    const res = await request(app).get('/api/whatsapp/event-bindings');
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  test('each row carries the W732 augmented templateStatus + deliverable fields', async () => {
    bindingsService.listBindingsWithStatus.mockResolvedValue(FAKE_BINDINGS);
    const res = await request(app).get('/api/whatsapp/event-bindings');
    for (const row of res.body.data) {
      expect(row).toHaveProperty('eventType');
      expect(row).toHaveProperty('templateStatus');
      expect(row).toHaveProperty('deliverable');
      expect(typeof row.deliverable).toBe('boolean');
    }
    const reminder = res.body.data.find(r => r.eventType === 'session.reminder');
    expect(reminder.deliverable).toBe(true);
    const survey = res.body.data.find(r => r.eventType === 'survey.requested');
    expect(survey.deliverable).toBe(false);
    expect(survey.templateStatus).toBe('REJECTED');
  });

  test('invokes the async listBindingsWithStatus accessor (not the sync one)', async () => {
    bindingsService.listBindingsWithStatus.mockResolvedValue([]);
    await request(app).get('/api/whatsapp/event-bindings');
    expect(bindingsService.listBindingsWithStatus).toHaveBeenCalledTimes(1);
  });

  test('forwards service errors to the error handler as 500', async () => {
    bindingsService.listBindingsWithStatus.mockRejectedValue(new Error('boom'));
    const res = await request(app).get('/api/whatsapp/event-bindings');
    expect(res.status).toBe(500);
    expect(res.body?.success).toBe(false);
  });
});

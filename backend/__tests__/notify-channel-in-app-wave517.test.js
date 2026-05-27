'use strict';

/**
 * notify-channel-in-app-wave517.test.js — Wave 517.
 *
 * Drift guard for services/notify-channel-in-app.service.js. Real Mongoose
 * via MongoMemoryServer because dedupe relies on the schema's
 * notificationId unique-sparse index — only real Mongoose enforces it.
 *
 * Covers:
 *   - Subscribes to notification.measure_alert.reassigned.alert
 *   - Creates one Notification doc per recipient with the expected shape
 *   - notificationId dedupe: re-firing the same alert/recipient is a no-op
 *     (E11000 swallowed silently — stats.skipped++)
 *   - Per-recipient title/message differ for FROM vs TO recipients
 *   - Bell-counter index field (read=false default) is set so the recipient
 *     sees the new notification highlighted
 *   - Channel='in-app' + category='caseload_reassignment' set per design
 *   - Skips malformed events (no alertId / no recipients array)
 *   - Throws on missing integrationBus
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Notification;
let service;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w517-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Notification = require('../models/Notification');
  await Notification.init();
  service = require('../services/notify-channel-in-app.service');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Notification.deleteMany({});
});

function makeBusStub() {
  const handlers = new Map();
  return {
    subscribe(pattern, handler) {
      handlers.set(pattern, handler);
      return () => handlers.delete(pattern);
    },
    async fire(pattern, payload) {
      const h = handlers.get(pattern);
      if (h) await h({ payload });
    },
    handlers,
  };
}

function makeLoggerStub() {
  return {
    infos: [],
    warns: [],
    errors: [],
    info(...args) {
      this.infos.push(args.join(' '));
    },
    warn(...args) {
      this.warns.push(args.join(' '));
    },
    error(...args) {
      this.errors.push(args.join(' '));
    },
  };
}

function makePayload(overrides = {}) {
  const tFrom = new mongoose.Types.ObjectId();
  const tTo = new mongoose.Types.ObjectId();
  return {
    source: 'medical.measure_alert.reassigned',
    alertId: String(new mongoose.Types.ObjectId()),
    beneficiaryId: String(new mongoose.Types.ObjectId()),
    branchId: String(new mongoose.Types.ObjectId()),
    fromTherapistId: String(tFrom),
    toTherapistId: String(tTo),
    actorId: String(new mongoose.Types.ObjectId()),
    alertType: 'FORECAST_OFF_TRACK',
    severity: 'high',
    reason: 'rebalancing load',
    notifiedAt: new Date().toISOString(),
    recipients: [String(tFrom), String(tTo)],
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════
// _renderForRecipient + _buildNotificationDoc pure helpers
// ════════════════════════════════════════════════════════════════════

describe('W517 — render per recipient', () => {
  test('FROM recipient sees "تم نقل حالة من قائمتك"', () => {
    const payload = makePayload();
    const rendered = service._renderForRecipient({
      payload,
      recipientId: payload.fromTherapistId,
      isFrom: true,
      isTo: false,
    });
    expect(rendered.title).toMatch(/من قائمتك/);
    expect(rendered.message).toContain(payload.toTherapistId.slice(-8));
    expect(rendered.link).toBe('/smart-inbox');
  });

  test('TO recipient sees "استلمت حالة جديدة"', () => {
    const payload = makePayload();
    const rendered = service._renderForRecipient({
      payload,
      recipientId: payload.toTherapistId,
      isFrom: false,
      isTo: true,
    });
    expect(rendered.title).toMatch(/استلمت/);
    expect(rendered.message).toContain(payload.fromTherapistId.slice(-8));
  });

  test('_buildNotificationDoc carries the dedupe key + canonical fields', () => {
    const payload = makePayload();
    const doc = service._buildNotificationDoc({
      payload,
      recipientId: payload.toTherapistId,
      isFrom: false,
      isTo: true,
    });
    expect(doc.notificationId).toBe(`reassign:${payload.alertId}:${payload.toTherapistId}`);
    expect(doc.channel).toBe('in-app');
    expect(doc.category).toBe('caseload_reassignment');
    expect(doc.type).toBe('alert');
    expect(doc.metadata.source).toBe('medical.measure_alert.reassigned');
    expect(doc.metadata.role).toBe('to');
  });

  test('critical severity bumps priority to "critical"', () => {
    const payload = makePayload({ severity: 'critical' });
    const doc = service._buildNotificationDoc({
      payload,
      recipientId: payload.toTherapistId,
      isFrom: false,
      isTo: true,
    });
    expect(doc.priority).toBe('critical');
  });
});

// ════════════════════════════════════════════════════════════════════
// _writeNotifications — real Mongoose round-trip
// ════════════════════════════════════════════════════════════════════

describe('W517 — _writeNotifications round-trip', () => {
  test('creates one Notification doc per recipient', async () => {
    const payload = makePayload();
    const r = await service._writeNotifications({
      Notification,
      payload,
      logger: makeLoggerStub(),
    });
    expect(r.created).toBe(2);
    expect(r.skipped).toBe(0);

    const docs = await Notification.find({}).lean();
    expect(docs).toHaveLength(2);
    const ids = docs.map(d => String(d.recipientId)).sort();
    expect(ids).toEqual([String(payload.fromTherapistId), String(payload.toTherapistId)].sort());
  });

  test('idempotent on re-fire — duplicate notificationId silently skipped', async () => {
    const payload = makePayload();
    await service._writeNotifications({
      Notification,
      payload,
      logger: makeLoggerStub(),
    });
    const r2 = await service._writeNotifications({
      Notification,
      payload,
      logger: makeLoggerStub(),
    });
    expect(r2.created).toBe(0);
    expect(r2.skipped).toBe(2);
    const docs = await Notification.find({}).lean();
    expect(docs).toHaveLength(2); // still just 2 — no duplicates
  });

  test('notificationId encodes (alertId, recipientId) so different alerts coexist for same recipient', async () => {
    const payload1 = makePayload();
    const payload2 = makePayload({ recipients: payload1.recipients });
    payload2.alertId = String(new mongoose.Types.ObjectId());
    await service._writeNotifications({
      Notification,
      payload: payload1,
      logger: makeLoggerStub(),
    });
    await service._writeNotifications({
      Notification,
      payload: payload2,
      logger: makeLoggerStub(),
    });
    const docs = await Notification.find({}).lean();
    expect(docs).toHaveLength(4); // 2 recipients × 2 alerts
  });

  test('read=false default (bell counter increments)', async () => {
    const payload = makePayload();
    await service._writeNotifications({
      Notification,
      payload,
      logger: makeLoggerStub(),
    });
    const docs = await Notification.find({}).lean();
    for (const d of docs) {
      expect(d.read).toBe(false);
      expect(d.isRead).toBe(false);
    }
  });

  test('FROM and TO recipients get role-specific copy in metadata', async () => {
    const payload = makePayload();
    await service._writeNotifications({
      Notification,
      payload,
      logger: makeLoggerStub(),
    });
    const docs = await Notification.find({}).lean();
    const fromDoc = docs.find(d => String(d.recipientId) === String(payload.fromTherapistId));
    const toDoc = docs.find(d => String(d.recipientId) === String(payload.toTherapistId));
    expect(fromDoc.metadata.role).toBe('from');
    expect(toDoc.metadata.role).toBe('to');
    expect(fromDoc.title).toMatch(/من قائمتك/);
    expect(toDoc.title).toMatch(/استلمت/);
  });
});

// ════════════════════════════════════════════════════════════════════
// wireInAppNotificationChannel
// ════════════════════════════════════════════════════════════════════

describe('W517 — wireInAppNotificationChannel', () => {
  test('throws when bus lacks .subscribe', () => {
    expect(() => service.wireInAppNotificationChannel({ integrationBus: {} })).toThrow(/subscribe/);
  });

  test('subscribes to notification.measure_alert.reassigned.alert', () => {
    const bus = makeBusStub();
    service.wireInAppNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
    });
    expect(bus.handlers.has(service.EVENT_PATTERN)).toBe(true);
  });

  test('handler creates Notification docs end-to-end via the bus', async () => {
    const bus = makeBusStub();
    const wired = service.wireInAppNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
    });
    const payload = makePayload();
    await bus.fire(service.EVENT_PATTERN, payload);
    const stats = wired.ranSinceBoot();
    expect(stats.received).toBe(1);
    expect(stats.created).toBe(2);
    const docs = await Notification.find({}).lean();
    expect(docs).toHaveLength(2);
  });

  test('skips malformed events (missing recipients array)', async () => {
    const bus = makeBusStub();
    const wired = service.wireInAppNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
    });
    await bus.fire(service.EVENT_PATTERN, {
      alertId: 'a1',
      // no recipients
    });
    const stats = wired.ranSinceBoot();
    expect(stats.received).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.created).toBe(0);
    const docs = await Notification.find({}).lean();
    expect(docs).toHaveLength(0);
  });

  test('skips malformed events (missing alertId)', async () => {
    const bus = makeBusStub();
    const wired = service.wireInAppNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
    });
    await bus.fire(service.EVENT_PATTERN, {
      recipients: ['t1', 't2'],
    });
    expect(wired.ranSinceBoot().skipped).toBe(1);
    expect(wired.ranSinceBoot().created).toBe(0);
  });
});

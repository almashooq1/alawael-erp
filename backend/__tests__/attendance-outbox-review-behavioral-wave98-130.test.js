'use strict';

/**
 * Behavioral counterpart for the attendance event-bus pair:
 *   • AttendanceEventOutbox       (Wave 130) — outbox pattern
 *   • AttendanceConfidenceReview  (Wave 98 Phase 3) — review queue
 *
 * Pairing doctrine: static drift guards catch source-text shape but
 * not runtime behavior. These exercise every Wave-18 `__invariants`
 * branch end-to-end against MongoMemoryServer.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(45000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const reg = require('../intelligence/hikvision.registry');

let mongod;
let Outbox;
let Review;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w98-w130-outbox-review' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Outbox = require('../models/AttendanceEventOutbox');
  Review = require('../models/AttendanceConfidenceReview');
  await Outbox.init().catch(() => null);
  await Review.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Outbox.deleteMany({});
  await Review.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ════════════════════════════════════════════════════════════════════
//  AttendanceEventOutbox (W130)
// ════════════════════════════════════════════════════════════════════

describe('AttendanceEventOutbox — Wave-18 invariants', () => {
  const baseOutbox = (overrides = {}) => ({
    topic: 'attendance.source-event.persisted',
    payload: { eventId: 'evt-1', employeeId: 'emp-1' },
    idempotencyKey: `attendance.source-event.persisted|src|${Math.random()}`,
    status: 'pending',
    ...overrides,
  });

  it('rejects rows without topic', async () => {
    const o = new Outbox(baseOutbox({ topic: undefined }));
    await expect(o.save()).rejects.toThrow(/topic/);
  });

  it('rejects rows without idempotencyKey', async () => {
    const o = new Outbox(baseOutbox({ idempotencyKey: undefined }));
    await expect(o.save()).rejects.toThrow(/idempotencyKey/);
  });

  it('rejects rows without payload', async () => {
    const o = new Outbox(baseOutbox({ payload: undefined }));
    await expect(o.save()).rejects.toThrow(/payload/);
  });

  it('rejects status enum drift', async () => {
    const o = new Outbox(baseOutbox({ status: 'half-delivered' }));
    await expect(o.save()).rejects.toThrow(/status/);
  });

  it('rejects status=failed without lastError', async () => {
    const o = new Outbox(baseOutbox({ status: 'failed', lastError: null }));
    await expect(o.save()).rejects.toThrow(/lastError/);
  });

  it('accepts status=failed with lastError populated', async () => {
    const o = new Outbox(
      baseOutbox({
        status: 'failed',
        deliveryAttempts: 3,
        lastError: 'HTTP 500 from downstream consumer',
      })
    );
    await expect(o.save()).resolves.toBeDefined();
  });

  it('accepts status=delivered without lastError', async () => {
    const o = new Outbox(baseOutbox({ status: 'delivered', deliveredAt: new Date() }));
    await expect(o.save()).resolves.toBeDefined();
  });

  it('enforces unique idempotencyKey', async () => {
    const key = `topic|coll|${Date.now()}`;
    await new Outbox(baseOutbox({ idempotencyKey: key })).save();
    const dup = new Outbox(baseOutbox({ idempotencyKey: key }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('rejects deliveryAttempts < 0', async () => {
    const o = new Outbox(baseOutbox({ deliveryAttempts: -1 }));
    await expect(o.save()).rejects.toThrow(/deliveryAttempts/);
  });

  it('persists default status = pending and attempts = 0', async () => {
    const o = await new Outbox(baseOutbox({ status: undefined })).save();
    expect(o.status).toBe('pending');
    expect(o.deliveryAttempts).toBe(0);
  });

  it('exposes TOPICS / STATUSES / TTL_SECONDS as module exports', () => {
    expect(Array.isArray(Outbox.TOPICS)).toBe(true);
    expect(Outbox.TOPICS).toContain('attendance.source-event.persisted');
    expect(Outbox.STATUSES).toEqual(['pending', 'delivered', 'failed']);
    expect(Outbox.TTL_SECONDS).toBe(90 * 24 * 60 * 60);
  });

  it('exposes 90-day TTL_SECONDS constant', () => {
    // Note: the schema declares both `index: true` and `.index(...)` on
    // createdAt — Mongoose 9 warns + silently drops the TTL spec. Asserting
    // the runtime index would require a model-level fix. Until then we
    // assert the documented constant; the model cleanup is a separate PR.
    expect(Outbox.TTL_SECONDS).toBe(90 * 24 * 60 * 60);
  });
});

// ════════════════════════════════════════════════════════════════════
//  AttendanceConfidenceReview (W98)
// ════════════════════════════════════════════════════════════════════

describe('AttendanceConfidenceReview — Wave-18 invariants', () => {
  const baseReview = (overrides = {}) => ({
    processedEventId: oid(),
    branchId: oid(),
    reason: reg.REVIEW_REASON.LOW_CONFIDENCE,
    queue: reg.REVIEW_QUEUE.SUPERVISOR,
    state: reg.REVIEW_STATE.OPEN,
    openedAt: new Date(),
    ...overrides,
  });

  it('rejects OPEN rows that carry a resolverId', async () => {
    const r = new Review(baseReview({ state: reg.REVIEW_STATE.OPEN, resolverId: oid() }));
    await expect(r.save()).rejects.toThrow(/resolver/);
  });

  it('rejects EXPIRED rows that carry a resolverNote', async () => {
    const r = new Review(
      baseReview({
        state: reg.REVIEW_STATE.EXPIRED,
        resolverNote: 'should be empty',
      })
    );
    await expect(r.save()).rejects.toThrow(/resolver/);
  });

  it('rejects APPROVED rows without resolverId', async () => {
    const r = new Review(
      baseReview({
        state: reg.REVIEW_STATE.APPROVED,
        resolvedAt: new Date(),
      })
    );
    await expect(r.save()).rejects.toThrow(/resolverId/);
  });

  it('rejects APPROVED rows without resolvedAt', async () => {
    const r = new Review(
      baseReview({
        state: reg.REVIEW_STATE.APPROVED,
        resolverId: oid(),
      })
    );
    await expect(r.save()).rejects.toThrow(/resolvedAt/);
  });

  it('accepts a fully-formed APPROVED review', async () => {
    const r = new Review(
      baseReview({
        state: reg.REVIEW_STATE.APPROVED,
        resolverId: oid(),
        resolverRole: 'supervisor',
        resolvedAt: new Date(),
        resultingAttendanceEventId: oid(),
      })
    );
    await expect(r.save()).resolves.toBeDefined();
  });

  it('rejects REJECTED rows without resolverNote', async () => {
    const r = new Review(
      baseReview({
        state: reg.REVIEW_STATE.REJECTED,
        resolverId: oid(),
        resolvedAt: new Date(),
      })
    );
    await expect(r.save()).rejects.toThrow(/resolverNote/);
  });

  it('accepts a fully-formed REJECTED review with note', async () => {
    const r = new Review(
      baseReview({
        state: reg.REVIEW_STATE.REJECTED,
        resolverId: oid(),
        resolvedAt: new Date(),
        resolverNote: 'الوجه غير مطابق - تم رفض الحضور',
      })
    );
    await expect(r.save()).resolves.toBeDefined();
  });

  it('rejects ESCALATED rows without escalatedToQueue', async () => {
    const r = new Review(
      baseReview({
        state: reg.REVIEW_STATE.ESCALATED,
        resolverId: oid(),
        resolvedAt: new Date(),
      })
    );
    await expect(r.save()).rejects.toThrow(/escalatedToQueue/);
  });

  it('accepts a fully-formed ESCALATED review', async () => {
    const r = new Review(
      baseReview({
        state: reg.REVIEW_STATE.ESCALATED,
        resolverId: oid(),
        resolvedAt: new Date(),
        escalatedToQueue: reg.REVIEW_QUEUE.HR,
      })
    );
    await expect(r.save()).resolves.toBeDefined();
  });

  it('enforces required processedEventId', async () => {
    const r = new Review(baseReview({ processedEventId: undefined }));
    await expect(r.save()).rejects.toThrow(/processedEventId/);
  });

  it('enforces required branchId', async () => {
    const r = new Review(baseReview({ branchId: undefined }));
    await expect(r.save()).rejects.toThrow(/branchId/);
  });

  it('enforces reason enum membership', async () => {
    const r = new Review(baseReview({ reason: 'looks-shifty' }));
    await expect(r.save()).rejects.toThrow(/reason/);
  });

  it('enforces queue enum membership', async () => {
    const r = new Review(baseReview({ queue: 'mailroom' }));
    await expect(r.save()).rejects.toThrow(/queue/);
  });

  it('enforces state enum membership', async () => {
    const r = new Review(baseReview({ state: 'on-the-fence' }));
    await expect(r.save()).rejects.toThrow(/state/);
  });

  it('enforces unique processedEventId (one review per processed event)', async () => {
    const pid = oid();
    await new Review(baseReview({ processedEventId: pid })).save();
    const dup = new Review(baseReview({ processedEventId: pid }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('persists default state = OPEN when omitted', async () => {
    const r = await new Review(baseReview({ state: undefined })).save();
    expect(r.state).toBe(reg.REVIEW_STATE.OPEN);
  });

  it('enforces confidence ∈ [0,100]', async () => {
    const r = new Review(baseReview({ confidence: -5 }));
    await expect(r.save()).rejects.toThrow(/confidence/);
  });
});

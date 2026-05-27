'use strict';

/**
 * hikvision-job-and-event-behavioral-wave108-109.test.js — behavioral
 * coverage for the final 2 Hikvision suite models, closing 10/10:
 *   • HikvisionJobRun       (W108) — scheduler run history
 *   • HikvisionProcessedEvent (W109) — gate decision per processed raw event
 *
 * Closes the BEHAVIORAL_TEST_COVERAGE_BACKLOG.md Hikvision suite (10 models).
 *
 * Per CLAUDE.md doctrine — 38× application (9th + 10th Hikvision entries).
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let JobRun;
let Event;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w108-109-job-event-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  JobRun = require('../models/HikvisionJobRun');
  Event = require('../models/HikvisionProcessedEvent');
  await JobRun.init().catch(() => null);
  await Event.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await JobRun.deleteMany({});
  await Event.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ═════════════════════════════════════════════════════════════════════
// PART 1 — HikvisionJobRun
// ═════════════════════════════════════════════════════════════════════

function baseJob(overrides = {}) {
  return {
    jobId: 'hikvision.sync-all',
    status: 'running',
    ...overrides,
  };
}

describe('W108 behavioral — JobRun required + enums', () => {
  it('REJECTS without jobId', async () => {
    const p = new JobRun({ status: 'running' });
    await expect(p.save()).rejects.toThrow(/jobId/);
  });

  it('REJECTS invalid jobId enum', async () => {
    const p = new JobRun(baseJob({ jobId: 'hikvision.unknown-job' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES baseline running run + defaults populate', async () => {
    const doc = await JobRun.create(baseJob());
    expect(doc.trigger).toBe('cron');
    expect(doc.initiator).toBe('scheduler');
    expect(doc.startedAt).toBeInstanceOf(Date);
    expect(doc.finishedAt).toBeNull();
  });

  for (const valid of ['cron', 'manual', 'startup']) {
    it(`SAVES trigger='${valid}'`, async () => {
      const doc = await JobRun.create(baseJob({ trigger: valid }));
      expect(doc.trigger).toBe(valid);
    });
  }

  it('REJECTS invalid trigger', async () => {
    const p = new JobRun(baseJob({ trigger: 'webhook' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W108 behavioral — succeeded status invariants', () => {
  it('REJECTS succeeded without finishedAt', async () => {
    const p = new JobRun(baseJob({ status: 'succeeded', result: { count: 12 } }));
    await expect(p.save()).rejects.toThrow(/succeeded runs require finishedAt/);
  });

  it('REJECTS succeeded with null result', async () => {
    const p = new JobRun(baseJob({ status: 'succeeded', finishedAt: new Date(), result: null }));
    await expect(p.save()).rejects.toThrow(/succeeded runs require result payload/);
  });

  it('SAVES succeeded with finishedAt + result', async () => {
    const doc = await JobRun.create(
      baseJob({
        status: 'succeeded',
        finishedAt: new Date(),
        durationMs: 287,
        result: { templates: 142, devicesPushed: 8 },
      })
    );
    expect(doc.status).toBe('succeeded');
  });
});

describe('W108 behavioral — failed status invariants', () => {
  it('REJECTS failed without finishedAt', async () => {
    const p = new JobRun(baseJob({ status: 'failed', error: { message: 'sync timeout' } }));
    await expect(p.save()).rejects.toThrow(/failed runs require finishedAt/);
  });

  it('REJECTS failed without error.message', async () => {
    const p = new JobRun(baseJob({ status: 'failed', finishedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/failed runs require error.message/);
  });

  it('SAVES failed with finishedAt + error.message', async () => {
    const doc = await JobRun.create(
      baseJob({
        status: 'failed',
        finishedAt: new Date(),
        error: {
          message: 'ISAPI authentication failed (HTTP 401)',
          code: 'AUTH_FAIL',
          stack: 'at Adapter.callISAPI...',
        },
      })
    );
    expect(doc.error.message).toMatch(/authentication failed/);
  });
});

describe('W108 behavioral — skipped + running invariants', () => {
  it('REJECTS skipped without reason', async () => {
    const p = new JobRun(baseJob({ status: 'skipped' }));
    await expect(p.save()).rejects.toThrow(/skipped runs require reason/);
  });

  it('SAVES skipped with reason', async () => {
    const doc = await JobRun.create(
      baseJob({ status: 'skipped', reason: 'previous run still active (lock held)' })
    );
    expect(doc.status).toBe('skipped');
  });

  it('REJECTS running with finishedAt set', async () => {
    const p = new JobRun(baseJob({ status: 'running', finishedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/running runs must have finishedAt = null/);
  });
});

describe('W108 behavioral — JobRun collection name', () => {
  it('uses canonical collection name hikvision_job_runs', () => {
    expect(JobRun.collection.collectionName).toBe('hikvision_job_runs');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 2 — HikvisionProcessedEvent
// ═════════════════════════════════════════════════════════════════════

function baseEvent(overrides = {}) {
  return {
    rawEventId: oid(),
    deviceId: oid(),
    branchId: oid(),
    eventKind: 'face-match',
    source: 'face-terminal',
    capturedAt: new Date(),
    decision: 'auto-accept',
    ...overrides,
  };
}

describe('W109 behavioral — ProcessedEvent required + enums', () => {
  it('REJECTS without rawEventId', async () => {
    const p = new Event({ ...baseEvent(), rawEventId: undefined });
    await expect(p.save()).rejects.toThrow(/rawEventId/);
  });

  it('REJECTS without deviceId', async () => {
    const p = new Event({ ...baseEvent(), deviceId: undefined });
    await expect(p.save()).rejects.toThrow(/deviceId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new Event({ ...baseEvent(), branchId: undefined });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without eventKind', async () => {
    const p = new Event({ ...baseEvent(), eventKind: undefined });
    await expect(p.save()).rejects.toThrow(/eventKind/);
  });

  it('REJECTS without source', async () => {
    const p = new Event({ ...baseEvent(), source: undefined });
    await expect(p.save()).rejects.toThrow(/source/);
  });

  it('REJECTS without decision', async () => {
    const p = new Event({ ...baseEvent(), decision: undefined });
    await expect(p.save()).rejects.toThrow(/decision/);
  });

  it('SAVES baseline auto-accept + defaults populate', async () => {
    const doc = await Event.create(baseEvent());
    expect(doc.processedAt).toBeInstanceOf(Date);
    expect(doc.antiSpoofResult).toBe('unknown');
  });
});

describe('W109 behavioral — rawEventId UNIQUE', () => {
  it('REJECTS duplicate rawEventId (one processing per raw event)', async () => {
    const rawEventId = oid();
    await Event.create(baseEvent({ rawEventId }));
    await expect(Event.create(baseEvent({ rawEventId }))).rejects.toThrow(/E11000|duplicate/i);
  });
});

describe('W109 behavioral — decision enum + invariants', () => {
  it('SAVES auto-accept with no review fields (default path)', async () => {
    const doc = await Event.create(baseEvent({ decision: 'auto-accept', confidence: 95 }));
    expect(doc.decision).toBe('auto-accept');
    expect(doc.reviewReason).toBeNull();
  });

  it('REJECTS review decision without reviewReason', async () => {
    const p = new Event(baseEvent({ decision: 'review' }));
    await expect(p.save()).rejects.toThrow(/review decisions require a reviewReason/);
  });

  it('REJECTS review decision without reviewQueue', async () => {
    const p = new Event(baseEvent({ decision: 'review', reviewReason: 'low-confidence' }));
    await expect(p.save()).rejects.toThrow(/review decisions require a reviewQueue/);
  });

  it('SAVES review with reviewReason + reviewQueue', async () => {
    const doc = await Event.create(
      baseEvent({
        decision: 'review',
        reviewReason: 'low-confidence',
        reviewQueue: 'supervisor',
        confidence: 62,
      })
    );
    expect(doc.decision).toBe('review');
    expect(doc.reviewReason).toBe('low-confidence');
  });

  it('REJECTS reject decision without reviewReason', async () => {
    const p = new Event(baseEvent({ decision: 'reject' }));
    await expect(p.save()).rejects.toThrow(/reject decisions require a reviewReason/);
  });

  it('SAVES reject with reviewReason populated', async () => {
    const doc = await Event.create(
      baseEvent({ decision: 'reject', reviewReason: 'mismatch', confidence: 32 })
    );
    expect(doc.decision).toBe('reject');
  });

  it('REJECTS suppressed without linkedSuppressedFromEventId', async () => {
    const p = new Event(baseEvent({ decision: 'suppressed' }));
    await expect(p.save()).rejects.toThrow(
      /suppressed decisions require linkedSuppressedFromEventId/
    );
  });

  it('SAVES suppressed with linkedSuppressedFromEventId', async () => {
    const doc = await Event.create(
      baseEvent({ decision: 'suppressed', linkedSuppressedFromEventId: oid() })
    );
    expect(doc.decision).toBe('suppressed');
  });
});

describe('W109 behavioral — confidence + threshold bounds', () => {
  it('REJECTS confidence > 100', async () => {
    const p = new Event(baseEvent({ confidence: 110 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS confidence < 0', async () => {
    const p = new Event(baseEvent({ confidence: -5 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES at boundaries 0 + 100', async () => {
    const a = await Event.create(baseEvent({ rawEventId: oid(), confidence: 0 }));
    const b = await Event.create(baseEvent({ rawEventId: oid(), confidence: 100 }));
    expect(a.confidence).toBe(0);
    expect(b.confidence).toBe(100);
  });
});

describe('W109 behavioral — ProcessedEvent collection name', () => {
  it('uses canonical collection name hikvision_processed_events', () => {
    expect(Event.collection.collectionName).toBe('hikvision_processed_events');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 3 — End-to-end: cron run + processed events emitted
// ═════════════════════════════════════════════════════════════════════

describe('W108+W109 behavioral — cron + event-gate pipeline', () => {
  it('records sync job run + 3 processed events (auto-accept + review + suppressed)', async () => {
    // 1. Scheduler dispatches sync job
    const job = await JobRun.create({
      jobId: 'hikvision.sync-all',
      trigger: 'cron',
      status: 'running',
    });
    expect(job.status).toBe('running');

    // 2. Event-gate processes 3 raw events
    const deviceId = oid();
    const branchId = oid();

    const e1 = await Event.create({
      rawEventId: oid(),
      deviceId,
      branchId,
      eventKind: 'face-match',
      source: 'face-terminal',
      capturedAt: new Date(),
      decision: 'auto-accept',
      confidence: 96,
      matchedEmployeeId: oid(),
    });

    const e2 = await Event.create({
      rawEventId: oid(),
      deviceId,
      branchId,
      eventKind: 'face-match',
      source: 'face-terminal',
      capturedAt: new Date(),
      decision: 'review',
      reviewReason: 'low-confidence',
      reviewQueue: 'supervisor',
      confidence: 68,
      matchedEmployeeId: oid(),
    });

    const e3 = await Event.create({
      rawEventId: oid(),
      deviceId,
      branchId,
      eventKind: 'face-match',
      source: 'face-terminal',
      capturedAt: new Date(),
      decision: 'suppressed',
      linkedSuppressedFromEventId: e1._id,
      matchedEmployeeId: e1.matchedEmployeeId,
    });

    // 3. Sync job completes successfully
    job.status = 'succeeded';
    job.finishedAt = new Date();
    job.durationMs = 412;
    job.result = { eventsProcessed: 3, autoAccepted: 1, reviewed: 1, suppressed: 1 };
    await job.save();

    expect(job.status).toBe('succeeded');
    expect(e1.decision).toBe('auto-accept');
    expect(e2.reviewReason).toBe('low-confidence');
    expect(e3.linkedSuppressedFromEventId.toString()).toBe(e1._id.toString());
  });
});

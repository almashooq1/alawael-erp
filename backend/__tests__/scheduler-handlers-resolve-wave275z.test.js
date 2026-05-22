'use strict';

/**
 * scheduler-handlers-resolve-wave275z.test.js — Wave 275z (drift guard).
 *
 * Catches the 4-bugs-in-a-row pattern surfaced during W275t/u/v:
 * scheduler handlers referencing service methods that don't exist
 * by that name. Each bug was a typo/rename mismatch (sweepUnresponsive
 * vs sweepStaleDevices, drainPending vs processBatch,
 * scanUnregistered vs scanUnregisteredFaces, sweepExpired vs
 * sweepExpiredFlags). None surfaced in production because the cron
 * jobs hadn't fired in test contexts AND no unit test exercised
 * the scheduler-handler ↔ service-method binding directly.
 *
 * This guard wires the scheduler with FULL service stubs that
 * implement EVERY public method by name. Invoking each handler
 * either succeeds (target method exists) or throws TypeError
 * "X is not a function" (target method doesn't exist).
 *
 * Adding a new scheduler handler: ALSO add the corresponding method
 * name to the stub for the relevant service. Adding a new service
 * method that the scheduler invokes: ALSO add it to the stub. Either
 * way the stub keeps the wire honest.
 *
 * This is a regression net for the AUDIT METHODOLOGY itself — not
 * for any single endpoint. The cron handlers will continue to be
 * speculatively written; this test makes the speculation safe.
 */

const { createHikvisionScheduler } = require('../intelligence/hikvision-scheduler.service');
const reg = require('../intelligence/hikvision.registry');

// Constructor-style stub for HikvisionJobRun: scheduler does
// `new runModel(payload)` + .validate() + .save() to persist runs.
function _StubRunModel(data) {
  Object.assign(this, data || {});
}
_StubRunModel.find = () => {
  const arr = [];
  const q = Promise.resolve(arr);
  q.sort = () => q;
  q.limit = () => q;
  q.lean = () => q;
  return q;
};
_StubRunModel.updateOne = () => Promise.resolve({ modifiedCount: 1 });
_StubRunModel.deleteMany = () => Promise.resolve({ deletedCount: 0 });
_StubRunModel.prototype.validate = function () {
  return Promise.resolve();
};
_StubRunModel.prototype.save = function () {
  return Promise.resolve(this);
};
_StubRunModel.prototype.toObject = function () {
  return { ...this };
};

// Stub services with EVERY method the scheduler currently invokes.
// If a future commit adds `eventParser.foo()` in a handler, add
// `foo() { ... }` here too. Otherwise the test fails with "foo is
// not a function" — exactly what we want.
const _syncWorker = {
  syncAll: jest.fn(async () => ({ ok: true, libraries: [] })),
  detectDriftAll: jest.fn(async () => ({ ok: true, drifted: [] })),
};
const _fraudDetection = {
  scanTemplates: jest.fn(async () => ({ ok: true, flags: [] })),
  scanUnregisteredFaces: jest.fn(async () => ({ ok: true, flags: [] })),
  sweepExpiredFlags: jest.fn(async () => ({ ok: true, expired: 0 })),
};
const _fraudScore = {
  decayAllScores: jest.fn(async () => ({ ok: true, scanned: 0 })),
};
const _eventParser = {
  processBatch: jest.fn(async () => ({ ok: true, scanned: 0 })),
};
const _healthMonitor = {
  sweepStaleDevices: jest.fn(async () => ({ ok: true, demoted: 0 })),
};
const _anomalyDetector = {
  detect: jest.fn(async () => ({ ok: true, items: [], summary: { total: 0 } })),
};
const _anomalyHistory = {
  recordSnapshot: jest.fn(async () => ({ ok: true, snapshot: { _id: 'snap-1' } })),
};

function _makeScheduler() {
  return createHikvisionScheduler({
    syncWorker: _syncWorker,
    fraudDetection: _fraudDetection,
    fraudScore: _fraudScore,
    eventParser: _eventParser,
    healthMonitor: _healthMonitor,
    anomalyDetector: _anomalyDetector,
    anomalyHistory: _anomalyHistory,
    runModel: _StubRunModel,
  });
}

// Internal accessor: scheduler doesn't export jobs directly, but
// listJobs() returns the registry shape. For handler invocation we
// need direct access — use the scheduler's runJob() entry point
// which dispatches by JOB_ID.
async function _invokeHandler(scheduler, jobId) {
  return scheduler.runJob({
    jobId,
    trigger: reg.JOB_TRIGGER.MANUAL,
    initiator: 'test:wave275z',
    args: {},
  });
}

describe('Wave 275z — scheduler handler method-name resolution', () => {
  let scheduler;

  beforeAll(() => {
    scheduler = _makeScheduler();
  });

  // Reset call records between tests so each test asserts cleanly.
  beforeEach(() => {
    [
      _syncWorker.syncAll,
      _syncWorker.detectDriftAll,
      _fraudDetection.scanTemplates,
      _fraudDetection.scanUnregisteredFaces,
      _fraudDetection.sweepExpiredFlags,
      _fraudScore.decayAllScores,
      _eventParser.processBatch,
      _healthMonitor.sweepStaleDevices,
      _anomalyDetector.detect,
      _anomalyHistory.recordSnapshot,
    ].forEach(fn => fn.mockClear());
  });

  test('SYNC_ALL resolves to syncWorker.syncAll (not syncDevices/syncEverything)', async () => {
    const r = await _invokeHandler(scheduler, reg.JOB_ID.SYNC_ALL);
    expect(r.ok).toBe(true);
    expect(_syncWorker.syncAll).toHaveBeenCalledTimes(1);
  });

  test('DRIFT_DETECT_ALL resolves to syncWorker.detectDriftAll', async () => {
    const r = await _invokeHandler(scheduler, reg.JOB_ID.DRIFT_DETECT_ALL);
    expect(r.ok).toBe(true);
    expect(_syncWorker.detectDriftAll).toHaveBeenCalledTimes(1);
  });

  test('FRAUD_SCAN_TEMPLATES resolves to fraudDetection.scanTemplates', async () => {
    const r = await _invokeHandler(scheduler, reg.JOB_ID.FRAUD_SCAN_TEMPLATES);
    expect(r.ok).toBe(true);
    expect(_fraudDetection.scanTemplates).toHaveBeenCalledTimes(1);
  });

  // ⚠️ BUG-FIX REGRESSION: was scanUnregistered, fixed to scanUnregisteredFaces in W275v.
  test('FRAUD_SCAN_UNREGISTERED resolves to fraudDetection.scanUnregisteredFaces (W275v bug fix)', async () => {
    const r = await _invokeHandler(scheduler, reg.JOB_ID.FRAUD_SCAN_UNREGISTERED);
    expect(r.ok).toBe(true);
    expect(_fraudDetection.scanUnregisteredFaces).toHaveBeenCalledTimes(1);
  });

  // ⚠️ BUG-FIX REGRESSION: was sweepExpired, fixed to sweepExpiredFlags in W275v.
  test('FRAUD_SWEEP_EXPIRED resolves to fraudDetection.sweepExpiredFlags (W275v bug fix)', async () => {
    const r = await _invokeHandler(scheduler, reg.JOB_ID.FRAUD_SWEEP_EXPIRED);
    expect(r.ok).toBe(true);
    expect(_fraudDetection.sweepExpiredFlags).toHaveBeenCalledTimes(1);
  });

  test('FRAUD_DECAY_ALL resolves to fraudScore.decayAllScores', async () => {
    const r = await _invokeHandler(scheduler, reg.JOB_ID.FRAUD_DECAY_ALL);
    expect(r.ok).toBe(true);
    expect(_fraudScore.decayAllScores).toHaveBeenCalledTimes(1);
  });

  // ⚠️ BUG-FIX REGRESSION: was drainPending, fixed to processBatch in W275u.
  test('RAW_EVENT_PARSE resolves to eventParser.processBatch (W275u bug fix)', async () => {
    const r = await _invokeHandler(scheduler, reg.JOB_ID.RAW_EVENT_PARSE);
    expect(r.ok).toBe(true);
    expect(_eventParser.processBatch).toHaveBeenCalledTimes(1);
  });

  // ⚠️ BUG-FIX REGRESSION: was sweepUnresponsive, fixed to sweepStaleDevices in W275t.
  test('HEALTH_SWEEP resolves to healthMonitor.sweepStaleDevices (W275t bug fix)', async () => {
    const r = await _invokeHandler(scheduler, reg.JOB_ID.HEALTH_SWEEP);
    expect(r.ok).toBe(true);
    expect(_healthMonitor.sweepStaleDevices).toHaveBeenCalledTimes(1);
  });

  test('ANOMALY_SCAN invokes both detect AND recordSnapshot (chain integrity)', async () => {
    const r = await _invokeHandler(scheduler, reg.JOB_ID.ANOMALY_SCAN);
    expect(r.ok).toBe(true);
    expect(_anomalyDetector.detect).toHaveBeenCalledTimes(1);
    expect(_anomalyHistory.recordSnapshot).toHaveBeenCalledTimes(1);
  });
});

// ─── Sanity: all known JOB_IDs covered by this test ──────────────

describe('Wave 275z — coverage completeness', () => {
  test('this test covers every JOB_ID in the registry', () => {
    // If a new JOB_ID is added to reg.JOB_ID, this expect fails until
    // the corresponding handler-resolution test above is also added.
    const knownJobIds = new Set([
      reg.JOB_ID.SYNC_ALL,
      reg.JOB_ID.DRIFT_DETECT_ALL,
      reg.JOB_ID.FRAUD_SCAN_TEMPLATES,
      reg.JOB_ID.FRAUD_SCAN_UNREGISTERED,
      reg.JOB_ID.FRAUD_SWEEP_EXPIRED,
      reg.JOB_ID.FRAUD_DECAY_ALL,
      reg.JOB_ID.RAW_EVENT_PARSE,
      reg.JOB_ID.HEALTH_SWEEP,
      reg.JOB_ID.ANOMALY_SCAN,
    ]);
    const allJobIds = new Set(Object.values(reg.JOB_ID));
    const missing = [...allJobIds].filter(id => !knownJobIds.has(id));
    if (missing.length) {
      throw new Error(
        `New JOB_IDs in registry not covered by W275z handler-resolution tests:\n  ${missing.join('\n  ')}\n\n` +
          'Add a test above + the corresponding service stub method, ' +
          'OR rename the missing JOB_ID(s) to opt out.'
      );
    }
    expect(missing).toEqual([]);
  });
});

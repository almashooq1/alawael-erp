/**
 * wave133-attendance-privacy.test.js — Wave 133.
 *
 * PDPL/GDPR-style export + erasure + retention enforcement.
 */

'use strict';

const {
  createAttendancePrivacyService,
  redactPiiInDoc,
} = require('../intelligence/attendance-privacy.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── Mock factory ──────────────────────────────────────────────

function buildModel(seed = []) {
  const store = seed.map((s, i) => ({ _id: s._id || `r-${i + 1}`, ...s }));
  const M = {};
  M.find = function (q = {}) {
    const matches = store.filter(r => {
      for (const [k, v] of Object.entries(q)) {
        if (k === 'employeeId' || k === 'requesterId') {
          if (String(r[k]) !== String(v)) return false;
        } else if (k === 'status') {
          if (v && v.$in) {
            if (!v.$in.includes(r.status)) return false;
          } else if (typeof v === 'string') {
            if (r.status !== v) return false;
          }
        } else if (
          k === 'eventTime' ||
          k === 'shiftDate' ||
          k === 'submittedAt' ||
          k === 'detectedAt' ||
          k === 'lastRefreshedAt' ||
          k === 'createdAt'
        ) {
          if (v.$lt && new Date(r[k]).getTime() >= new Date(v.$lt).getTime()) return false;
        } else if (k === 'enabled') {
          if (r.enabled !== v) return false;
        } else if (k === '$nor') {
          for (const norFilter of v) {
            let matches = true;
            for (const [nk, nv] of Object.entries(norFilter)) {
              if (r[nk] !== nv) {
                matches = false;
                break;
              }
            }
            if (matches) return false;
          }
        } else if (k === 'collection') {
          if (r.collection !== v) return false;
        }
      }
      return true;
    });
    return {
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
  };
  M.findOne = function (q = {}) {
    const m = store.find(r => {
      if (q.collection && r.collection !== q.collection) return false;
      if (q.enabled != null && r.enabled !== q.enabled) return false;
      return true;
    });
    return {
      lean: async () => (m ? { ...m } : null),
      then: r => r(m ? { ...m } : null),
    };
  };
  M.deleteMany = async function (q) {
    const before = store.length;
    for (let i = store.length - 1; i >= 0; i--) {
      const r = store[i];
      let match = true;
      for (const [k, v] of Object.entries(q)) {
        if (k === 'employeeId' || k === 'requesterId') {
          if (String(r[k]) !== String(v)) {
            match = false;
            break;
          }
        } else if (
          k === 'eventTime' ||
          k === 'shiftDate' ||
          k === 'submittedAt' ||
          k === 'detectedAt' ||
          k === 'lastRefreshedAt' ||
          k === 'createdAt'
        ) {
          if (v && v.$lt) {
            if (new Date(r[k]).getTime() >= new Date(v.$lt).getTime()) {
              match = false;
              break;
            }
          }
        } else if (k === '$nor') {
          for (const norFilter of v) {
            let norMatch = true;
            for (const [nk, nv] of Object.entries(norFilter)) {
              if (r[nk] !== nv) {
                norMatch = false;
                break;
              }
            }
            if (norMatch) {
              match = false;
              break;
            }
          }
        }
      }
      if (match) store.splice(i, 1);
    }
    return { deletedCount: before - store.length };
  };
  M.updateOne = async function (q, update) {
    const idx = store.findIndex(r => String(r._id) === String(q._id));
    if (idx < 0) return { acknowledged: false };
    if (update.$set) {
      // Apply dot-path sets.
      for (const [path, val] of Object.entries(update.$set)) {
        const parts = path.split('.');
        let cur = store[idx];
        for (let i = 0; i < parts.length - 1; i++) {
          if (cur[parts[i]] == null) cur[parts[i]] = {};
          cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = val;
      }
    }
    return { acknowledged: true, modifiedCount: 1 };
  };
  M._store = store;
  return M;
}

// ─── redactPiiInDoc pure helper ────────────────────────────────

describe('attendance-privacy — redactPiiInDoc', () => {
  test('sets dot-paths to null + adds __piiRedacted marker', () => {
    const doc = {
      employeeId: 'emp-1',
      geo: { lat: 24.7, lng: 46.7, accuracyM: 15 },
      sourceRef: { cardUid: 'CARD-X', deviceId: 'DEV-1' },
    };
    const out = redactPiiInDoc(doc, ['geo.lat', 'geo.lng', 'sourceRef.cardUid']);
    expect(out.geo.lat).toBeNull();
    expect(out.geo.lng).toBeNull();
    expect(out.geo.accuracyM).toBe(15); // not in piiFields
    expect(out.sourceRef.cardUid).toBeNull();
    expect(out.sourceRef.deviceId).toBe('DEV-1');
    expect(out.__piiRedacted).toBe(true);
  });

  test('does not mutate the source doc', () => {
    const doc = { geo: { lat: 1 } };
    redactPiiInDoc(doc, ['geo.lat']);
    expect(doc.geo.lat).toBe(1);
    expect(doc.__piiRedacted).toBeUndefined();
  });
});

// ─── exportEmployeeData ────────────────────────────────────────

describe('attendance-privacy — exportEmployeeData', () => {
  test('collects rows from all attendance collections', async () => {
    const models = {
      sourceEvent: buildModel([
        { employeeId: 'emp-1', eventKind: 'check-in', source: 'face-terminal' },
        { employeeId: 'emp-2', eventKind: 'check-in', source: 'face-terminal' },
      ]),
      dailyRecord: buildModel([{ employeeId: 'emp-1', workedMinutes: 540, status: 'closed' }]),
      exception: buildModel([{ employeeId: 'emp-1', kind: 'missing-checkout', status: 'open' }]),
      correctionRequest: buildModel([
        {
          requesterId: 'emp-1',
          kind: 'edit-time',
          evidence: { witnessId: 'emp-other', photoRef: 's3://x.jpg' },
        },
      ]),
      baseline: buildModel([{ employeeId: 'emp-1', sampleSize: 30 }]),
    };
    const svc = createAttendancePrivacyService({ models, logger: SILENT });
    const r = await svc.exportEmployeeData({ employeeId: 'emp-1' });
    expect(r.ok).toBe(true);
    expect(r.export.sourceEvents).toHaveLength(1);
    expect(r.export.dailyRecords).toHaveLength(1);
    expect(r.export.correctionRequests).toHaveLength(1);
    // Cross-employee PII redacted.
    expect(r.export.correctionRequests[0].evidence.witnessId).toBe('<redacted-other-employee>');
    expect(r.export.baseline).toHaveLength(1);
  });

  test('missing employeeId → EMPLOYEE_REQUIRED', async () => {
    const svc = createAttendancePrivacyService({ models: {}, logger: SILENT });
    const r = await svc.exportEmployeeData({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('EMPLOYEE_REQUIRED');
  });
});

// ─── eraseEmployee ─────────────────────────────────────────────

describe('attendance-privacy — eraseEmployee', () => {
  function setup() {
    const sourceEvent = buildModel([
      { employeeId: 'emp-1', source: 'face-terminal' },
      { employeeId: 'emp-1', source: 'nfc' },
      { employeeId: 'emp-2', source: 'face-terminal' },
    ]);
    const dailyRecord = buildModel([
      { employeeId: 'emp-1', workedMinutes: 540, status: 'closed' },
      { employeeId: 'emp-2', workedMinutes: 480, status: 'closed' },
    ]);
    const exception = buildModel([{ employeeId: 'emp-1', kind: 'late-arrival-pattern' }]);
    const correctionRequest = buildModel([
      {
        requesterId: 'emp-1',
        kind: 'missing-checkout',
        evidence: { photoRef: 's3://x.jpg' },
      },
    ]);
    const baseline = buildModel([{ employeeId: 'emp-1', sampleSize: 50 }]);
    return { sourceEvent, dailyRecord, exception, correctionRequest, baseline };
  }

  test('hard-deletes source events; redacts daily records (preserves aggregates)', async () => {
    const models = setup();
    const svc = createAttendancePrivacyService({
      models,
      retentionPolicyModel: buildModel([]),
      logger: SILENT,
    });
    const r = await svc.eraseEmployee({
      employeeId: 'emp-1',
      reason: 'subject-access-erasure-request',
      actorId: 'dpo-1',
      actorRole: 'dpo',
    });
    expect(r.ok).toBe(true);
    expect(r.report.attendance_source_events.action).toBe('hard-delete');
    expect(r.report.attendance_source_events.affected).toBe(2);
    // emp-2 untouched.
    expect(models.sourceEvent._store.filter(s => s.employeeId === 'emp-2')).toHaveLength(1);
    expect(models.sourceEvent._store.filter(s => s.employeeId === 'emp-1')).toHaveLength(0);
    // Daily records redacted not deleted.
    expect(r.report.daily_attendance_records.action).toBe('redact-pii');
    expect(models.dailyRecord._store.filter(s => s.employeeId === 'emp-1')).toHaveLength(1);
    expect(models.dailyRecord._store.find(s => s.employeeId === 'emp-1').__piiRedacted).toBe(true);
  });

  test('legal hold blocks erasure', async () => {
    const models = setup();
    const svc = createAttendancePrivacyService({
      models,
      retentionPolicyModel: buildModel([]),
      legalHoldChecker: async () => true,
      logger: SILENT,
    });
    const r = await svc.eraseEmployee({
      employeeId: 'emp-1',
      reason: 'erasure attempt',
      actorId: 'dpo-1',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_LEGAL_HOLD_ACTIVE');
  });

  test('payroll-locked rows block erasure', async () => {
    const models = setup();
    // Mark a dailyRecord as locked.
    models.dailyRecord._store[0].status = 'locked';
    const svc = createAttendancePrivacyService({
      models,
      retentionPolicyModel: buildModel([]),
      logger: SILENT,
    });
    const r = await svc.eraseEmployee({
      employeeId: 'emp-1',
      reason: 'erasure attempt',
      actorId: 'dpo-1',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_PAYROLL_LOCKED_ROWS_EXIST');
  });

  test('reason too short rejected', async () => {
    const models = setup();
    const svc = createAttendancePrivacyService({
      models,
      retentionPolicyModel: buildModel([]),
      logger: SILENT,
    });
    const r = await svc.eraseEmployee({
      employeeId: 'emp-1',
      reason: 'x',
      actorId: 'dpo-1',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('REASON_TOO_SHORT');
  });

  test('missing actor rejected', async () => {
    const models = setup();
    const svc = createAttendancePrivacyService({
      models,
      retentionPolicyModel: buildModel([]),
      logger: SILENT,
    });
    const r = await svc.eraseEmployee({
      employeeId: 'emp-1',
      reason: 'has-good-reason',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ACTOR_REQUIRED');
  });
});

// ─── applyRetention ────────────────────────────────────────────

describe('attendance-privacy — applyRetention', () => {
  const NOW = new Date('2026-05-19T12:00:00Z');

  test('dryRun returns wouldAffect count without modifying', async () => {
    const oldTime = new Date('2025-01-01T00:00:00Z'); // > 90 days ago
    const recentTime = new Date('2026-05-15T00:00:00Z');
    const sourceEvent = buildModel([
      { employeeId: 'emp-1', eventTime: oldTime },
      { employeeId: 'emp-1', eventTime: recentTime },
    ]);
    const policy = buildModel([
      {
        collection: 'attendance_source_events',
        retentionDays: 90,
        action: 'hard-delete',
        enabled: true,
      },
    ]);
    const svc = createAttendancePrivacyService({
      models: { sourceEvent },
      retentionPolicyModel: policy,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.applyRetention({
      collection: 'attendance_source_events',
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    expect(r.dryRun).toBe(true);
    expect(r.wouldAffect).toBe(1); // only the old one
    expect(sourceEvent._store).toHaveLength(2); // unchanged
  });

  test('hard-delete action removes expired rows', async () => {
    const oldTime = new Date('2025-01-01T00:00:00Z');
    const recentTime = new Date('2026-05-15T00:00:00Z');
    const sourceEvent = buildModel([
      { _id: 'old-1', employeeId: 'emp-1', eventTime: oldTime },
      { _id: 'old-2', employeeId: 'emp-1', eventTime: oldTime },
      { _id: 'recent', employeeId: 'emp-1', eventTime: recentTime },
    ]);
    const policy = buildModel([
      {
        collection: 'attendance_source_events',
        retentionDays: 90,
        action: 'hard-delete',
        enabled: true,
      },
    ]);
    const svc = createAttendancePrivacyService({
      models: { sourceEvent },
      retentionPolicyModel: policy,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.applyRetention({ collection: 'attendance_source_events' });
    expect(r.ok).toBe(true);
    expect(r.affected).toBe(2);
    expect(sourceEvent._store).toHaveLength(1);
    expect(sourceEvent._store[0]._id).toBe('recent');
  });

  test('redact-pii action nulls dot-paths + sets __piiRedacted', async () => {
    const oldTime = new Date('2025-01-01T00:00:00Z');
    const sourceEvent = buildModel([
      {
        _id: 'old-1',
        employeeId: 'emp-1',
        eventTime: oldTime,
        geo: { lat: 24.7, lng: 46.7 },
        sourceRef: { cardUid: 'CARD-X', deviceId: 'DEV-1' },
      },
    ]);
    const policy = buildModel([
      {
        collection: 'attendance_source_events',
        retentionDays: 90,
        action: 'redact-pii',
        piiFields: ['geo.lat', 'geo.lng', 'sourceRef.cardUid'],
        enabled: true,
      },
    ]);
    const svc = createAttendancePrivacyService({
      models: { sourceEvent },
      retentionPolicyModel: policy,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.applyRetention({ collection: 'attendance_source_events' });
    expect(r.ok).toBe(true);
    expect(r.affected).toBe(1);
    expect(sourceEvent._store[0].geo.lat).toBeNull();
    expect(sourceEvent._store[0].geo.lng).toBeNull();
    expect(sourceEvent._store[0].sourceRef.cardUid).toBeNull();
    expect(sourceEvent._store[0].sourceRef.deviceId).toBe('DEV-1');
    expect(sourceEvent._store[0].__piiRedacted).toBe(true);
  });

  test('disabled policy → skipped', async () => {
    const policy = buildModel([
      {
        collection: 'attendance_source_events',
        retentionDays: 90,
        action: 'hard-delete',
        enabled: false,
      },
    ]);
    const svc = createAttendancePrivacyService({
      models: { sourceEvent: buildModel([]) },
      retentionPolicyModel: policy,
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.applyRetention({ collection: 'attendance_source_events' });
    // findOne in the mock only returns enabled=true rows, so the
    // service sees no policy → returns NO_POLICY.
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NO_POLICY');
  });

  test('no policy at all → NO_POLICY', async () => {
    const svc = createAttendancePrivacyService({
      models: { sourceEvent: buildModel([]) },
      retentionPolicyModel: buildModel([]),
      logger: SILENT,
      now: () => NOW,
    });
    const r = await svc.applyRetention({ collection: 'attendance_source_events' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NO_POLICY');
  });

  test('missing collection → VALIDATION_FAILED', async () => {
    const svc = createAttendancePrivacyService({
      models: {},
      retentionPolicyModel: buildModel([]),
      logger: SILENT,
    });
    const r = await svc.applyRetention({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('VALIDATION_FAILED');
  });
});

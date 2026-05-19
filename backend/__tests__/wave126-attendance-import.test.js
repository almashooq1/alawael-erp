/**
 * wave126-attendance-import.test.js — Wave 126.
 *
 * Tests HMAC-signed bulk attendance import from external systems.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const {
  createAttendanceImportService,
  computePayloadHash,
  signPayload,
  hashSecret,
} = require('../intelligence/attendance-import.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── Mocks ──────────────────────────────────────────────────────

function buildSourceEventModel() {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = `evt-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.find = function (q = {}) {
    const matches = store.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.source && r.source !== q.source) return false;
      if (q.eventTime) {
        const qt = new Date(q.eventTime).getTime();
        const rt = new Date(r.eventTime).getTime();
        if (qt !== rt) return false;
      }
      return true;
    });
    return {
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
  };
  M._store = store;
  return M;
}

function buildImportSourceModel(sources) {
  const M = {};
  M.findOne = function (q = {}) {
    const m = sources.find(s => {
      if (q.sourceId && s.sourceId !== q.sourceId) return false;
      if (q.active != null && s.active !== q.active) return false;
      return true;
    });
    return {
      lean: async () => (m ? { ...m } : null),
      then: r => r(m ? { ...m } : null),
    };
  };
  M.updateOne = async () => ({ acknowledged: true });
  return M;
}

function buildImportBatchModel(seed = []) {
  const store = [...seed];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = `batch-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.findOne = function (q = {}) {
    const m = store.find(b => {
      if (q.sourceId && b.sourceId !== q.sourceId) return false;
      if (q.payloadHash && b.payloadHash !== q.payloadHash) return false;
      return true;
    });
    return {
      lean: async () => (m ? { ...m } : null),
      then: r => r(m ? { ...m } : null),
    };
  };
  M._store = store;
  return M;
}

function buildEmployeeModel(seed = []) {
  const M = {};
  M.findOne = function (q = {}) {
    const m = seed.find(e => {
      for (const [k, v] of Object.entries(q)) {
        if (k.startsWith('externalEmployeeIds.')) {
          const sub = k.slice('externalEmployeeIds.'.length);
          if (!(e.externalEmployeeIds && e.externalEmployeeIds[sub] === v)) return false;
        } else if (e[k] !== v) {
          return false;
        }
      }
      return true;
    });
    return {
      lean: async () => (m ? { ...m } : null),
      then: r => r(m ? { ...m } : null),
    };
  };
  return M;
}

const SECRET = 'imp-secret-xyz';
const SOURCE_OBJECTID_MODE = {
  _id: 'src-1',
  sourceId: 'legacy-hr',
  secretHash: hashSecret(SECRET),
  branchScope: [],
  allowedKinds: ['check-in', 'check-out'],
  employeeIdMode: 'objectId',
  employeeIdField: null,
  maxRowsPerBatch: 5000,
  active: true,
};
const SOURCE_EXTERNAL_MODE = {
  _id: 'src-2',
  sourceId: 'partner-clock',
  secretHash: hashSecret(SECRET),
  branchScope: [],
  allowedKinds: ['check-in', 'check-out'],
  employeeIdMode: 'externalKey',
  employeeIdField: 'externalEmployeeIds.legacy_hr',
  maxRowsPerBatch: 5000,
  active: true,
};

function buildSvc(extra = {}) {
  return createAttendanceImportService({
    sourceEventModel: extra.sourceEventModel || buildSourceEventModel(),
    importSourceModel: extra.importSourceModel || buildImportSourceModel([SOURCE_OBJECTID_MODE]),
    importBatchModel: extra.importBatchModel || buildImportBatchModel([]),
    employeeModel: extra.employeeModel || null,
    logger: SILENT,
    now: () => new Date('2026-05-19T10:00:00Z'),
    sourceSecretResolver: extra.sourceSecretResolver || (async () => SECRET),
    ...extra,
  });
}

// ─── Pure helpers ───────────────────────────────────────────────

describe('attendance-import — pure helpers', () => {
  test('computePayloadHash deterministic for canonical-equivalent rows', () => {
    const a = [{ employeeId: 'e1', eventTime: '2026-05-18T08:00:00Z', eventKind: 'check-in' }];
    const b = [{ eventTime: '2026-05-18T08:00:00Z', employeeId: 'e1', eventKind: 'check-in' }];
    expect(computePayloadHash(a)).toBe(computePayloadHash(b));
  });

  test('computePayloadHash differs across content', () => {
    const a = [{ employeeId: 'e1' }];
    const b = [{ employeeId: 'e2' }];
    expect(computePayloadHash(a)).not.toBe(computePayloadHash(b));
  });

  test('signPayload deterministic for same secret', () => {
    const h = computePayloadHash([{ x: 1 }]);
    expect(signPayload('s', h)).toBe(signPayload('s', h));
    expect(signPayload('s', h)).not.toBe(signPayload('t', h));
  });
});

// ─── Authentication / authorization ────────────────────────────

describe('attendance-import — submitImportBatch auth', () => {
  test('unknown source → SOURCE_UNKNOWN', async () => {
    const svc = buildSvc({ importSourceModel: buildImportSourceModel([]) });
    const r = await svc.submitImportBatch({
      sourceId: 'ghost',
      hmacSig: 'whatever',
      rows: [{}],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_IMPORT_SOURCE_UNKNOWN');
  });

  test('signature mismatch rejected', async () => {
    const svc = buildSvc();
    const rows = [
      {
        employeeId: 'e1',
        eventTime: '2026-05-18T08:00:00Z',
        eventKind: 'check-in',
      },
    ];
    const r = await svc.submitImportBatch({
      sourceId: 'legacy-hr',
      hmacSig: 'a'.repeat(64),
      rows,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_IMPORT_SIGNATURE_INVALID');
  });

  test('valid signature → batch persisted with all rows accepted', async () => {
    const Source = buildSourceEventModel();
    const Batch = buildImportBatchModel([]);
    const svc = buildSvc({ sourceEventModel: Source, importBatchModel: Batch });
    const rows = [
      {
        employeeId: 'e1',
        eventTime: '2026-05-18T08:00:00Z',
        eventKind: 'check-in',
        branchId: 'br-1',
      },
      {
        employeeId: 'e1',
        eventTime: '2026-05-18T17:00:00Z',
        eventKind: 'check-out',
        branchId: 'br-1',
      },
    ];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({
      sourceId: 'legacy-hr',
      hmacSig: sig,
      rows,
    });
    expect(r.ok).toBe(true);
    expect(r.acceptedRows).toBe(2);
    expect(r.status).toBe('accepted');
    expect(Source._store).toHaveLength(2);
    expect(Source._store[0].source).toBe('api-import');
    expect(Source._store[0].tierLabel).toBe('T2');
  });

  test('secret resolver misconfigured (resolver returns wrong secret) → AUTH_MISCONFIGURED', async () => {
    const svc = buildSvc({
      sourceSecretResolver: async () => 'wrong-secret', // hashes differ from stored hash
    });
    const rows = [{ employeeId: 'e1', eventTime: '2026-05-18T08:00:00Z', eventKind: 'check-in' }];
    const hash = computePayloadHash(rows);
    const sig = signPayload('wrong-secret', hash); // matches resolver but not stored hash
    const r = await svc.submitImportBatch({
      sourceId: 'legacy-hr',
      hmacSig: sig,
      rows,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_IMPORT_SOURCE_AUTH_MISCONFIGURED');
  });
});

// ─── Idempotency ────────────────────────────────────────────────

describe('attendance-import — idempotency', () => {
  test('same payload re-submitted → returns existing batch, no double-persist', async () => {
    const Source = buildSourceEventModel();
    const Batch = buildImportBatchModel([]);
    const svc = buildSvc({ sourceEventModel: Source, importBatchModel: Batch });
    const rows = [{ employeeId: 'e1', eventTime: '2026-05-18T08:00:00Z', eventKind: 'check-in' }];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const first = await svc.submitImportBatch({ sourceId: 'legacy-hr', hmacSig: sig, rows });
    expect(first.ok).toBe(true);
    expect(Source._store).toHaveLength(1);

    const second = await svc.submitImportBatch({ sourceId: 'legacy-hr', hmacSig: sig, rows });
    expect(second.ok).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(Source._store).toHaveLength(1); // no second persist
  });
});

// ─── Row-level validation ───────────────────────────────────────

describe('attendance-import — row validation', () => {
  test('missing eventTime row rejected; other rows accepted; status=partially-accepted', async () => {
    const Source = buildSourceEventModel();
    const Batch = buildImportBatchModel([]);
    const svc = buildSvc({ sourceEventModel: Source, importBatchModel: Batch });
    const rows = [
      { employeeId: 'e1', eventTime: '2026-05-18T08:00:00Z', eventKind: 'check-in' },
      { employeeId: 'e1', eventKind: 'check-in' }, // missing eventTime
    ];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({ sourceId: 'legacy-hr', hmacSig: sig, rows });
    expect(r.ok).toBe(true);
    expect(r.acceptedRows).toBe(1);
    expect(r.rejectedRows).toBe(1);
    expect(r.status).toBe('partially-accepted');
    expect(Batch._store[0].rejectionSamples[0].reason).toBe('EVENT_TIME_MISSING');
  });

  test('event kind not allowed → rejected', async () => {
    const svc = buildSvc();
    const rows = [{ employeeId: 'e1', eventTime: '2026-05-18T08:00:00Z', eventKind: 'passage' }];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({ sourceId: 'legacy-hr', hmacSig: sig, rows });
    expect(r.ok).toBe(true);
    expect(r.rejectedRows).toBe(1);
    expect(r.status).toBe('rejected');
  });

  test('future event rejected', async () => {
    const svc = buildSvc();
    const rows = [
      { employeeId: 'e1', eventTime: '2026-05-19T11:00:00Z', eventKind: 'check-in' }, // 1h ahead
    ];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({ sourceId: 'legacy-hr', hmacSig: sig, rows });
    expect(r.ok).toBe(true);
    expect(r.rejectedRows).toBe(1);
  });

  test('event older than MAX_PAST_DRIFT_MS rejected', async () => {
    const svc = buildSvc();
    const rows = [{ employeeId: 'e1', eventTime: '2020-01-01T08:00:00Z', eventKind: 'check-in' }];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({ sourceId: 'legacy-hr', hmacSig: sig, rows });
    expect(r.ok).toBe(true);
    expect(r.rejectedRows).toBe(1);
    expect(r.status).toBe('rejected');
  });

  test('branch out of scope → rejected', async () => {
    const scoped = { ...SOURCE_OBJECTID_MODE, branchScope: ['br-allowed'] };
    const svc = buildSvc({ importSourceModel: buildImportSourceModel([scoped]) });
    const rows = [
      {
        employeeId: 'e1',
        eventTime: '2026-05-18T08:00:00Z',
        eventKind: 'check-in',
        branchId: 'br-other',
      },
    ];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({ sourceId: 'legacy-hr', hmacSig: sig, rows });
    expect(r.ok).toBe(true);
    expect(r.rejectedRows).toBe(1);
  });
});

// ─── employee resolution via externalKey ───────────────────────

describe('attendance-import — externalKey employee resolution', () => {
  test('resolves employee via externalEmployeeIds.legacy_hr', async () => {
    const employees = [{ _id: 'emp-real-1', externalEmployeeIds: { legacy_hr: 'LEGACY-A1' } }];
    const Source = buildSourceEventModel();
    const svc = buildSvc({
      sourceEventModel: Source,
      importSourceModel: buildImportSourceModel([SOURCE_EXTERNAL_MODE]),
      employeeModel: buildEmployeeModel(employees),
    });
    const rows = [
      {
        externalEmployeeId: 'LEGACY-A1',
        eventTime: '2026-05-18T08:00:00Z',
        eventKind: 'check-in',
      },
    ];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({
      sourceId: 'partner-clock',
      hmacSig: sig,
      rows,
    });
    expect(r.ok).toBe(true);
    expect(r.acceptedRows).toBe(1);
    expect(String(Source._store[0].employeeId)).toBe('emp-real-1');
  });

  test('unknown externalEmployeeId → row rejected with EMPLOYEE_NOT_FOUND', async () => {
    const Source = buildSourceEventModel();
    const Batch = buildImportBatchModel([]);
    const svc = buildSvc({
      sourceEventModel: Source,
      importSourceModel: buildImportSourceModel([SOURCE_EXTERNAL_MODE]),
      importBatchModel: Batch,
      employeeModel: buildEmployeeModel([]),
    });
    const rows = [
      {
        externalEmployeeId: 'GHOST-ID',
        eventTime: '2026-05-18T08:00:00Z',
        eventKind: 'check-in',
      },
    ];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({
      sourceId: 'partner-clock',
      hmacSig: sig,
      rows,
    });
    expect(r.ok).toBe(true);
    expect(r.rejectedRows).toBe(1);
    expect(Batch._store[0].rejectionSamples[0].reason).toBe('EMPLOYEE_NOT_FOUND');
  });
});

// ─── duplicate detection ────────────────────────────────────────

describe('attendance-import — dedup against existing events', () => {
  test('row matching an existing event at exact time counted as duplicate, not rejected', async () => {
    const Source = buildSourceEventModel();
    // Pre-seed an existing event.
    Source._store.push({
      employeeId: 'e1',
      source: reg.SOURCE_KIND.API_IMPORT,
      eventTime: new Date('2026-05-18T08:00:00Z'),
      eventKind: 'check-in',
    });
    const svc = buildSvc({ sourceEventModel: Source });
    const rows = [{ employeeId: 'e1', eventTime: '2026-05-18T08:00:00Z', eventKind: 'check-in' }];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({ sourceId: 'legacy-hr', hmacSig: sig, rows });
    expect(r.ok).toBe(true);
    expect(r.duplicateRows).toBe(1);
    expect(r.acceptedRows).toBe(0);
    expect(r.status).toBe('partially-accepted');
  });
});

// ─── batch size limits ─────────────────────────────────────────

describe('attendance-import — batch limits', () => {
  test('empty batch rejected', async () => {
    const svc = buildSvc();
    const r = await svc.submitImportBatch({
      sourceId: 'legacy-hr',
      hmacSig: 'a'.repeat(64),
      rows: [],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_IMPORT_EMPTY_BATCH');
  });

  test('oversize batch → BATCH_TOO_LARGE', async () => {
    const tinyMax = { ...SOURCE_OBJECTID_MODE, maxRowsPerBatch: 1 };
    const svc = buildSvc({ importSourceModel: buildImportSourceModel([tinyMax]) });
    const rows = [
      { employeeId: 'e1', eventTime: '2026-05-18T08:00:00Z', eventKind: 'check-in' },
      { employeeId: 'e2', eventTime: '2026-05-18T08:00:00Z', eventKind: 'check-in' },
    ];
    const hash = computePayloadHash(rows);
    const sig = signPayload(SECRET, hash);
    const r = await svc.submitImportBatch({ sourceId: 'legacy-hr', hmacSig: sig, rows });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ATTENDANCE_IMPORT_BATCH_TOO_LARGE');
  });
});

// ─── input shape errors ────────────────────────────────────────

describe('attendance-import — input shape', () => {
  test('rows not array → VALIDATION_FAILED', async () => {
    const svc = buildSvc();
    const r = await svc.submitImportBatch({
      sourceId: 'legacy-hr',
      hmacSig: 'sig',
      rows: 'not-an-array',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('missing sourceId → VALIDATION_FAILED', async () => {
    const svc = buildSvc();
    const r = await svc.submitImportBatch({ hmacSig: 'sig', rows: [] });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('missing hmacSig → VALIDATION_FAILED', async () => {
    const svc = buildSvc();
    const r = await svc.submitImportBatch({ sourceId: 'legacy-hr', rows: [] });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });
});

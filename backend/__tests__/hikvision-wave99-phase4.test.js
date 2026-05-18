/**
 * hikvision-wave99-phase4.test.js — Wave 99 Phase 4.
 *
 * Unit tests for the attendance integration slice:
 *   1. Registry pure helpers (classifyCheckIn/Out, findCorroborationPairs,
 *      dedupByZoneWindow)
 *   2. Reconciliation service — single employee/day flow + conflicts
 *      (no-events, missing-checkout, multi-source-disagreement,
 *      impossible-travel, shift-bridge)
 *   3. Reconciliation — resolveConflict happy path
 *   4. PayrollPeriod — create + overlap detection + close cascade
 *      (locks cases + source events + computes snapshot hash)
 *   5. PayrollPeriod — reopen unlocks cases
 *   6. PayrollOverride — draft → approver chain → execute (Nafath required)
 *   7. Lock protection — attendance-source.createSourceEvent refuses
 *      writes into a closed period
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const {
  createAttendanceReconciliationService,
} = require('../intelligence/attendance-reconciliation.service');
const { createPayrollPeriodService } = require('../intelligence/payroll-period.service');
const { createAttendanceSourceService } = require('../intelligence/attendance-source.service');

// ─── Chainable mock builder ─────────────────────────────────────

function buildModel({ invariants = () => true } = {}) {
  const store = [];
  let counter = 0;

  function ModelCtor(data) {
    Object.assign(this, data);
    this._id = data._id || `id-${++counter}`;
    this.toObject = () => ({ ...this });
    this.isNew = !data._existing;
    this.isModified = () => false;

    this.validate = async function () {
      const errors = {};
      const invalidate = (path, msg) => {
        errors[path] = { message: msg };
      };
      const proxy = new Proxy(this, {
        get: (t, k) => (k === 'invalidate' ? invalidate : t[k]),
      });
      invariants.call(proxy, proxy);
      if (Object.keys(errors).length) {
        const err = new Error('Validation failed');
        err.errors = errors;
        throw err;
      }
    };

    this.save = async function () {
      const idx = store.findIndex(r => String(r._id) === String(this._id));
      if (idx >= 0) {
        store[idx] = { ...this };
      } else {
        if (ModelCtor._unique) {
          for (const fields of ModelCtor._unique) {
            const conflict = store.find(r => fields.every(f => String(r[f]) === String(this[f])));
            if (conflict) {
              const err = new Error('E11000 duplicate key');
              err.code = 11000;
              throw err;
            }
          }
        }
        store.push({ ...this });
      }
      return this;
    };
  }

  ModelCtor._store = store;
  ModelCtor._unique = [];

  ModelCtor.findOne = function (query = {}) {
    const match = store.find(r => _matches(r, query));
    return { lean: async () => (match ? { ...match } : null) };
  };

  ModelCtor.findById = function (id) {
    const hit = store.find(r => String(r._id) === String(id));
    if (!hit) {
      return { lean: async () => null, then: resolve => resolve(null) };
    }
    const inst = new ModelCtor({ ...hit, _existing: true });
    inst._id = hit._id;
    return {
      lean: async () => ({ ...hit }),
      then: resolve => resolve(inst),
    };
  };

  ModelCtor.find = function (query = {}) {
    let matches = store.filter(r => _matches(r, query));
    const chain = {
      sort(spec) {
        const key = Object.keys(spec)[0];
        const dir = spec[key];
        matches = matches.slice().sort((a, b) => {
          const av = a[key];
          const bv = b[key];
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
        return chain;
      },
      skip(n) {
        matches = matches.slice(n);
        return chain;
      },
      limit(n) {
        matches = matches.slice(0, n);
        return chain;
      },
      select() {
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
      then: resolve =>
        resolve(
          matches.map(r => {
            const inst = new ModelCtor({ ...r, _existing: true });
            inst._id = r._id;
            return inst;
          })
        ),
    };
    return chain;
  };

  ModelCtor.countDocuments = async function (query = {}) {
    return store.filter(r => _matches(r, query)).length;
  };

  ModelCtor.updateOne = async function (query, update) {
    const t = store.find(r => _matches(r, query));
    if (t && update.$set) Object.assign(t, update.$set);
    if (t && update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) t[k] = (t[k] || 0) + v;
    }
    return { acknowledged: true, modifiedCount: t ? 1 : 0 };
  };

  ModelCtor.updateMany = async function (query, update) {
    const matches = store.filter(r => _matches(r, query));
    if (update.$set) for (const r of matches) Object.assign(r, update.$set);
    return { acknowledged: true, modifiedCount: matches.length };
  };

  return ModelCtor;
}

function _matches(row, query) {
  for (const [k, v] of Object.entries(query)) {
    if (k === '$or') {
      if (!v.some(cond => _matches(row, cond))) return false;
      continue;
    }
    if (v === null) {
      if (row[k] !== null && row[k] !== undefined) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$in' in v) {
      if (!v.$in.some(x => String(row[k]) === String(x))) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$ne' in v) {
      if (String(row[k]) === String(v.$ne)) return false;
      continue;
    }
    if (v && typeof v === 'object' && ('$lt' in v || '$gt' in v || '$gte' in v || '$lte' in v)) {
      if (row[k] === null || row[k] === undefined) return false;
      const rv = new Date(row[k]).getTime();
      if ('$lt' in v && !(rv < new Date(v.$lt).getTime())) return false;
      if ('$gt' in v && !(rv > new Date(v.$gt).getTime())) return false;
      if ('$gte' in v && !(rv >= new Date(v.$gte).getTime())) return false;
      if ('$lte' in v && !(rv <= new Date(v.$lte).getTime())) return false;
      continue;
    }
    if (String(row[k]) !== String(v)) return false;
  }
  return true;
}

const SILENT_LOGGER = { error: () => {}, warn: () => {}, info: () => {} };

// Model factories with their invariants

function buildCaseModel() {
  const M = buildModel({
    invariants() {
      if (this.finalCheckIn && this.finalCheckOut) {
        if (new Date(this.finalCheckOut).getTime() < new Date(this.finalCheckIn).getTime()) {
          this.invalidate('finalCheckOut', '>= finalCheckIn');
        }
      }
      if (this.status === 'locked' && !this.lockedByPayrollPeriodId) {
        this.invalidate('lockedByPayrollPeriodId', 'required');
      }
      if (this.conflictType === reg.RECONCILIATION_CONFLICT.NONE && this.resolverNote) {
        this.invalidate('resolverNote', 'NONE must not carry resolverNote');
      }
    },
  });
  M._unique = [['employeeId', 'shiftDate']];
  return M;
}

function buildPeriodModel() {
  const M = buildModel({
    invariants() {
      if (
        this.startDate &&
        this.endDate &&
        new Date(this.endDate).getTime() <= new Date(this.startDate).getTime()
      ) {
        this.invalidate('endDate', '> startDate');
      }
      if (this.status === reg.PAYROLL_PERIOD_STATUS.CLOSED) {
        if (!this.closedAt) this.invalidate('closedAt', 'required');
        if (!this.closedBy) this.invalidate('closedBy', 'required');
        if (!this.closeSnapshotHash) this.invalidate('closeSnapshotHash', 'required');
      }
      if (this.status === reg.PAYROLL_PERIOD_STATUS.OPEN) {
        if (this.closedAt || this.closedBy || this.closeSnapshotHash) {
          this.invalidate('closedAt', 'open must not carry close metadata');
        }
      }
    },
  });
  M._unique = [['branchId', 'periodCode']];
  return M;
}

function buildOverrideModel() {
  return buildModel({
    invariants() {
      if (typeof this.reason !== 'string' || this.reason.trim().length < 10) {
        this.invalidate('reason', 'min 10 chars');
      }
      if (this.state === 'executed') {
        if (!this.executedAt) this.invalidate('executedAt', 'required');
        if (!this.nafathSignatureId) this.invalidate('nafathSignatureId', 'required');
        const hasHr =
          Array.isArray(this.approverChain) &&
          this.approverChain.some(
            s => s.step === reg.PAYROLL_OVERRIDE_APPROVAL.HR_MANAGER && s.decision === 'approved'
          );
        if (!hasHr) this.invalidate('approverChain', 'HR_MANAGER approval required');
      }
    },
  });
}

function buildSourceEventModel() {
  return buildModel({
    invariants() {
      if (this.accepted && !this.sourceRefId) this.invalidate('sourceRefId', 'required');
      if (this.accepted === false && !this.reasonIfRejected) {
        this.invalidate('reasonIfRejected', 'required');
      }
    },
  });
}

function buildReviewModel() {
  return buildModel();
}

// ─── 1. Registry pure helpers ──────────────────────────────────

describe('hikvision.registry — Phase 4 pure helpers', () => {
  test('classifyCheckIn — on time within grace window', () => {
    const shift = {
      startAt: new Date('2026-05-18T08:00:00Z'),
      endAt: new Date('2026-05-18T16:00:00Z'),
    };
    const r = reg.classifyCheckIn(new Date('2026-05-18T08:05:00Z'), shift);
    expect(r.classification).toBe(reg.SHIFT_CLASSIFICATION.ON_TIME);
    expect(r.deltaMin).toBe(5);
  });

  test('classifyCheckIn — late beyond grace', () => {
    const shift = {
      startAt: new Date('2026-05-18T08:00:00Z'),
      endAt: new Date('2026-05-18T16:00:00Z'),
    };
    const r = reg.classifyCheckIn(new Date('2026-05-18T08:25:00Z'), shift);
    expect(r.classification).toBe(reg.SHIFT_CLASSIFICATION.LATE);
    expect(r.deltaMin).toBe(25);
  });

  test('classifyCheckIn — early arrival', () => {
    const shift = {
      startAt: new Date('2026-05-18T08:00:00Z'),
      endAt: new Date('2026-05-18T16:00:00Z'),
    };
    const r = reg.classifyCheckIn(new Date('2026-05-18T07:45:00Z'), shift);
    expect(r.classification).toBe(reg.SHIFT_CLASSIFICATION.EARLY);
    expect(r.deltaMin).toBe(-15);
  });

  test('classifyCheckOut — overtime', () => {
    const shift = {
      startAt: new Date('2026-05-18T08:00:00Z'),
      endAt: new Date('2026-05-18T16:00:00Z'),
    };
    const r = reg.classifyCheckOut(new Date('2026-05-18T17:00:00Z'), shift);
    expect(r.classification).toBe(reg.SHIFT_CLASSIFICATION.OVERTIME);
    expect(r.deltaMin).toBe(60);
  });

  test('classifyCheckOut — early-out', () => {
    const shift = {
      startAt: new Date('2026-05-18T08:00:00Z'),
      endAt: new Date('2026-05-18T16:00:00Z'),
    };
    const r = reg.classifyCheckOut(new Date('2026-05-18T15:30:00Z'), shift);
    expect(r.classification).toBe(reg.SHIFT_CLASSIFICATION.EARLY_OUT);
    expect(r.deltaMin).toBe(-30);
  });

  test('findCorroborationPairs — fingerprint + face within 30s pairs up', () => {
    const evs = [
      {
        _id: 'a',
        source: reg.ATTENDANCE_SOURCE.FINGERPRINT,
        eventTime: new Date('2026-05-18T08:00:00Z'),
      },
      {
        _id: 'b',
        source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
        eventTime: new Date('2026-05-18T08:00:15Z'),
      },
      {
        _id: 'c',
        source: reg.ATTENDANCE_SOURCE.CAMERA_PASSIVE,
        eventTime: new Date('2026-05-18T08:05:00Z'),
      },
    ];
    const { pairs, unpaired } = reg.findCorroborationPairs(evs);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].primary._id).toBe('a');
    expect(pairs[0].corroborator._id).toBe('b');
    expect(unpaired).toHaveLength(1);
    expect(unpaired[0]._id).toBe('c');
  });

  test('findCorroborationPairs — events of same source do NOT pair', () => {
    const evs = [
      {
        _id: 'a',
        source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
        eventTime: new Date('2026-05-18T08:00:00Z'),
      },
      {
        _id: 'b',
        source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
        eventTime: new Date('2026-05-18T08:00:15Z'),
      },
    ];
    const { pairs, unpaired } = reg.findCorroborationPairs(evs);
    expect(pairs).toHaveLength(0);
    expect(unpaired).toHaveLength(2);
  });

  test('dedupByZoneWindow — same zone within 60s keeps highest trust tier', () => {
    const evs = [
      {
        _id: 'a',
        zoneId: 'z1',
        trustTier: 3,
        eventTime: new Date('2026-05-18T08:00:00Z'),
      },
      {
        _id: 'b',
        zoneId: 'z1',
        trustTier: 1,
        eventTime: new Date('2026-05-18T08:00:20Z'),
      },
      {
        _id: 'c',
        zoneId: 'z1',
        trustTier: 3,
        eventTime: new Date('2026-05-18T08:02:00Z'), // outside 60s window
      },
    ];
    const kept = reg.dedupByZoneWindow(evs);
    // b replaces a (higher trust), c stays
    expect(kept).toHaveLength(2);
    expect(kept.find(e => e._id === 'a')).toBeUndefined();
    expect(kept.find(e => e._id === 'b')).toBeDefined();
    expect(kept.find(e => e._id === 'c')).toBeDefined();
  });
});

// ─── 2-3. Reconciliation service ───────────────────────────────

describe('attendance-reconciliation.service', () => {
  function setup() {
    const caseModel = buildCaseModel();
    const sourceEventModel = buildSourceEventModel();
    const svc = createAttendanceReconciliationService({
      caseModel,
      sourceEventModel,
      logger: SILENT_LOGGER,
    });
    return { svc, caseModel, sourceEventModel };
  }

  function seedEvent(model, opts) {
    const e = {
      _id: opts.id,
      employeeId: opts.employeeId || 'emp-1',
      branchId: opts.branchId || 'br-1',
      zoneId: opts.zoneId || 'z1',
      eventTime: opts.eventTime,
      source: opts.source || reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      trustTier: opts.trustTier || reg.TRUST_TIER.TIER_2,
      accepted: true,
      sourceRefId: opts.sourceRefId || `pe-${opts.id}`,
    };
    model._store.push(e);
    return e;
  }

  test('reconcileEmployeeDay — single event → MISSING_CHECKOUT', async () => {
    const { svc, sourceEventModel } = setup();
    seedEvent(sourceEventModel, { id: 'e1', eventTime: new Date('2026-05-18T08:00:00Z') });
    const r = await svc.reconcileEmployeeDay({
      employeeId: 'emp-1',
      shiftDate: new Date('2026-05-18T00:00:00Z'),
      branchId: 'br-1',
    });
    expect(r.ok).toBe(true);
    expect(r.conflict).toBe(reg.RECONCILIATION_CONFLICT.MISSING_CHECKOUT);
    expect(r.case.finalCheckIn).toBeTruthy();
    expect(r.case.finalCheckOut).toBeNull();
  });

  test('reconcileEmployeeDay — two events same source → resolves cleanly with NONE conflict', async () => {
    const { svc, sourceEventModel } = setup();
    seedEvent(sourceEventModel, { id: 'in', eventTime: new Date('2026-05-18T08:00:00Z') });
    seedEvent(sourceEventModel, {
      id: 'out',
      eventTime: new Date('2026-05-18T16:05:00Z'),
      zoneId: 'z1',
    });
    const r = await svc.reconcileEmployeeDay({
      employeeId: 'emp-1',
      shiftDate: new Date('2026-05-18T00:00:00Z'),
      branchId: 'br-1',
    });
    expect(r.ok).toBe(true);
    expect(r.conflict).toBe(reg.RECONCILIATION_CONFLICT.NONE);
    expect(r.case.totalMinutes).toBeGreaterThan(0);
    expect(r.case.status).toBe('resolved');
  });

  test('reconcileEmployeeDay — events in different branches → IMPOSSIBLE_TRAVEL', async () => {
    const { svc, sourceEventModel } = setup();
    seedEvent(sourceEventModel, {
      id: 'a',
      branchId: 'br-A',
      eventTime: new Date('2026-05-18T08:00:00Z'),
    });
    seedEvent(sourceEventModel, {
      id: 'b',
      branchId: 'br-B',
      eventTime: new Date('2026-05-18T08:05:00Z'),
    });
    const r = await svc.reconcileEmployeeDay({
      employeeId: 'emp-1',
      shiftDate: new Date('2026-05-18T00:00:00Z'),
      branchId: 'br-A',
    });
    expect(r.ok).toBe(true);
    expect(r.conflict).toBe(reg.RECONCILIATION_CONFLICT.IMPOSSIBLE_TRAVEL);
  });

  test('reconcileEmployeeDay — no events → NO_EVENTS case opened', async () => {
    const { svc } = setup();
    const r = await svc.reconcileEmployeeDay({
      employeeId: 'emp-X',
      shiftDate: new Date('2026-05-18T00:00:00Z'),
      branchId: 'br-1',
    });
    expect(r.ok).toBe(true);
    expect(r.conflict).toBe(reg.RECONCILIATION_CONFLICT.NO_EVENTS);
    expect(r.case.totalMinutes).toBe(0);
  });

  test('reconcileBranchDay — processes all employees with events', async () => {
    const { svc, sourceEventModel } = setup();
    seedEvent(sourceEventModel, {
      id: 'e1',
      employeeId: 'emp-A',
      eventTime: new Date('2026-05-18T08:00:00Z'),
    });
    seedEvent(sourceEventModel, {
      id: 'e2',
      employeeId: 'emp-A',
      eventTime: new Date('2026-05-18T16:00:00Z'),
    });
    seedEvent(sourceEventModel, {
      id: 'e3',
      employeeId: 'emp-B',
      eventTime: new Date('2026-05-18T08:30:00Z'),
    });

    const r = await svc.reconcileBranchDay({
      branchId: 'br-1',
      shiftDate: new Date('2026-05-18T00:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.processed).toBe(2);
    expect(r.runs).toHaveLength(2);
  });

  test('resolveConflict — operator sets finalCheckIn/Out + note', async () => {
    const { svc, sourceEventModel, caseModel } = setup();
    seedEvent(sourceEventModel, { id: 'e1', eventTime: new Date('2026-05-18T08:00:00Z') });
    const made = await svc.reconcileEmployeeDay({
      employeeId: 'emp-1',
      shiftDate: new Date('2026-05-18T00:00:00Z'),
      branchId: 'br-1',
    });
    const r = await svc.resolveConflict(made.case._id, {
      actor: { userId: 'sup-1', role: 'branch_manager' },
      finalCheckOut: new Date('2026-05-18T16:30:00Z'),
      note: 'manually entered missing check-out from CCTV review',
    });
    expect(r.ok).toBe(true);
    expect(r.case.status).toBe('resolved');
    expect(r.case.resolverNote).toContain('manually entered');
    expect(r.case.finalCheckOut).toBeTruthy();
    void caseModel;
  });

  test('resolveConflict — missing note → VALIDATION_FAILED', async () => {
    const { svc, sourceEventModel } = setup();
    seedEvent(sourceEventModel, { id: 'e1', eventTime: new Date('2026-05-18T08:00:00Z') });
    const made = await svc.reconcileEmployeeDay({
      employeeId: 'emp-1',
      shiftDate: new Date('2026-05-18T00:00:00Z'),
      branchId: 'br-1',
    });
    const r = await svc.resolveConflict(made.case._id, {
      actor: { userId: 'sup-1' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });
});

// ─── 4-5. PayrollPeriod service ────────────────────────────────

describe('payroll-period.service — periods', () => {
  function setup() {
    const periodModel = buildPeriodModel();
    const caseModel = buildCaseModel();
    const overrideModel = buildOverrideModel();
    const sourceEventModel = buildSourceEventModel();
    const svc = createPayrollPeriodService({
      periodModel,
      caseModel,
      overrideModel,
      sourceEventModel,
      logger: SILENT_LOGGER,
    });
    return { svc, periodModel, caseModel, overrideModel, sourceEventModel };
  }

  test('createPeriod — happy path', async () => {
    const { svc } = setup();
    const r = await svc.createPeriod({
      periodCode: '2026-05',
      branchId: 'br-1',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-01'),
    });
    expect(r.ok).toBe(true);
    expect(r.period.status).toBe(reg.PAYROLL_PERIOD_STATUS.OPEN);
  });

  test('createPeriod — endDate <= startDate → VALIDATION_FAILED', async () => {
    const { svc } = setup();
    const r = await svc.createPeriod({
      periodCode: '2026-05',
      startDate: new Date('2026-05-31'),
      endDate: new Date('2026-05-01'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('createPeriod — overlapping period → PAYROLL_PERIOD_OVERLAP', async () => {
    const { svc } = setup();
    await svc.createPeriod({
      periodCode: '2026-05',
      branchId: 'br-1',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-01'),
    });
    const r = await svc.createPeriod({
      periodCode: '2026-05-alt',
      branchId: 'br-1',
      startDate: new Date('2026-05-15'),
      endDate: new Date('2026-06-15'),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.PAYROLL_PERIOD_OVERLAP);
  });

  test('closePeriod — cascade locks reconciliation cases + source events', async () => {
    const { svc, periodModel, caseModel, sourceEventModel } = setup();
    const p = await svc.createPeriod({
      periodCode: '2026-05',
      branchId: 'br-1',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-01'),
    });

    // Seed cases inside the period
    caseModel._store.push(
      {
        _id: 'c1',
        employeeId: 'e1',
        branchId: 'br-1',
        shiftDate: new Date('2026-05-15'),
        status: 'resolved',
        totalMinutes: 480,
        overtimeMinutes: 0,
        finalCheckIn: new Date('2026-05-15T08:00:00Z'),
        finalCheckOut: new Date('2026-05-15T16:00:00Z'),
        conflictType: reg.RECONCILIATION_CONFLICT.NONE,
      },
      {
        _id: 'c2',
        employeeId: 'e2',
        branchId: 'br-1',
        shiftDate: new Date('2026-05-20'),
        status: 'resolved',
        totalMinutes: 510,
        overtimeMinutes: 30,
        finalCheckIn: new Date('2026-05-20T08:00:00Z'),
        finalCheckOut: new Date('2026-05-20T16:30:00Z'),
        conflictType: reg.RECONCILIATION_CONFLICT.NONE,
      }
    );

    // Seed source events inside the period
    sourceEventModel._store.push(
      {
        _id: 'se1',
        employeeId: 'e1',
        branchId: 'br-1',
        eventTime: new Date('2026-05-15T08:00:00Z'),
        accepted: true,
        sourceRefId: 'r1',
        source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
        trustTier: 2,
      },
      {
        _id: 'se2',
        employeeId: 'e1',
        branchId: 'br-1',
        eventTime: new Date('2026-05-15T16:00:00Z'),
        accepted: true,
        sourceRefId: 'r2',
        source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
        trustTier: 2,
      }
    );

    const r = await svc.closePeriod(p.period._id, {
      actor: { userId: 'payroll-mgr', role: 'payroll_manager' },
    });
    expect(r.ok).toBe(true);
    expect(r.casesLocked).toBe(2);
    expect(r.sourceEventsLocked).toBe(2);
    expect(r.snapshotHash).toMatch(/^[a-f0-9]{64}$/);

    // Verify cases are now locked
    const c1 = caseModel._store.find(c => c._id === 'c1');
    expect(c1.status).toBe('locked');
    expect(String(c1.lockedByPayrollPeriodId)).toBe(String(p.period._id));
    expect(c1.lockSnapshotHash).toMatch(/^[a-f0-9]{64}$/);

    // Verify source events tagged
    const se1 = sourceEventModel._store.find(s => s._id === 'se1');
    expect(String(se1.lockedByPayrollPeriodId)).toBe(String(p.period._id));

    // Verify period is closed with metadata
    const period = periodModel._store.find(pp => pp._id === p.period._id);
    expect(period.status).toBe(reg.PAYROLL_PERIOD_STATUS.CLOSED);
    expect(period.closedAt).toBeTruthy();
    expect(period.closedBy).toBe('payroll-mgr');
    expect(period.casesCounted).toBe(2);
  });

  test('closePeriod — already closed → PAYROLL_PERIOD_ALREADY_CLOSED', async () => {
    const { svc } = setup();
    const p = await svc.createPeriod({
      periodCode: '2026-06',
      branchId: 'br-1',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-07-01'),
    });
    await svc.closePeriod(p.period._id, {
      actor: { userId: 'm', role: 'payroll_manager' },
    });
    const r = await svc.closePeriod(p.period._id, {
      actor: { userId: 'm', role: 'payroll_manager' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.PAYROLL_PERIOD_ALREADY_CLOSED);
  });

  test('reopenPeriod — flips closed → open + unlocks cases', async () => {
    const { svc, periodModel, caseModel } = setup();
    const p = await svc.createPeriod({
      periodCode: '2026-07',
      branchId: 'br-1',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-08-01'),
    });
    caseModel._store.push({
      _id: 'cr',
      employeeId: 'e1',
      branchId: 'br-1',
      shiftDate: new Date('2026-07-10'),
      status: 'resolved',
      totalMinutes: 480,
      overtimeMinutes: 0,
      finalCheckIn: new Date('2026-07-10T08:00:00Z'),
      finalCheckOut: new Date('2026-07-10T16:00:00Z'),
      conflictType: reg.RECONCILIATION_CONFLICT.NONE,
    });
    await svc.closePeriod(p.period._id, {
      actor: { userId: 'm', role: 'payroll_manager' },
    });

    const r = await svc.reopenPeriod(p.period._id, {
      actor: { userId: 'chro', role: 'chro' },
      reason: 'finance audit flagged a calculation error before pay distribution',
    });
    expect(r.ok).toBe(true);
    expect(r.casesUnlocked).toBe(1);

    const period = periodModel._store.find(pp => pp._id === p.period._id);
    expect(period.status).toBe(reg.PAYROLL_PERIOD_STATUS.OPEN);
    expect(period.closedAt).toBeNull();
    expect(period.closeSnapshotHash).toBeNull();

    const c = caseModel._store.find(cc => cc._id === 'cr');
    expect(c.lockedByPayrollPeriodId).toBeNull();
  });

  test('reopenPeriod — short reason → VALIDATION_FAILED', async () => {
    const { svc } = setup();
    const p = await svc.createPeriod({
      periodCode: '2026-08',
      branchId: 'br-1',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-09-01'),
    });
    await svc.closePeriod(p.period._id, { actor: { userId: 'm', role: 'payroll_manager' } });

    const r = await svc.reopenPeriod(p.period._id, {
      actor: { userId: 'chro', role: 'chro' },
      reason: 'short',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
  });

  test('findLockingPeriod returns the closed period when event falls inside', async () => {
    const { svc } = setup();
    const p = await svc.createPeriod({
      periodCode: '2026-09',
      branchId: 'br-1',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-10-01'),
    });
    await svc.closePeriod(p.period._id, { actor: { userId: 'm', role: 'payroll_manager' } });

    const locking = await svc.findLockingPeriod({
      eventTime: new Date('2026-09-15T10:00:00Z'),
      branchId: 'br-1',
    });
    expect(locking).toBeTruthy();
    expect(String(locking._id)).toBe(String(p.period._id));

    // Outside the closed period — no lock
    const none = await svc.findLockingPeriod({
      eventTime: new Date('2026-10-15T10:00:00Z'),
      branchId: 'br-1',
    });
    expect(none).toBeNull();
  });
});

// ─── 6. Payroll override flow ──────────────────────────────────

describe('payroll-period.service — overrides', () => {
  async function setupWithClosedPeriod() {
    const periodModel = buildPeriodModel();
    const caseModel = buildCaseModel();
    const overrideModel = buildOverrideModel();
    const sourceEventModel = buildSourceEventModel();
    const svc = createPayrollPeriodService({
      periodModel,
      caseModel,
      overrideModel,
      sourceEventModel,
      logger: SILENT_LOGGER,
    });

    const p = await svc.createPeriod({
      periodCode: '2026-05',
      branchId: 'br-1',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-01'),
    });
    caseModel._store.push({
      _id: 'c-ovr',
      employeeId: 'e1',
      branchId: 'br-1',
      shiftDate: new Date('2026-05-15'),
      status: 'resolved',
      totalMinutes: 480,
      overtimeMinutes: 0,
      finalCheckIn: new Date('2026-05-15T08:00:00Z'),
      finalCheckOut: new Date('2026-05-15T16:00:00Z'),
      conflictType: reg.RECONCILIATION_CONFLICT.NONE,
    });
    await svc.closePeriod(p.period._id, {
      actor: { userId: 'm', role: 'payroll_manager' },
    });
    return { svc, periodModel, caseModel, overrideModel, periodId: p.period._id };
  }

  test('draftOverride → addApprover (HR approved) → executeOverride with Nafath', async () => {
    const { svc, periodId, overrideModel } = await setupWithClosedPeriod();

    const draft = await svc.draftOverride({
      payrollPeriodId: periodId,
      reconciliationCaseId: 'c-ovr',
      afterSnapshot: {
        finalCheckIn: new Date('2026-05-15T08:00:00Z'),
        finalCheckOut: new Date('2026-05-15T17:00:00Z'),
        totalMinutes: 540, // +60 min OT correction
        overtimeMinutes: 60,
      },
      reason: 'employee worked overtime, evidence in CCTV review',
      actor: { userId: 'hr-dir', role: 'hr_director' },
    });
    expect(draft.ok).toBe(true);
    expect(draft.override.state).toBe('draft');
    expect(draft.override.netDeltaMinutes).toBe(60);

    const approved = await svc.addApprover(draft.override._id, {
      step: reg.PAYROLL_OVERRIDE_APPROVAL.HR_MANAGER,
      actor: { userId: 'hr-mgr', role: 'hr_director' },
      decision: 'approved',
      note: 'verified',
      nafathSignatureId: 'naf-hr-1',
    });
    expect(approved.ok).toBe(true);
    expect(approved.override.state).toBe('pending-approval');

    // Missing Nafath signature on execute → PAYROLL_OVERRIDE_NAFATH_REQUIRED
    const noNafath = await svc.executeOverride(draft.override._id, {
      actor: { userId: 'hr-dir', role: 'hr_director' },
    });
    expect(noNafath.ok).toBe(false);
    expect(noNafath.reason).toBe(reg.REASON.PAYROLL_OVERRIDE_NAFATH_REQUIRED);

    const ok = await svc.executeOverride(draft.override._id, {
      actor: { userId: 'hr-dir', role: 'hr_director' },
      nafathSignatureId: 'naf-exec-1',
    });
    expect(ok.ok).toBe(true);
    expect(ok.override.state).toBe('executed');
    expect(ok.override.executedAt).toBeTruthy();
    expect(ok.override.nafathSignatureId).toBe('naf-exec-1');
    void overrideModel;
  });

  test('draftOverride — reason too short → PAYROLL_OVERRIDE_REASON_REQUIRED', async () => {
    const { svc, periodId } = await setupWithClosedPeriod();
    const r = await svc.draftOverride({
      payrollPeriodId: periodId,
      reconciliationCaseId: 'c-ovr',
      afterSnapshot: { totalMinutes: 540, overtimeMinutes: 60 },
      reason: 'short',
      actor: { userId: 'hr-dir', role: 'hr_director' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.PAYROLL_OVERRIDE_REASON_REQUIRED);
  });

  test('executeOverride — finance-only approval (no HR) → PAYROLL_OVERRIDE_APPROVER_CHAIN_INCOMPLETE', async () => {
    const { svc, periodId } = await setupWithClosedPeriod();
    const draft = await svc.draftOverride({
      payrollPeriodId: periodId,
      reconciliationCaseId: 'c-ovr',
      afterSnapshot: { totalMinutes: 540, overtimeMinutes: 60 },
      reason: 'employee worked overtime, evidence in CCTV review',
      actor: { userId: 'hr-dir', role: 'hr_director' },
    });
    // Add a FINANCE approval but NOT an HR approval → state moves to
    // pending-approval, but executing should fail the HR-required check
    await svc.addApprover(draft.override._id, {
      step: reg.PAYROLL_OVERRIDE_APPROVAL.FINANCE,
      actor: { userId: 'fin-dir', role: 'finance_director' },
      decision: 'approved',
      note: 'finance ok',
    });
    const r = await svc.executeOverride(draft.override._id, {
      actor: { userId: 'hr-dir', role: 'hr_director' },
      nafathSignatureId: 'naf-1',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.PAYROLL_OVERRIDE_APPROVER_CHAIN_INCOMPLETE);
  });
});

// ─── 7. Lock protection on attendance-source ───────────────────

describe('attendance-source.service + payroll-period — lock protection', () => {
  test('createSourceEvent — refuses event with eventTime inside closed period', async () => {
    const periodModel = buildPeriodModel();
    const caseModel = buildCaseModel();
    const overrideModel = buildOverrideModel();
    const sourceEventModel = buildSourceEventModel();
    const reviewModel = buildReviewModel();

    const payrollSvc = createPayrollPeriodService({
      periodModel,
      caseModel,
      overrideModel,
      sourceEventModel,
      logger: SILENT_LOGGER,
    });
    const sourceSvc = createAttendanceSourceService({
      sourceEventModel,
      reviewModel,
      payrollPeriodService: payrollSvc,
      logger: SILENT_LOGGER,
    });

    // Open period, close it
    const p = await payrollSvc.createPeriod({
      periodCode: '2026-05',
      branchId: 'br-1',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-01'),
    });
    await payrollSvc.closePeriod(p.period._id, {
      actor: { userId: 'm', role: 'payroll_manager' },
    });

    // Try to insert a source event inside the closed window
    const r = await sourceSvc.createSourceEvent({
      employeeId: 'emp-X',
      branchId: 'br-1',
      eventTime: new Date('2026-05-15T10:00:00Z'),
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      sourceRefId: 'late-pe-1',
      trustTier: reg.TRUST_TIER.TIER_2,
      accepted: true,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.PAYROLL_PERIOD_LOCKED);
    expect(r.errors.periodCode).toBe('2026-05');
  });

  test('createSourceEvent — outside closed period works fine', async () => {
    const periodModel = buildPeriodModel();
    const caseModel = buildCaseModel();
    const overrideModel = buildOverrideModel();
    const sourceEventModel = buildSourceEventModel();
    const reviewModel = buildReviewModel();

    const payrollSvc = createPayrollPeriodService({
      periodModel,
      caseModel,
      overrideModel,
      sourceEventModel,
      logger: SILENT_LOGGER,
    });
    const sourceSvc = createAttendanceSourceService({
      sourceEventModel,
      reviewModel,
      payrollPeriodService: payrollSvc,
      logger: SILENT_LOGGER,
    });

    const p = await payrollSvc.createPeriod({
      periodCode: '2026-05',
      branchId: 'br-1',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-01'),
    });
    await payrollSvc.closePeriod(p.period._id, {
      actor: { userId: 'm', role: 'payroll_manager' },
    });

    const r = await sourceSvc.createSourceEvent({
      employeeId: 'emp-X',
      branchId: 'br-1',
      eventTime: new Date('2026-06-15T10:00:00Z'), // outside closed period
      source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
      sourceRefId: 'pe-OK',
      trustTier: reg.TRUST_TIER.TIER_2,
      accepted: true,
    });
    expect(r.ok).toBe(true);
  });
});

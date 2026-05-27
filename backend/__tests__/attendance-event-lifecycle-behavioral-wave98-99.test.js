'use strict';

/**
 * Behavioral counterpart for the attendance event-lifecycle trio:
 *   • AttendanceSourceEvent       (Wave 98 Phase 3)
 *   • AttendanceReconciliationCase (Wave 99 Phase 4)
 *   • AttendancePayrollOverride    (Wave 99 Phase 4)
 *
 * Pairing doctrine: static drift guards catch source-text shape but
 * not runtime behavior. These instantiate against MongoMemoryServer
 * and exercise every Wave-18 `__invariants` rule end-to-end so the
 * regex-passes-but-validator-doesn't-fire class is covered.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.unmock('../intelligence/attendance.registry');
jest.setTimeout(45000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const reg = require('../intelligence/hikvision.registry');
const attReg = require('../intelligence/attendance.registry');

let mongod;
let SourceEvent;
let ReconCase;
let Override;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w98-w99-event-lifecycle' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  SourceEvent = require('../models/AttendanceSourceEvent');
  ReconCase = require('../models/AttendanceReconciliationCase');
  Override = require('../models/AttendancePayrollOverride');
  await SourceEvent.init().catch(() => null);
  await ReconCase.init().catch(() => null);
  await Override.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await SourceEvent.deleteMany({});
  await ReconCase.deleteMany({});
  await Override.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ════════════════════════════════════════════════════════════════════
//  AttendanceSourceEvent (W98)
// ════════════════════════════════════════════════════════════════════

describe('AttendanceSourceEvent — Wave-18 invariants', () => {
  const baseEvent = (overrides = {}) => ({
    employeeId: oid(),
    branchId: oid(),
    eventTime: new Date(),
    source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
    trustTier: reg.TRUST_TIER.TIER_2,
    accepted: true,
    sourceRefId: 'hk-event-001',
    ...overrides,
  });

  it('rejects accepted events that lack sourceRefId', async () => {
    const ev = new SourceEvent(baseEvent({ sourceRefId: null }));
    await expect(ev.save()).rejects.toThrow(/sourceRefId/);
  });

  it('rejects rejected events that lack reasonIfRejected', async () => {
    const ev = new SourceEvent(
      baseEvent({ accepted: false, reasonIfRejected: null, sourceRefId: null })
    );
    await expect(ev.save()).rejects.toThrow(/reasonIfRejected/);
  });

  it('accepts a rejected event with reasonIfRejected', async () => {
    const ev = new SourceEvent(
      baseEvent({
        accepted: false,
        sourceRefId: null,
        reasonIfRejected: 'confidence below auto-accept floor',
      })
    );
    await expect(ev.save()).resolves.toBeDefined();
  });

  it('rejects supervisor-override events without auditChain.actorId', async () => {
    const ev = new SourceEvent(
      baseEvent({
        source: attReg.SOURCE_KIND.SUPERVISOR_OVERRIDE,
        trustTier: reg.TRUST_TIER.TIER_2,
        sourceRefId: 'sup-override-1',
      })
    );
    await expect(ev.save()).rejects.toThrow(/actorId/);
  });

  it('rejects manual events without auditChain.actorId', async () => {
    const ev = new SourceEvent(
      baseEvent({
        source: attReg.SOURCE_KIND.MANUAL,
        trustTier: reg.TRUST_TIER.TIER_3,
        sourceRefId: 'manual-1',
      })
    );
    await expect(ev.save()).rejects.toThrow(/actorId/);
  });

  it('accepts manual events when auditChain.actorId is set', async () => {
    const ev = new SourceEvent(
      baseEvent({
        source: attReg.SOURCE_KIND.MANUAL,
        trustTier: reg.TRUST_TIER.TIER_3,
        sourceRefId: 'manual-1',
        auditChain: { actorId: oid(), actorRole: 'supervisor' },
      })
    );
    await expect(ev.save()).resolves.toBeDefined();
  });

  it('rejects mobile-gps events without geo.lat + lng', async () => {
    const ev = new SourceEvent(
      baseEvent({
        source: attReg.SOURCE_KIND.MOBILE_GPS,
        trustTier: reg.TRUST_TIER.TIER_3,
        sourceRefId: 'mobile-1',
      })
    );
    await expect(ev.save()).rejects.toThrow(/geo/);
  });

  it('accepts mobile-gps events with geo coordinates', async () => {
    const ev = new SourceEvent(
      baseEvent({
        source: attReg.SOURCE_KIND.MOBILE_GPS,
        trustTier: reg.TRUST_TIER.TIER_3,
        sourceRefId: 'mobile-2',
        geo: { lat: 24.7136, lng: 46.6753, accuracyM: 8, insideGeofence: true },
      })
    );
    await expect(ev.save()).resolves.toBeDefined();
  });

  it('enforces required employeeId', async () => {
    const ev = new SourceEvent(baseEvent({ employeeId: undefined }));
    await expect(ev.save()).rejects.toThrow(/employeeId/);
  });

  it('enforces required branchId', async () => {
    const ev = new SourceEvent(baseEvent({ branchId: undefined }));
    await expect(ev.save()).rejects.toThrow(/branchId/);
  });

  it('enforces required eventTime', async () => {
    const ev = new SourceEvent(baseEvent({ eventTime: undefined }));
    await expect(ev.save()).rejects.toThrow(/eventTime/);
  });

  it('enforces source enum membership', async () => {
    const ev = new SourceEvent(baseEvent({ source: 'astral-projection' }));
    await expect(ev.save()).rejects.toThrow(/source/);
  });

  it('enforces trustTier enum membership', async () => {
    const ev = new SourceEvent(baseEvent({ trustTier: 99 }));
    await expect(ev.save()).rejects.toThrow(/trustTier/);
  });

  it('enforces confidence ∈ [0,100]', async () => {
    const ev = new SourceEvent(baseEvent({ confidence: 150 }));
    await expect(ev.save()).rejects.toThrow(/confidence/);
  });

  it('persists default eventKind = UNKNOWN when omitted', async () => {
    const ev = await new SourceEvent(baseEvent()).save();
    expect(ev.eventKind).toBe(reg.ATTENDANCE_EVENT_KIND.UNKNOWN);
  });

  it('persists default accepted = true and empty flags', async () => {
    const ev = await new SourceEvent(baseEvent()).save();
    expect(ev.accepted).toBe(true);
    expect(Array.isArray(ev.flags) && ev.flags.length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════
//  AttendanceReconciliationCase (W99)
// ════════════════════════════════════════════════════════════════════

describe('AttendanceReconciliationCase — Wave-18 invariants', () => {
  const baseCase = (overrides = {}) => ({
    employeeId: oid(),
    branchId: oid(),
    shiftDate: new Date('2026-05-27T00:00:00.000Z'),
    conflictType: reg.RECONCILIATION_CONFLICT.NONE,
    status: 'open',
    ...overrides,
  });

  it('rejects finalCheckOut < finalCheckIn', async () => {
    const c = new ReconCase(
      baseCase({
        finalCheckIn: new Date('2026-05-27T17:00:00Z'),
        finalCheckOut: new Date('2026-05-27T08:00:00Z'),
      })
    );
    await expect(c.save()).rejects.toThrow(/finalCheckOut/);
  });

  it('accepts finalCheckOut > finalCheckIn', async () => {
    const c = new ReconCase(
      baseCase({
        finalCheckIn: new Date('2026-05-27T08:00:00Z'),
        finalCheckOut: new Date('2026-05-27T17:00:00Z'),
        totalMinutes: 540,
      })
    );
    await expect(c.save()).resolves.toBeDefined();
  });

  it('rejects resolved status on MULTI_SOURCE_DISAGREEMENT without resolverId', async () => {
    const c = new ReconCase(
      baseCase({
        conflictType: reg.RECONCILIATION_CONFLICT.MULTI_SOURCE_DISAGREEMENT,
        status: 'resolved',
      })
    );
    await expect(c.save()).rejects.toThrow(/resolverId/);
  });

  it('rejects resolved status on IMPOSSIBLE_TRAVEL without resolvedAt', async () => {
    const c = new ReconCase(
      baseCase({
        conflictType: reg.RECONCILIATION_CONFLICT.IMPOSSIBLE_TRAVEL,
        status: 'resolved',
        resolverId: oid(),
        resolvedAt: null,
      })
    );
    await expect(c.save()).rejects.toThrow(/resolverId/);
  });

  it('accepts resolved conflict with full resolution metadata', async () => {
    const c = new ReconCase(
      baseCase({
        conflictType: reg.RECONCILIATION_CONFLICT.MISSING_CHECKOUT,
        status: 'resolved',
        resolverId: oid(),
        resolvedAt: new Date(),
        resolverNote: 'استخدمت سجل المغادرة من الكاميرا الجانبية',
      })
    );
    await expect(c.save()).resolves.toBeDefined();
  });

  it('rejects locked status without lockedByPayrollPeriodId', async () => {
    const c = new ReconCase(baseCase({ status: 'locked' }));
    await expect(c.save()).rejects.toThrow(/lockedByPayrollPeriodId/);
  });

  it('accepts locked status with payroll period reference', async () => {
    const c = new ReconCase(
      baseCase({
        status: 'locked',
        lockedByPayrollPeriodId: oid(),
        lockedAt: new Date(),
        lockSnapshotHash: 'a'.repeat(64),
      })
    );
    await expect(c.save()).resolves.toBeDefined();
  });

  it('rejects NONE conflict with resolverNote (defense vs tooling)', async () => {
    const c = new ReconCase(
      baseCase({
        conflictType: reg.RECONCILIATION_CONFLICT.NONE,
        resolverNote: 'should not be here',
      })
    );
    await expect(c.save()).rejects.toThrow(/resolverNote/);
  });

  it('enforces required employeeId', async () => {
    const c = new ReconCase(baseCase({ employeeId: undefined }));
    await expect(c.save()).rejects.toThrow(/employeeId/);
  });

  it('enforces required branchId', async () => {
    const c = new ReconCase(baseCase({ branchId: undefined }));
    await expect(c.save()).rejects.toThrow(/branchId/);
  });

  it('enforces required shiftDate', async () => {
    const c = new ReconCase(baseCase({ shiftDate: undefined }));
    await expect(c.save()).rejects.toThrow(/shiftDate/);
  });

  it('enforces status enum membership', async () => {
    const c = new ReconCase(baseCase({ status: 'half-resolved' }));
    await expect(c.save()).rejects.toThrow(/status/);
  });

  it('enforces conflictType enum membership', async () => {
    const c = new ReconCase(baseCase({ conflictType: 'cosmic-flux' }));
    await expect(c.save()).rejects.toThrow(/conflictType/);
  });

  it('enforces compound unique index on (employeeId, shiftDate)', async () => {
    const emp = oid();
    const shiftDate = new Date('2026-05-27T00:00:00.000Z');
    await new ReconCase(baseCase({ employeeId: emp, shiftDate })).save();
    const dup = new ReconCase(baseCase({ employeeId: emp, shiftDate }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('persists default overtimeMinutes = 0 and empty flags', async () => {
    const c = await new ReconCase(baseCase()).save();
    expect(c.overtimeMinutes).toBe(0);
    expect(Array.isArray(c.flags) && c.flags.length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════
//  AttendancePayrollOverride (W99)
// ════════════════════════════════════════════════════════════════════

describe('AttendancePayrollOverride — Wave-18 invariants', () => {
  const baseOverride = (overrides = {}) => ({
    payrollPeriodId: oid(),
    reconciliationCaseId: oid(),
    employeeId: oid(),
    shiftDate: new Date('2026-05-27T00:00:00.000Z'),
    beforeSnapshot: { totalMinutes: 480, overtimeMinutes: 0 },
    afterSnapshot: { totalMinutes: 540, overtimeMinutes: 60 },
    netDeltaMinutes: 60,
    reason: 'الموظف عمل ساعة إضافية لم تُسجل بسبب انقطاع الكاميرا',
    initiatedBy: oid(),
    initiatorRole: 'hr_supervisor',
    state: 'draft',
    ...overrides,
  });

  it('rejects reason shorter than 10 chars', async () => {
    const o = new Override(baseOverride({ reason: 'قصير' }));
    await expect(o.save()).rejects.toThrow(/reason/);
  });

  it('accepts reason ≥10 chars', async () => {
    const o = new Override(baseOverride());
    await expect(o.save()).resolves.toBeDefined();
  });

  it('rejects executed state without executedAt', async () => {
    const o = new Override(
      baseOverride({
        state: 'executed',
        executedAt: null,
        nafathSignatureId: 'naf-sig-1',
        approverChain: [
          {
            step: reg.PAYROLL_OVERRIDE_APPROVAL.HR_MANAGER,
            userId: oid(),
            decision: 'approved',
            decidedAt: new Date(),
          },
        ],
      })
    );
    await expect(o.save()).rejects.toThrow(/executedAt/);
  });

  it('rejects executed state without nafathSignatureId', async () => {
    const o = new Override(
      baseOverride({
        state: 'executed',
        executedAt: new Date(),
        nafathSignatureId: null,
        approverChain: [
          {
            step: reg.PAYROLL_OVERRIDE_APPROVAL.HR_MANAGER,
            userId: oid(),
            decision: 'approved',
            decidedAt: new Date(),
          },
        ],
      })
    );
    await expect(o.save()).rejects.toThrow(/nafathSignatureId/);
  });

  it('rejects executed state without HR_MANAGER approval in chain', async () => {
    const o = new Override(
      baseOverride({
        state: 'executed',
        executedAt: new Date(),
        nafathSignatureId: 'naf-sig-1',
        approverChain: [
          {
            step: reg.PAYROLL_OVERRIDE_APPROVAL.FINANCE,
            userId: oid(),
            decision: 'approved',
            decidedAt: new Date(),
          },
        ],
      })
    );
    await expect(o.save()).rejects.toThrow(/approverChain/);
  });

  it('rejects executed state with HR step but decision=pending', async () => {
    const o = new Override(
      baseOverride({
        state: 'executed',
        executedAt: new Date(),
        nafathSignatureId: 'naf-sig-1',
        approverChain: [
          {
            step: reg.PAYROLL_OVERRIDE_APPROVAL.HR_MANAGER,
            userId: oid(),
            decision: 'pending',
          },
        ],
      })
    );
    await expect(o.save()).rejects.toThrow(/approverChain/);
  });

  it('accepts fully-formed executed override', async () => {
    const o = new Override(
      baseOverride({
        state: 'executed',
        executedAt: new Date(),
        nafathSignatureId: 'naf-tier3-' + Date.now(),
        appliedToNextPeriodId: oid(),
        approverChain: [
          {
            step: reg.PAYROLL_OVERRIDE_APPROVAL.HR_MANAGER,
            userId: oid(),
            decision: 'approved',
            decidedAt: new Date(),
            nafathSignatureId: 'naf-hr-1',
          },
          {
            step: reg.PAYROLL_OVERRIDE_APPROVAL.FINANCE,
            userId: oid(),
            decision: 'approved',
            decidedAt: new Date(),
          },
        ],
      })
    );
    await expect(o.save()).resolves.toBeDefined();
  });

  it('enforces required beforeSnapshot.totalMinutes', async () => {
    const o = new Override(baseOverride({ beforeSnapshot: { overtimeMinutes: 0 } }));
    await expect(o.save()).rejects.toThrow(/totalMinutes/);
  });

  it('enforces required afterSnapshot.totalMinutes', async () => {
    const o = new Override(baseOverride({ afterSnapshot: { overtimeMinutes: 0 } }));
    await expect(o.save()).rejects.toThrow(/totalMinutes/);
  });

  it('enforces required initiatedBy', async () => {
    const o = new Override(baseOverride({ initiatedBy: undefined }));
    await expect(o.save()).rejects.toThrow(/initiatedBy/);
  });

  it('enforces required reason', async () => {
    const o = new Override(baseOverride({ reason: undefined }));
    await expect(o.save()).rejects.toThrow(/reason/);
  });

  it('enforces state enum membership', async () => {
    const o = new Override(baseOverride({ state: 'fast-tracked' }));
    await expect(o.save()).rejects.toThrow(/state/);
  });

  it('enforces approver step enum membership', async () => {
    const o = new Override(
      baseOverride({
        approverChain: [{ step: 'wizard', userId: oid(), decision: 'approved' }],
      })
    );
    await expect(o.save()).rejects.toThrow(/step/);
  });

  it('enforces approver decision enum membership', async () => {
    const o = new Override(
      baseOverride({
        approverChain: [
          {
            step: reg.PAYROLL_OVERRIDE_APPROVAL.HR_MANAGER,
            userId: oid(),
            decision: 'maybe',
          },
        ],
      })
    );
    await expect(o.save()).rejects.toThrow(/decision/);
  });

  it('enforces beforeSnapshot.totalMinutes ≥ 0', async () => {
    const o = new Override(baseOverride({ beforeSnapshot: { totalMinutes: -5 } }));
    await expect(o.save()).rejects.toThrow(/totalMinutes/);
  });

  it('persists default state = draft and empty approverChain', async () => {
    const o = await new Override(baseOverride()).save();
    expect(o.state).toBe('draft');
    expect(Array.isArray(o.approverChain)).toBe(true);
  });

  it('persists default netDeltaMinutes = 0 when omitted', async () => {
    const o = await new Override(baseOverride({ netDeltaMinutes: undefined })).save();
    expect(o.netDeltaMinutes).toBe(0);
  });
});

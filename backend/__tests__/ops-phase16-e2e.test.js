'use strict';

/**
 * ops-phase16-e2e.test.js — Phase 16 Commit 9 (4.0.74).
 *
 * End-to-end scenarios that thread multiple Phase-16 services
 * together. Uses in-memory fakes + a shared recorder SLA engine
 * + a real dispatcher-shaped event recorder. Proves the services
 * cooperate the way the control-tower runbook promises.
 *
 * Scenarios covered:
 *   A. Facility inspection → critical finding → auto-spawned WO
 *      → WO transitions through full lifecycle → SLA resolved
 *   B. PR draft → submit → multi-tier approval → convert to PO
 *      → both SLAs activated/resolved
 *   C. Meeting ended → minutes SLA active → decision assigned
 *      → completed with notes → both SLAs resolved
 *   D. Route job → optimize → publish → stop arrivals with
 *      variance → complete computes summary
 *   E. Notification dispatch across priority × preference combos
 *      with fallback
 */

process.env.NODE_ENV = 'test';

const {
  createFacilityInspectionService,
  createFacilityService,
} = require('../services/operations/facility.service');
const {
  createWorkOrderStateMachine,
} = require('../services/operations/workOrderStateMachine.service');
const { createPurchaseRequestService } = require('../services/operations/purchaseRequest.service');
const {
  createMeetingGovernanceService,
} = require('../services/operations/meetingGovernance.service');
const {
  createRouteOptimizationService,
} = require('../services/operations/routeOptimization.service');
const {
  createNotificationDispatchService,
} = require('../services/operations/notificationDispatch.service');

// ── shared fakes ──────────────────────────────────────────────────

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

function makeSlaEngine() {
  const calls = [];
  let n = 0;
  return {
    calls,
    async activate(args) {
      const sla = { _id: `sla-${++n}`, ...args };
      calls.push({ kind: 'activate', args, slaId: sla._id });
      return sla;
    },
    async observe(args) {
      calls.push({ kind: 'observe', args });
      return { _id: args.slaId };
    },
    async observeBySubject(args) {
      calls.push({ kind: 'observeBySubject', args });
      return { _id: 'sub-sla' };
    },
  };
}

function makeModel({ prefix = 'doc', preSave = null } = {}) {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `${prefix}-${++n}`,
      statusHistory: [],
      ...data,
      save: async function () {
        if (preSave) preSave(this);
        return this;
      },
    };
    if (preSave) preSave(doc);
    return doc;
  }
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    findOne: async filter => {
      return (
        docs.find(d => {
          for (const [k, v] of Object.entries(filter || {})) {
            if (String(d[k]) !== String(v)) return false;
          }
          return true;
        }) || null
      );
    },
    create: async data => {
      const d = shape(data);
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (v == null) {
            if (d[k] != null) return false;
            continue;
          }
          if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            if (v.$in && !v.$in.includes(d[k])) return false;
            if (v.$gte !== undefined && !(d[k] >= v.$gte)) return false;
            if (v.$lt !== undefined && !(d[k] < v.$lt)) return false;
          } else if (d[k] !== v) return false;
        }
        return true;
      });
      const api = {
        sort: () => api,
        skip: n => {
          rows = rows.slice(n);
          return api;
        },
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    _docs: () => docs,
  };
}

function makeInspectionModel() {
  return makeModel({
    prefix: 'insp',
    preSave(doc) {
      if (!doc.inspectionNumber) doc.inspectionNumber = `INSP-E2E-${doc._id}`;
      if (!Array.isArray(doc.findings)) doc.findings = [];
      for (const f of doc.findings) {
        if (!f._id) f._id = `find-${Math.random().toString(36).slice(2, 10)}`;
      }
      Object.defineProperty(doc.findings, 'id', {
        value: function (id) {
          return doc.findings.find(f => f._id === id);
        },
        configurable: true,
        enumerable: false,
      });
      const open = doc.findings.filter(f =>
        ['open', 'in_progress', 'awaiting_vendor'].includes(f.status)
      );
      doc.openFindingsCount = open.length;
      doc.criticalFindingsCount = open.filter(f => f.severity === 'critical').length;
    },
  });
}

function makeWoModelForSm() {
  return makeModel({
    prefix: 'wo',
    preSave(doc) {
      if (!doc.workOrderNumber) doc.workOrderNumber = `WO-E2E-${doc._id}`;
    },
  });
}

// ── Scenario A: Facility finding → auto-WO → full WO lifecycle ──

describe('Scenario A: Facility finding → auto-WO → full lifecycle', () => {
  it('orchestrates end-to-end with SLA activated and resolved', async () => {
    const slaEngine = makeSlaEngine();
    const dispatcher = makeDispatcher();

    const facilityModel = makeModel({ prefix: 'fac' });
    const inspectionModel = makeInspectionModel();
    const woModel = makeWoModelForSm();

    const facility = await facilityModel.create({
      code: 'RY-E2E-B1',
      nameAr: 'مبنى',
      nameEn: 'Bldg',
      branchId: 'branch-e2e-1',
      type: 'clinic',
      status: 'active',
      deleted_at: null,
    });

    // Wire WO state machine first — inspection service injects it
    // so critical findings auto-spawn.
    const woSm = createWorkOrderStateMachine({
      workOrderModel: woModel,
      slaEngine,
      dispatcher,
    });

    const inspectionSvc = createFacilityInspectionService({
      inspectionModel,
      facilityModel,
      slaEngine,
      workOrderStateMachine: woSm,
      dispatcher,
    });

    // 1. Schedule + start inspection
    const insp = await inspectionSvc.schedule({
      facilityId: facility._id,
      type: 'fire_safety',
    });
    await inspectionSvc.start(insp._id);

    // 2. Raise a critical finding — should auto-activate facility
    //    SLA, auto-spawn WO (which itself activates maintenance SLA).
    //    The WO state machine requires `assetId` to leave draft, so
    //    pass one through.
    const { finding } = await inspectionSvc.raiseFinding(
      insp._id,
      {
        description: 'Expired extinguisher',
        severity: 'critical',
      },
      { assetId: 'asset-hvac-1' }
    );

    // SLA activations: one for the finding, one for the WO.
    const findingActivate = slaEngine.calls.find(
      c => c.kind === 'activate' && c.args.subjectType === 'FacilityInspectionFinding'
    );
    const woActivate = slaEngine.calls.find(
      c => c.kind === 'activate' && c.args.subjectType === 'MaintenanceWorkOrder'
    );
    expect(findingActivate).toBeDefined();
    expect(woActivate).toBeDefined();
    expect(woActivate.args.policyId).toBe('maintenance.wo.critical');

    // WO backlinked on the finding
    expect(finding.workOrderId).toBeTruthy();

    // 3. Walk the WO through its lifecycle to completion.
    const woId = finding.workOrderId;
    await woSm.transition({
      workOrder: woId,
      toState: 'triaged',
    });
    await woSm.transition({ workOrder: woId, toState: 'approved' });
    await woSm.transition({
      workOrder: woId,
      toState: 'scheduled',
      patch: { scheduledDate: new Date() },
    });
    await woSm.transition({ workOrder: woId, toState: 'in_progress' });
    await woSm.transition({
      workOrder: woId,
      toState: 'completed',
      patch: { resolution: 'Replaced extinguisher' },
    });

    // WO SLA got a first_response (on triaged/scheduled) + resolved on completed.
    const woObserves = slaEngine.calls.filter(
      c =>
        c.kind === 'observe' &&
        c.args.slaId === woActivate.slaId &&
        ['first_response', 'resolved'].includes(c.args.eventType)
    );
    expect(woObserves.find(o => o.args.eventType === 'first_response')).toBeDefined();
    expect(woObserves.find(o => o.args.eventType === 'resolved')).toBeDefined();

    // 4. Close the finding → resolves facility SLA.
    await inspectionSvc.updateFindingStatus(insp._id, finding._id, {
      toStatus: 'closed',
      closureNotes: 'Fixed by contractor',
    });
    const findingResolved = slaEngine.calls.find(
      c =>
        c.kind === 'observe' &&
        c.args.slaId === findingActivate.slaId &&
        c.args.eventType === 'resolved'
    );
    expect(findingResolved).toBeDefined();

    // 5. Bus captured the full event trace.
    const eventNames = new Set(dispatcher.events.map(e => e.name));
    for (const expected of [
      'ops.facility.inspection_scheduled',
      'ops.facility.inspection_started',
      'ops.facility.finding_raised',
      'ops.wo.submitted',
      'ops.wo.completed',
      'ops.facility.finding_status_changed',
    ]) {
      expect(eventNames.has(expected)).toBe(true);
    }
  });
});

// ── Scenario B: PR submit → approve → convert to PO ──────────────

describe('Scenario B: PR → multi-tier approval → PO conversion', () => {
  it('activates + resolves pr.approval SLA and activates po.issuance SLA', async () => {
    const slaEngine = makeSlaEngine();
    const dispatcher = makeDispatcher();

    const prModel = makeModel({
      prefix: 'pr',
      preSave(doc) {
        if (!doc.requestNumber) doc.requestNumber = `PR-E2E-${doc._id}`;
        // compute summary
        const items = doc.items || [];
        let value = 0;
        for (const i of items) {
          value += (i.quantity || 0) * (i.estimatedUnitPrice || 0);
        }
        doc.summary = {
          totalItems: items.length,
          totalQuantity: items.reduce((s, i) => s + (i.quantity || 0), 0),
          estimatedValue: value,
          taxRate: 15,
          estimatedTax: value * 0.15,
          estimatedTotal: value * 1.15,
        };
      },
    });
    const poModel = makeModel({
      prefix: 'po',
      preSave(doc) {
        if (!doc.po_number) doc.po_number = `PO-E2E-${doc._id}`;
      },
    });

    const svc = createPurchaseRequestService({
      prModel,
      poModel,
      slaEngine,
      dispatcher,
    });

    // Complex tier: 3 approvals required (value ~ 300,000)
    const draft = await svc.createDraft({
      requiredDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      items: [{ itemName: 'Equipment', quantity: 3, estimatedUnitPrice: 100000 }],
      branchId: 'branch-e2e',
    });
    expect(draft.status).toBe('draft');

    const submitted = await svc.submit(draft._id);
    expect(submitted.approvalTier).toBe('complex');
    expect(submitted.approvals.length).toBe(3);

    // pr.approval SLA activated
    const prActivate = slaEngine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'procurement.pr.approval'
    );
    expect(prActivate).toBeDefined();

    await svc.approveStep(draft._id, {
      approverId: 'u1',
      role: 'department_head',
    });
    await svc.approveStep(draft._id, {
      approverId: 'u2',
      role: 'procurement_manager',
    });
    const finalPr = await svc.approveStep(draft._id, {
      approverId: 'u3',
      role: 'cfo',
    });
    expect(finalPr.status).toBe('approved');

    // pr.approval SLA resolved after final signature
    const prResolved = slaEngine.calls.find(
      c =>
        c.kind === 'observe' && c.args.slaId === prActivate.slaId && c.args.eventType === 'resolved'
    );
    expect(prResolved).toBeDefined();

    // Convert to PO → po.issuance SLA activated; PO created; bus fires
    const { purchaseRequest, purchaseOrder } = await svc.convertToPo(draft._id, {
      actorId: 'u-proc',
      supplierId: 'sup-1',
    });
    expect(purchaseRequest.status).toBe('converted_to_po');
    expect(purchaseOrder.items.length).toBe(1);

    const poActivate = slaEngine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'procurement.po.issuance'
    );
    expect(poActivate).toBeDefined();

    const names = dispatcher.events.map(e => e.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'ops.pr.created',
        'ops.pr.submitted',
        'ops.pr.approved',
        'ops.pr.converted_to_po',
        'ops.po.created',
      ])
    );
  });
});

// ── Scenario C: Meeting end → decision → completion ──────────────

describe('Scenario C: Meeting end → decision → completion', () => {
  it('activates + resolves both minutes SLA and decision SLA', async () => {
    const slaEngine = makeSlaEngine();
    const dispatcher = makeDispatcher();
    const meetingModel = makeModel({
      prefix: 'meet',
      preSave(doc) {
        if (!doc.meetingId) doc.meetingId = `MEET-E2E-${doc._id}`;
      },
    });
    const decisionModel = makeModel({
      prefix: 'dec',
      preSave(doc) {
        if (!doc.decisionNumber) doc.decisionNumber = `DEC-E2E-${doc._id}`;
      },
    });
    const svc = createMeetingGovernanceService({
      meetingModel,
      decisionModel,
      slaEngine,
      dispatcher,
    });

    const m = await meetingModel.create({
      title: 'Board meeting',
      branchId: 'branch-e2e',
      status: 'in_progress',
      minutes: [],
    });

    // End meeting → activates minutes SLA
    const ended = await svc.endMeeting(m._id);
    expect(ended.status).toBe('completed');
    const minutesActivate = slaEngine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'meeting.minutes.publish'
    );
    expect(minutesActivate).toBeDefined();

    // Assign a decision → activates decision SLA
    const decision = await svc.assignDecision(m._id, {
      title: 'Approve Q3 budget',
      ownerUserId: 'u1',
      priority: 'high',
    });
    expect(decision.status).toBe('open');
    const decActivate = slaEngine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'meeting.decision.execution'
    );
    expect(decActivate).toBeDefined();

    // Complete the decision → resolves its SLA
    await svc.updateDecisionStatus(decision._id, 'in_progress', { actorId: 'u1' });
    await svc.updateDecisionStatus(decision._id, 'completed', {
      actorId: 'u1',
      patch: { executionNotes: 'Q3 budget approved and filed' },
    });

    const decResolved = slaEngine.calls.find(
      c =>
        c.kind === 'observe' &&
        c.args.slaId === decActivate.slaId &&
        c.args.eventType === 'resolved'
    );
    expect(decResolved).toBeDefined();

    // Publish minutes → resolves minutes SLA via observeBySubject
    await svc.publishMinutes(m._id, { minutesContent: 'Full minutes text' });
    const minutesResolved = slaEngine.calls.find(
      c =>
        c.kind === 'observeBySubject' &&
        c.args.policyId === 'meeting.minutes.publish' &&
        c.args.eventType === 'resolved'
    );
    expect(minutesResolved).toBeDefined();
  });
});

// ── Scenario D: Route plan → publish → reconcile ─────────────────

describe('Scenario D: Route plan → publish → variance summary', () => {
  it('captures onTime / late / missed in the completion summary', async () => {
    const slaEngine = makeSlaEngine();
    const dispatcher = makeDispatcher();
    const jobModel = makeModel({
      prefix: 'roj',
      preSave(doc) {
        if (!doc.jobNumber) doc.jobNumber = `ROJ-E2E-${doc._id}`;
        for (const arr of [doc.requests, doc.plannedStops]) {
          if (!Array.isArray(arr)) continue;
          for (const x of arr) {
            if (!x._id) x._id = `sub-${Math.random().toString(36).slice(2, 10)}`;
          }
        }
      },
    });
    const svc = createRouteOptimizationService({
      jobModel,
      slaEngine,
      dispatcher,
    });

    const departure = new Date('2026-05-01T07:00:00+03:00');
    const j = await svc.createJob({
      branchId: 'branch-e2e',
      runDate: new Date('2026-05-01'),
      departureTime: departure,
      shift: 'morning',
    });

    // 3 requests across 3 buckets (so 3 stops)
    await svc.addRequest(j._id, {
      pickupAddress: 'A street',
      postalCode: '1111-AA',
      beneficiaryNameSnapshot: 'Alice',
    });
    await svc.addRequest(j._id, {
      pickupAddress: 'B street',
      postalCode: '2222-BB',
      beneficiaryNameSnapshot: 'Bob',
    });
    await svc.addRequest(j._id, {
      pickupAddress: 'C street',
      postalCode: '3333-CC',
      beneficiaryNameSnapshot: 'Carol',
    });

    await svc.optimize(j._id, { minutesPerStop: 10 });
    await svc.assignVehicle(j._id, { vehicleId: 'v1', capabilities: [] });
    await svc.assignDriver(j._id, { driverId: 'd1' });
    const published = await svc.publish(j._id);

    // One SLA activation per stop + ops.trip.scheduled emitted per stop.
    const stopActivations = slaEngine.calls.filter(
      c => c.kind === 'activate' && c.args.subjectType === 'RouteStop'
    );
    expect(stopActivations.length).toBe(3);
    const scheduledEvents = dispatcher.events.filter(e => e.name === 'ops.trip.scheduled');
    expect(scheduledEvents.length).toBe(3);

    await svc.start(j._id);
    const refreshed = await jobModel.findById(j._id);

    // Stop 0: on-time (+2 min), Stop 1: late (+12 min), Stop 2: missed
    await svc.recordStopStatus(j._id, refreshed.plannedStops[0]._id, {
      toStatus: 'arrived',
      when: new Date(new Date(refreshed.plannedStops[0].plannedArrival).getTime() + 2 * 60 * 1000),
    });
    await svc.recordStopStatus(j._id, refreshed.plannedStops[0]._id, {
      toStatus: 'picked_up',
      when: new Date(),
    });
    await svc.recordStopStatus(j._id, refreshed.plannedStops[1]._id, {
      toStatus: 'arrived',
      when: new Date(new Date(refreshed.plannedStops[1].plannedArrival).getTime() + 12 * 60 * 1000),
    });
    await svc.recordStopStatus(j._id, refreshed.plannedStops[1]._id, {
      toStatus: 'picked_up',
      when: new Date(),
    });
    await svc.recordStopStatus(j._id, refreshed.plannedStops[2]._id, {
      toStatus: 'missed',
      when: new Date(),
    });

    const completed = await svc.complete(j._id);
    expect(completed.status).toBe('completed');
    expect(completed.varianceSummary.totalStops).toBe(3);
    expect(completed.varianceSummary.onTimeCount).toBe(1);
    expect(completed.varianceSummary.lateCount).toBe(1);
    expect(completed.varianceSummary.missedCount).toBe(1);
  });
});

// ── Scenario E: Notification dispatch across combos ──────────────

describe('Scenario E: Notification dispatch — priority × preferences', () => {
  function makePrefsModel() {
    const docs = [];
    let n = 0;
    return {
      docs,
      findOne: async filter => {
        return (
          docs.find(d => {
            for (const [k, v] of Object.entries(filter || {})) {
              if (String(d[k]) !== String(v)) return false;
            }
            return true;
          }) || null
        );
      },
      create: async data => {
        const d = {
          _id: `prefs-${++n}`,
          channelPreferences: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            slack: { enabled: false },
            in_app: { enabled: true },
            whatsapp: { enabled: false },
          },
          quietHours: {
            enabled: true,
            startHour: 22,
            endHour: 6,
            timezone: 'Asia/Riyadh',
          },
          digest: { enabled: false, sendHour: 8, includePriorities: ['low', 'normal'] },
          dndUntil: null,
          inMeetingUntil: null,
          inSessionUntil: null,
          ...data,
          save: async function () {
            return this;
          },
        };
        docs.push(d);
        return d;
      },
    };
  }

  it('critical pierces quiet hours + DND; normal defers + falls back to digest', async () => {
    const svc = createNotificationDispatchService({
      preferencesModel: makePrefsModel(),
    });

    // User: quiet hours 22→06 Riyadh, DND until next-day noon
    // (relative to the reference time below, NOT real Date.now()),
    // digest on.
    const midnight = new Date('2026-05-01T00:00:00+03:00'); // 00:00 Riyadh
    const dndUntil = new Date(midnight.getTime() + 24 * 3600 * 1000);
    const userPrefs = {
      quietHours: { enabled: true, startHour: 22, endHour: 6, timezone: 'Asia/Riyadh' },
      dndUntil,
      digest: { enabled: true, sendHour: 8, includePriorities: ['low', 'normal'] },
      channelPreferences: {
        email: { enabled: true },
        push: { enabled: true },
        sms: { enabled: true },
        slack: { enabled: false },
      },
    };

    // Critical → bypasses everything, delivers on push/sms/email.
    const critPlan = svc.planDispatch({
      priority: 'critical',
      prefs: userPrefs,
      referenceTime: midnight,
    });
    expect(critPlan.deferred).toBe(false);
    expect(critPlan.channels).toEqual(expect.arrayContaining(['push', 'sms', 'email']));

    // High at midnight → DND active → deferred (not digest, high is ineligible).
    const highPlan = svc.planDispatch({
      priority: 'high',
      prefs: userPrefs,
      referenceTime: midnight,
    });
    expect(highPlan.deferred).toBe(true);
    expect(highPlan.reason).toBe('dnd_active');

    // Normal during daytime (no DND, quiet hours off-window) with digest on
    // → should go to digest (low/normal are eligible).
    const daytimePrefs = {
      ...userPrefs,
      dndUntil: null,
    };
    const noon = new Date('2026-05-01T12:00:00+03:00');
    const normalPlan = svc.planDispatch({
      priority: 'normal',
      prefs: daytimePrefs,
      referenceTime: noon,
    });
    expect(normalPlan.deferred).toBe(true);
    expect(normalPlan.reason).toBe('digest_queued');
    expect(normalPlan.digestBucket).toBe(true);
  });

  it('sendWithFallback walks channels until one succeeds', async () => {
    const svc = createNotificationDispatchService({
      preferencesModel: makePrefsModel(),
    });
    const pushCalls = [];
    const emailCalls = [];
    const smsCalls = [];
    const plan = {
      channels: ['push', 'email', 'sms'],
      deferred: false,
    };
    const result = await svc.sendWithFallback({
      plan,
      content: { subject: 'alert', body: '…' },
      channelAdapters: {
        push: {
          async send(m) {
            pushCalls.push(m);
            throw new Error('device_offline');
          },
        },
        email: {
          async send(m) {
            emailCalls.push(m);
            return { success: false, error: 'smtp_bounce' };
          },
        },
        sms: {
          async send(m) {
            smsCalls.push(m);
            return { success: true };
          },
        },
      },
    });
    expect(result.success).toBe(true);
    expect(result.chosenChannel).toBe('sms');
    expect(pushCalls.length).toBe(1);
    expect(emailCalls.length).toBe(1);
    expect(smsCalls.length).toBe(1);
  });
});

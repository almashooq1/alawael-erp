'use strict';

/**
 * care-home-visit-service.test.js — Phase 17 Commit 3 (4.0.85).
 *
 * Behaviour tests for the home-visit service.
 */

process.env.NODE_ENV = 'test';

const { createHomeVisitService } = require('../services/care/homeVisit.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeVisitModel() {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `visit-${++n}`,
      visitNumber: `HV-TEST-${n}`,
      statusHistory: [],
      observations: [],
      actionItems: [],
      photos: [],
      accompanyingStaff: [],
      scheduledFor: data.scheduledFor || new Date(),
      ...data,
      save: async function () {
        for (const arr of [this.actionItems, this.photos]) {
          if (!Array.isArray(arr)) continue;
          for (const x of arr) {
            if (!x._id) x._id = `sub-${Math.random().toString(36).slice(2, 10)}`;
          }
        }
        return this;
      },
    };
    for (const arr of [doc.actionItems, doc.photos]) {
      if (!Array.isArray(arr)) continue;
      for (const x of arr) if (!x._id) x._id = `sub-${Math.random().toString(36).slice(2, 10)}`;
    }
    return doc;
  }
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = shape(data);
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (v === null) {
            if (d[k] != null) return false;
            continue;
          }
          if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            if (v.$in && !v.$in.includes(d[k])) return false;
            if (v.$gte !== undefined && !(d[k] >= v.$gte)) return false;
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
        then: (r, rj) => Promise.resolve(rows).then(r, rj),
      };
      return api;
    },
    _docs: () => docs,
  };
}

function makeSlaEngine() {
  const calls = [];
  let n = 0;
  return {
    calls,
    async activate(args) {
      const sla = { _id: `sla-${++n}`, ...args };
      calls.push({ kind: 'activate', args });
      return sla;
    },
    async observe(args) {
      calls.push({ kind: 'observe', args });
      return { _id: args.slaId };
    },
  };
}

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

function baseVisit() {
  return {
    visitType: 'follow_up',
    scheduledFor: new Date(Date.now() + 24 * 3600 * 1000),
    assignedWorkerId: 'worker-1',
    assignedWorkerNameSnapshot: 'ا. سارة',
    caseId: 'case-1',
    beneficiaryId: 'ben-1',
    branchId: 'branch-1',
    address: 'حي النسيم — شارع 12',
  };
}

// ── scheduleVisit ─────────────────────────────────────────────────

describe('HomeVisit — scheduleVisit', () => {
  it('creates visit in scheduled + emits event', async () => {
    const visitModel = makeVisitModel();
    const dispatcher = makeDispatcher();
    const svc = createHomeVisitService({ visitModel, dispatcher });
    const doc = await svc.scheduleVisit(baseVisit());
    expect(doc.status).toBe('scheduled');
    expect(doc.visitType).toBe('follow_up');
    expect(dispatcher.events.some(e => e.name === 'ops.care.social.home_visit_scheduled')).toBe(
      true
    );
  });

  it('throws MISSING_FIELD without required fields', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    await expect(svc.scheduleVisit({ visitType: 'follow_up' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('throws MISSING_FIELD for unknown visitType', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    await expect(svc.scheduleVisit({ ...baseVisit(), visitType: 'bogus' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });
});

// ── lifecycle ─────────────────────────────────────────────────────

describe('HomeVisit — lifecycle', () => {
  it('scheduled → en_route → arrived → complete full path', async () => {
    const visitModel = makeVisitModel();
    const svc = createHomeVisitService({ visitModel });
    const v = await svc.scheduleVisit(baseVisit());

    await svc.markEnRoute(v._id);
    let d = await svc.findById(v._id);
    expect(d.status).toBe('en_route');
    expect(d.enRouteAt).toBeInstanceOf(Date);

    await svc.markArrived(v._id, {
      coordinates: { lat: 24.7136, lng: 46.6753, accuracy: 10 },
    });
    d = await svc.findById(v._id);
    expect(d.status).toBe('in_progress');
    expect(d.arrivedAt).toBeInstanceOf(Date);
    expect(d.arrivalCoordinates.lat).toBe(24.7136);
    expect(d.arrivalCoordinates.accuracy).toBe(10);

    const completed = await svc.completeVisit(v._id, {
      visitSummary: 'الأسرة مستقرة — تحسن ملحوظ',
    });
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeInstanceOf(Date);
    expect(completed.overallConcernLevel).toBe('none');
  });

  it('scheduled → in_progress (skip en_route)', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v = await svc.scheduleVisit(baseVisit());
    await svc.markArrived(v._id);
    const d = await svc.findById(v._id);
    expect(d.status).toBe('in_progress');
  });

  it('illegal transitions throw ILLEGAL_TRANSITION', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v = await svc.scheduleVisit(baseVisit());
    // scheduled → completed is illegal
    await expect(svc.completeVisit(v._id, { visitSummary: 'x' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('completeVisit requires visitSummary', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v = await svc.scheduleVisit(baseVisit());
    await svc.markArrived(v._id);
    await expect(svc.completeVisit(v._id, {})).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });
});

// ── observations ──────────────────────────────────────────────────

describe('HomeVisit — observations', () => {
  it('addObservation appends + rejects outside in_progress', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v = await svc.scheduleVisit(baseVisit());
    // scheduled — should reject
    await expect(
      svc.addObservation(v._id, { domain: 'home_environment', concernLevel: 'low' })
    ).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });

    await svc.markArrived(v._id);
    const d = await svc.addObservation(v._id, {
      domain: 'home_environment',
      concernLevel: 'low',
      notes: 'الغرفة نظيفة',
    });
    expect(d.observations.length).toBe(1);
    expect(d.observations[0].domain).toBe('home_environment');
  });

  it('addObservation rejects unknown domain', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v = await svc.scheduleVisit(baseVisit());
    await svc.markArrived(v._id);
    await expect(svc.addObservation(v._id, { domain: 'bogus' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('completeVisit auto-computes overallConcernLevel from observations', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v = await svc.scheduleVisit(baseVisit());
    await svc.markArrived(v._id);
    await svc.addObservation(v._id, { domain: 'home_environment', concernLevel: 'low' });
    await svc.addObservation(v._id, { domain: 'family_dynamics', concernLevel: 'high' });
    await svc.addObservation(v._id, { domain: 'hygiene_safety', concernLevel: 'medium' });
    const d = await svc.completeVisit(v._id, { visitSummary: 'mix' });
    expect(d.overallConcernLevel).toBe('high');
  });
});

// ── action items + follow-up SLA ─────────────────────────────────

describe('HomeVisit — action items + follow-up SLA', () => {
  it('complete with open action items activates follow-up SLA', async () => {
    const visitModel = makeVisitModel();
    const engine = makeSlaEngine();
    const svc = createHomeVisitService({ visitModel, slaEngine: engine });
    const v = await svc.scheduleVisit(baseVisit());
    await svc.markArrived(v._id);
    await svc.addActionItem(v._id, {
      title: 'متابعة تسجيل الابن في المدرسة',
      priority: 'high',
    });
    const completed = await svc.completeVisit(v._id, {
      visitSummary: 'الأسرة بحاجة لدعم مدرسي',
    });
    expect(completed.followupSlaId).toBeTruthy();
    const activate = engine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'social.home_visit.followup'
    );
    expect(activate).toBeDefined();
  });

  it('complete without action items does NOT activate follow-up SLA', async () => {
    const visitModel = makeVisitModel();
    const engine = makeSlaEngine();
    const svc = createHomeVisitService({ visitModel, slaEngine: engine });
    const v = await svc.scheduleVisit(baseVisit());
    await svc.markArrived(v._id);
    const d = await svc.completeVisit(v._id, { visitSummary: 'كله تمام' });
    expect(d.followupSlaId).toBeFalsy();
    expect(engine.calls.filter(c => c.kind === 'activate').length).toBe(0);
  });

  it('updateActionItem to completed resolves follow-up SLA when last open', async () => {
    const visitModel = makeVisitModel();
    const engine = makeSlaEngine();
    const svc = createHomeVisitService({ visitModel, slaEngine: engine });
    const v = await svc.scheduleVisit(baseVisit());
    await svc.markArrived(v._id);
    await svc.addActionItem(v._id, { title: 'a', priority: 'high' });
    const completed = await svc.completeVisit(v._id, { visitSummary: 's' });
    const itemId = completed.actionItems[0]._id;
    engine.calls.length = 0;

    await svc.updateActionItem(v._id, itemId, {
      toStatus: 'completed',
      outcome: 'تم',
    });

    const resolved = engine.calls.find(
      c => c.kind === 'observe' && c.args.eventType === 'resolved'
    );
    expect(resolved).toBeDefined();
  });

  it('multiple action items: only last-closing resolves SLA', async () => {
    const visitModel = makeVisitModel();
    const engine = makeSlaEngine();
    const svc = createHomeVisitService({ visitModel, slaEngine: engine });
    const v = await svc.scheduleVisit(baseVisit());
    await svc.markArrived(v._id);
    await svc.addActionItem(v._id, { title: 'a' });
    await svc.addActionItem(v._id, { title: 'b' });
    const completed = await svc.completeVisit(v._id, { visitSummary: 's' });
    const [a, b] = completed.actionItems;
    engine.calls.length = 0;

    await svc.updateActionItem(v._id, a._id, { toStatus: 'completed' });
    expect(
      engine.calls.find(c => c.kind === 'observe' && c.args.eventType === 'resolved')
    ).toBeUndefined();
    await svc.updateActionItem(v._id, b._id, { toStatus: 'completed' });
    expect(
      engine.calls.find(c => c.kind === 'observe' && c.args.eventType === 'resolved')
    ).toBeDefined();
  });
});

// ── critical-concern event ───────────────────────────────────────

describe('HomeVisit — critical-concern event', () => {
  it('emits ops.care.social.home_visit_critical_concern when critical observation present and case linked', async () => {
    const visitModel = makeVisitModel();
    const dispatcher = makeDispatcher();
    const svc = createHomeVisitService({ visitModel, dispatcher });
    const v = await svc.scheduleVisit(baseVisit()); // caseId: 'case-1'
    await svc.markArrived(v._id);
    await svc.addObservation(v._id, {
      domain: 'beneficiary_wellbeing',
      concernLevel: 'critical',
      notes: 'علامات إهمال واضحة',
    });
    await svc.completeVisit(v._id, { visitSummary: 'need urgent follow-up' });

    const critEvt = dispatcher.events.find(
      e => e.name === 'ops.care.social.home_visit_critical_concern'
    );
    expect(critEvt).toBeDefined();
    expect(critEvt.payload.caseId).toBe('case-1');
    expect(critEvt.payload.criticalObservations.length).toBe(1);
  });

  it('does NOT emit critical event when no caseId', async () => {
    const visitModel = makeVisitModel();
    const dispatcher = makeDispatcher();
    const svc = createHomeVisitService({ visitModel, dispatcher });
    const { caseId, ...dataNoCase } = baseVisit();
    const v = await svc.scheduleVisit(dataNoCase);
    await svc.markArrived(v._id);
    await svc.addObservation(v._id, {
      domain: 'beneficiary_wellbeing',
      concernLevel: 'critical',
    });
    await svc.completeVisit(v._id, { visitSummary: 's' });
    const critEvt = dispatcher.events.find(
      e => e.name === 'ops.care.social.home_visit_critical_concern'
    );
    expect(critEvt).toBeUndefined();
  });
});

// ── cancel / no-answer / reschedule ───────────────────────────────

describe('HomeVisit — cancel / no-answer / reschedule', () => {
  it('cancelVisit requires cancellationReason + valid value', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v = await svc.scheduleVisit(baseVisit());
    await expect(svc.cancelVisit(v._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
    await expect(svc.cancelVisit(v._id, { cancellationReason: 'bogus' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const d = await svc.cancelVisit(v._id, {
      cancellationReason: 'family_request',
      cancellationNotes: 'الأسرة طلبت التأجيل',
    });
    expect(d.status).toBe('cancelled');
    expect(d.cancellationReason).toBe('family_request');
  });

  it('markNoAnswer requires noAnswerNotes', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v = await svc.scheduleVisit(baseVisit());
    await svc.markEnRoute(v._id);
    await expect(svc.markNoAnswer(v._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
    const d = await svc.markNoAnswer(v._id, { noAnswerNotes: 'لا يوجد أحد' });
    expect(d.status).toBe('no_answer');
  });

  it('rescheduleVisit creates replacement + marks original as rescheduled', async () => {
    const visitModel = makeVisitModel();
    const svc = createHomeVisitService({ visitModel });
    const v = await svc.scheduleVisit(baseVisit());
    const newDate = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    const { original, replacement } = await svc.rescheduleVisit(v._id, {
      rescheduledTo: newDate,
      reason: 'ازدحام',
    });
    expect(original.status).toBe('rescheduled');
    expect(original.rescheduledToVisitId).toBe(replacement._id);
    expect(replacement.status).toBe('scheduled');
    expect(replacement.rescheduledFromVisitId).toBe(original._id);
    expect(replacement.assignedWorkerId).toBe('worker-1');
    expect(new Date(replacement.scheduledFor).getTime()).toBe(newDate.getTime());
  });

  it('rescheduleVisit requires valid rescheduledTo', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v = await svc.scheduleVisit(baseVisit());
    await expect(svc.rescheduleVisit(v._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
    await expect(svc.rescheduleVisit(v._id, { rescheduledTo: 'not-a-date' })).rejects.toMatchObject(
      { code: 'MISSING_FIELD' }
    );
  });
});

// ── reads ─────────────────────────────────────────────────────────

describe('HomeVisit — list / workerSchedule', () => {
  it('workerSchedule returns only active visits for worker', async () => {
    const svc = createHomeVisitService({ visitModel: makeVisitModel() });
    const v1 = await svc.scheduleVisit({ ...baseVisit(), assignedWorkerId: 'w-1' });
    await svc.scheduleVisit({ ...baseVisit(), assignedWorkerId: 'w-1' });
    await svc.cancelVisit(v1._id, { cancellationReason: 'duplicate' });
    const schedule = await svc.workerSchedule('w-1');
    expect(schedule.length).toBe(1); // cancelled one excluded
  });
});

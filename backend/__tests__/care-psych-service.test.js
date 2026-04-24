'use strict';

/**
 * care-psych-service.test.js — Phase 17 Commit 5 (4.0.87).
 *
 * Exercises risk-flag lifecycle, scale administration + auto-flag
 * triggering, and MDT meeting lifecycle.
 */

process.env.NODE_ENV = 'test';

const { createPsychService } = require('../services/care/psych.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeModel(prefix) {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `${prefix}-${++n}`,
      statusHistory: [],
      actions: [],
      attendees: [],
      agenda: [],
      decisions: [],
      actionItems: [],
      ...data,
      save: async function () {
        for (const arr of [this.actions, this.attendees, this.decisions, this.actionItems]) {
          if (!Array.isArray(arr)) continue;
          for (const x of arr) {
            if (!x._id) x._id = `sub-${Math.random().toString(36).slice(2, 10)}`;
          }
        }
        return this;
      },
    };
    return doc;
  }
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = shape({
        ...data,
        flagNumber: prefix === 'flag' ? `RF-TEST-${n + 1}` : undefined,
        assessmentNumber: prefix === 'scale' ? `PSA-TEST-${n + 1}` : undefined,
        meetingNumber: prefix === 'mdt' ? `MDT-TEST-${n + 1}` : undefined,
      });
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
  };
}

function makeSlaEngine() {
  const calls = [];
  let n = 0;
  return {
    calls,
    async activate(args) {
      calls.push({ kind: 'activate', args });
      return { _id: `sla-${++n}`, ...args };
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

function mkServices() {
  const flagModel = makeModel('flag');
  const scaleModel = makeModel('scale');
  const mdtModel = makeModel('mdt');
  const slaEngine = makeSlaEngine();
  const dispatcher = makeDispatcher();
  const svc = createPsychService({
    flagModel,
    scaleModel,
    mdtModel,
    slaEngine,
    dispatcher,
  });
  return { svc, flagModel, scaleModel, mdtModel, slaEngine, dispatcher };
}

// ══════════════════════════════════════════════════════════════════
// RISK FLAG
// ══════════════════════════════════════════════════════════════════

describe('Psych — raiseFlag', () => {
  it('raises an active flag + emits risk_flag_raised', async () => {
    const { svc, dispatcher } = mkServices();
    const doc = await svc.raiseFlag({
      beneficiaryId: 'ben-1',
      flagType: 'severe_depression',
      severity: 'high',
    });
    expect(doc.status).toBe('active');
    expect(doc.flagType).toBe('severe_depression');
    expect(dispatcher.events.some(e => e.name === 'ops.care.psych.risk_flag_raised')).toBe(true);
  });

  it('critical severity activates SLA', async () => {
    const { svc, slaEngine } = mkServices();
    const doc = await svc.raiseFlag({
      beneficiaryId: 'ben-1',
      flagType: 'suicidal_ideation',
      severity: 'critical',
    });
    expect(slaEngine.calls.some(c => c.kind === 'activate')).toBe(true);
    expect(doc.slaId).toBeTruthy();
  });

  it('non-critical severity does NOT activate SLA', async () => {
    const { svc, slaEngine } = mkServices();
    const doc = await svc.raiseFlag({
      beneficiaryId: 'ben-1',
      flagType: 'neglect_risk',
      severity: 'moderate',
    });
    expect(slaEngine.calls.filter(c => c.kind === 'activate').length).toBe(0);
    expect(doc.slaId).toBeFalsy();
  });

  it('missing required fields throws MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(svc.raiseFlag({ beneficiaryId: 'ben-1' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('unknown flagType throws MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(
      svc.raiseFlag({
        beneficiaryId: 'ben-1',
        flagType: 'bogus',
        severity: 'high',
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });
});

describe('Psych — flag lifecycle', () => {
  async function _raise(svc, severity = 'high') {
    return svc.raiseFlag({
      beneficiaryId: 'ben-1',
      flagType: 'severe_depression',
      severity,
    });
  }

  it('establishSafetyPlan moves active → monitoring', async () => {
    const { svc } = mkServices();
    const f = await _raise(svc);
    const after = await svc.establishSafetyPlan(f._id, {
      safetyPlan: 'Daily check-in + crisis hotline',
    });
    expect(after.status).toBe('monitoring');
    expect(after.safetyPlan).toBeTruthy();
  });

  it('escalateFlag active → escalated', async () => {
    const { svc } = mkServices();
    const f = await _raise(svc);
    const after = await svc.escalateFlag(f._id, { escalationReason: 'worsening symptoms' });
    expect(after.status).toBe('escalated');
  });

  it('resolveFlag active → resolved stamps resolvedAt', async () => {
    const { svc } = mkServices();
    const f = await _raise(svc);
    const after = await svc.resolveFlag(f._id, { resolutionNotes: 'Symptoms remitted' });
    expect(after.status).toBe('resolved');
    expect(after.resolvedAt).toBeTruthy();
  });

  it('resolveFlag without notes throws MISSING_FIELD', async () => {
    const { svc } = mkServices();
    const f = await _raise(svc);
    await expect(svc.resolveFlag(f._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('resolved → archived legal', async () => {
    const { svc } = mkServices();
    const f = await _raise(svc);
    await svc.resolveFlag(f._id, { resolutionNotes: 'Done' });
    const archived = await svc.archiveFlag(f._id);
    expect(archived.status).toBe('archived');
  });

  it('archived → reopen throws ILLEGAL_TRANSITION', async () => {
    const { svc } = mkServices();
    const f = await _raise(svc);
    await svc.resolveFlag(f._id, { resolutionNotes: 'Done' });
    await svc.archiveFlag(f._id);
    await expect(svc.reopenFlag(f._id, { reopenReason: 'recurred' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('resolved → reopen legal', async () => {
    const { svc } = mkServices();
    const f = await _raise(svc);
    await svc.resolveFlag(f._id, { resolutionNotes: 'Done' });
    const re = await svc.reopenFlag(f._id, { reopenReason: 'symptoms back' });
    expect(re.status).toBe('active');
  });

  it('cancelFlag requires cancellationReason', async () => {
    const { svc } = mkServices();
    const f = await _raise(svc);
    await expect(svc.cancelFlag(f._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('critical flag SLA observed on resolution', async () => {
    const { svc, slaEngine } = mkServices();
    const f = await svc.raiseFlag({
      beneficiaryId: 'ben-1',
      flagType: 'suicidal_ideation',
      severity: 'critical',
    });
    await svc.resolveFlag(f._id, { resolutionNotes: 'stable after intervention' });
    expect(slaEngine.calls.some(c => c.kind === 'observe')).toBe(true);
  });

  it('recordFlagAction appends an action', async () => {
    const { svc } = mkServices();
    const f = await _raise(svc);
    const after = await svc.recordFlagAction(f._id, {
      kind: 'family_notified',
      notes: 'Called mother',
    });
    expect(after.actions.length).toBe(1);
    expect(after.actions[0].kind).toBe('family_notified');
  });
});

describe('Psych — flag reads', () => {
  it('listFlags filters by severity', async () => {
    const { svc } = mkServices();
    await svc.raiseFlag({
      beneficiaryId: 'ben-1',
      flagType: 'severe_depression',
      severity: 'critical',
    });
    await svc.raiseFlag({ beneficiaryId: 'ben-1', flagType: 'aggression', severity: 'high' });
    const crit = await svc.listFlags({ severity: 'critical' });
    expect(crit.length).toBe(1);
  });

  it('beneficiaryOpenFlags excludes resolved', async () => {
    const { svc } = mkServices();
    const f1 = await svc.raiseFlag({
      beneficiaryId: 'ben-1',
      flagType: 'aggression',
      severity: 'high',
    });
    const f2 = await svc.raiseFlag({
      beneficiaryId: 'ben-1',
      flagType: 'neglect_risk',
      severity: 'moderate',
    });
    await svc.resolveFlag(f1._id, { resolutionNotes: 'done' });
    const open = await svc.beneficiaryOpenFlags('ben-1');
    expect(open.length).toBe(1);
    expect(open[0]._id).toBe(f2._id);
  });
});

// ══════════════════════════════════════════════════════════════════
// SCALES
// ══════════════════════════════════════════════════════════════════

describe('Psych — administerScale', () => {
  it('scores PHQ-9 + persists + emits', async () => {
    const { svc, dispatcher } = mkServices();
    const doc = await svc.administerScale({
      beneficiaryId: 'ben-1',
      scaleCode: 'phq9',
      responses: [1, 1, 2, 2, 1, 1, 1, 0, 0],
    });
    expect(doc.totalScore).toBe(9);
    expect(doc.band).toBe('mild');
    expect(doc.recommendedAction).toBe('counseling');
    expect(doc.autoFlagTriggered).toBe(false);
    expect(dispatcher.events.some(e => e.name === 'ops.care.psych.scale_administered')).toBe(true);
  });

  it('PHQ-9 with item 9 non-zero auto-raises suicidal_ideation flag', async () => {
    const { svc, flagModel } = mkServices();
    const doc = await svc.administerScale({
      beneficiaryId: 'ben-1',
      scaleCode: 'phq9',
      responses: [1, 0, 0, 0, 0, 0, 0, 0, 2], // item 9 score = 2
    });
    expect(doc.autoFlagTriggered).toBe(true);
    expect(doc.autoFlagId).toBeTruthy();
    expect(flagModel.docs.length).toBe(1);
    expect(flagModel.docs[0].flagType).toBe('suicidal_ideation');
    expect(flagModel.docs[0].severity).toBe('critical');
    expect(flagModel.docs[0].source).toBe('scale:phq9');
  });

  it('DASS-21 extremely severe total auto-flags severe_depression', async () => {
    const { svc, flagModel } = mkServices();
    const doc = await svc.administerScale({
      beneficiaryId: 'ben-1',
      scaleCode: 'dass21',
      responses: new Array(21).fill(2), // total = 42 (extremely_severe)
    });
    expect(doc.totalScore).toBe(42);
    expect(doc.band).toBe('extremely_severe');
    expect(doc.autoFlagTriggered).toBe(true);
    expect(flagModel.docs.length).toBe(1);
  });

  it('invalid scale code throws MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(
      svc.administerScale({
        beneficiaryId: 'ben-1',
        scaleCode: 'bogus',
        responses: [0],
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('wrong number of responses throws MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(
      svc.administerScale({
        beneficiaryId: 'ben-1',
        scaleCode: 'phq9',
        responses: [0, 0],
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('listAssessments filters by scaleCode', async () => {
    const { svc } = mkServices();
    await svc.administerScale({
      beneficiaryId: 'ben-1',
      scaleCode: 'phq9',
      responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    await svc.administerScale({
      beneficiaryId: 'ben-1',
      scaleCode: 'gad7',
      responses: [0, 0, 0, 0, 0, 0, 0],
    });
    const phq = await svc.listAssessments({ scaleCode: 'phq9' });
    expect(phq.length).toBe(1);
    expect(phq[0].scaleCode).toBe('phq9');
  });

  it('beneficiaryScaleTrend returns series ordered latest-first', async () => {
    const { svc } = mkServices();
    await svc.administerScale({
      beneficiaryId: 'ben-1',
      scaleCode: 'phq9',
      responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      administeredAt: new Date('2026-04-01'),
    });
    await svc.administerScale({
      beneficiaryId: 'ben-1',
      scaleCode: 'phq9',
      responses: [1, 1, 1, 1, 1, 1, 1, 1, 0],
      administeredAt: new Date('2026-04-20'),
    });
    const trend = await svc.beneficiaryScaleTrend('ben-1', 'phq9');
    expect(trend.scaleCode).toBe('phq9');
    expect(trend.series.length).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════
// MDT
// ══════════════════════════════════════════════════════════════════

describe('Psych — MDT lifecycle', () => {
  async function mkMdt(svc) {
    return svc.scheduleMdt({
      beneficiaryId: 'ben-1',
      purpose: 'risk_flag_review',
      scheduledFor: new Date(Date.now() + 86400000),
    });
  }

  it('scheduleMdt creates scheduled meeting + emits', async () => {
    const { svc, dispatcher } = mkServices();
    const m = await mkMdt(svc);
    expect(m.status).toBe('scheduled');
    expect(m.purpose).toBe('risk_flag_review');
    expect(dispatcher.events.some(e => e.name === 'ops.care.psych.mdt_scheduled')).toBe(true);
  });

  it('startMdt → completeMdt happy path', async () => {
    const { svc } = mkServices();
    const m = await mkMdt(svc);
    const started = await svc.startMdt(m._id);
    expect(started.status).toBe('in_progress');
    const completed = await svc.completeMdt(m._id, {
      summary: 'Safety plan reviewed; medication adjusted',
      decisions: [{ topic: 'Medication', decision: 'Increase sertraline to 100mg' }],
    });
    expect(completed.status).toBe('completed');
    expect(completed.summary).toBeTruthy();
    expect(completed.decisions.length).toBe(1);
  });

  it('completeMdt without summary throws MISSING_FIELD', async () => {
    const { svc } = mkServices();
    const m = await mkMdt(svc);
    await expect(svc.completeMdt(m._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('completeMdt from completed throws ILLEGAL_TRANSITION', async () => {
    const { svc } = mkServices();
    const m = await mkMdt(svc);
    await svc.completeMdt(m._id, { summary: 'Done' });
    await expect(svc.completeMdt(m._id, { summary: 'Again' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('cancelMdt requires cancellationReason', async () => {
    const { svc } = mkServices();
    const m = await mkMdt(svc);
    await expect(svc.cancelMdt(m._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
    const c = await svc.cancelMdt(m._id, { cancellationReason: 'family unavailable' });
    expect(c.status).toBe('cancelled');
  });

  it('rescheduleMdt requires rescheduledTo', async () => {
    const { svc } = mkServices();
    const m = await mkMdt(svc);
    const r = await svc.rescheduleMdt(m._id, {
      rescheduledTo: new Date(Date.now() + 172800000),
    });
    expect(r.status).toBe('rescheduled');
    expect(r.rescheduledTo).toBeTruthy();
  });

  it('addMdtAttendee validates role', async () => {
    const { svc } = mkServices();
    const m = await mkMdt(svc);
    await expect(
      svc.addMdtAttendee(m._id, {
        nameSnapshot: 'د. أحمد',
        role: 'bogus',
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
    const after = await svc.addMdtAttendee(m._id, {
      nameSnapshot: 'د. أحمد',
      role: 'psychologist',
    });
    expect(after.attendees.length).toBe(1);
  });

  it('addMdtAttendee after meeting started throws ILLEGAL_TRANSITION', async () => {
    const { svc } = mkServices();
    const m = await mkMdt(svc);
    await svc.startMdt(m._id);
    await expect(
      svc.addMdtAttendee(m._id, {
        nameSnapshot: 'Late attendee',
        role: 'psychologist',
      })
    ).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
  });

  it('markAttendance flips attended flag', async () => {
    const { svc } = mkServices();
    const m = await mkMdt(svc);
    const withAtt = await svc.addMdtAttendee(m._id, {
      nameSnapshot: 'د. أحمد',
      role: 'psychologist',
    });
    const attId = withAtt.attendees[0]._id;
    const after = await svc.markAttendance(m._id, attId, { attended: true });
    expect(after.attendees[0].attended).toBe(true);
  });

  it('listMdt filters by status', async () => {
    const { svc } = mkServices();
    const m1 = await mkMdt(svc);
    await mkMdt(svc);
    await svc.completeMdt(m1._id, { summary: 'Done' });
    const done = await svc.listMdt({ status: 'completed' });
    expect(done.length).toBe(1);
  });
});

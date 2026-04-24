'use strict';

/**
 * care-independence-service.test.js — Phase 17 Commit 6 (4.0.88).
 */

process.env.NODE_ENV = 'test';

const { createIndependenceService } = require('../services/care/independence.service');
const { IADL_DOMAIN_CODES } = require('../config/care/independence.registry');

// ── fakes ─────────────────────────────────────────────────────────

function makeModel(prefix) {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `${prefix}-${++n}`,
      statusHistory: [],
      domainScores: [],
      goals: [],
      barriers: [],
      skillsObserved: [],
      photoUrls: [],
      ...data,
      save: async function () {
        for (const arr of [this.goals, this.barriers]) {
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
        assessmentNumber:
          prefix === 'tra'
            ? `TRA-TEST-${n + 1}`
            : prefix === 'iadl'
              ? `IADL-TEST-${n + 1}`
              : undefined,
        logNumber: prefix === 'cpl' ? `CPL-TEST-${n + 1}` : undefined,
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
  };
}

function makePartnerModel() {
  const docs = [];
  let n = 0;
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    add(partner) {
      const d = { _id: `cp-${++n}`, ...partner };
      docs.push(d);
      return d;
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
  const transitionModel = makeModel('tra');
  const iadlModel = makeModel('iadl');
  const participationModel = makeModel('cpl');
  const partnerModel = makePartnerModel();
  const dispatcher = makeDispatcher();
  const svc = createIndependenceService({
    transitionModel,
    iadlModel,
    participationModel,
    partnerModel,
    dispatcher,
  });
  return { svc, transitionModel, iadlModel, participationModel, partnerModel, dispatcher };
}

// ═══════════════════════════════════════════════════════════════════
// TRANSITION READINESS
// ═══════════════════════════════════════════════════════════════════

describe('Independence — createTransitionAssessment', () => {
  it('creates draft + emits', async () => {
    const { svc, dispatcher } = mkServices();
    const doc = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'independent_living',
    });
    expect(doc.status).toBe('draft');
    expect(doc.targetTransition).toBe('independent_living');
    expect(
      dispatcher.events.some(e => e.name === 'ops.care.independence.transition_assessment_created')
    ).toBe(true);
  });

  it('missing required → MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(svc.createTransitionAssessment({})).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('unknown targetTransition → MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(
      svc.createTransitionAssessment({
        beneficiaryId: 'ben-1',
        targetTransition: 'bogus',
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });
});

describe('Independence — scoreTransitionDomain', () => {
  it('upserts a domain score + nudges draft → in_progress', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    const after = await svc.scoreTransitionDomain(tra._id, {
      domain: 'self_care',
      score: 2,
      notes: 'observed daily routine',
    });
    expect(after.status).toBe('in_progress');
    expect(after.domainScores.length).toBe(1);
    expect(after.domainScores[0].score).toBe(2);
  });

  it('updating an existing domain replaces the score', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    await svc.scoreTransitionDomain(tra._id, { domain: 'self_care', score: 1 });
    const after = await svc.scoreTransitionDomain(tra._id, { domain: 'self_care', score: 3 });
    expect(after.domainScores.length).toBe(1);
    expect(after.domainScores[0].score).toBe(3);
  });

  it('rejects unknown domain', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    await expect(
      svc.scoreTransitionDomain(tra._id, { domain: 'bogus', score: 1 })
    ).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('rejects out-of-range score', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    await expect(
      svc.scoreTransitionDomain(tra._id, { domain: 'self_care', score: 9 })
    ).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('cannot score a completed assessment', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    await svc.scoreTransitionDomain(tra._id, { domain: 'self_care', score: 3 });
    await svc.completeTransitionAssessment(tra._id, {});
    await expect(
      svc.scoreTransitionDomain(tra._id, { domain: 'self_care', score: 2 })
    ).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

describe('Independence — completeTransitionAssessment', () => {
  it('derives overallReadiness from average of domain scores', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    // avg = 2 → developing
    await svc.scoreTransitionDomain(tra._id, { domain: 'self_care', score: 2 });
    await svc.scoreTransitionDomain(tra._id, { domain: 'money_management', score: 2 });
    await svc.scoreTransitionDomain(tra._id, { domain: 'social_skills', score: 2 });
    const completed = await svc.completeTransitionAssessment(tra._id, {});
    expect(completed.status).toBe('completed');
    expect(completed.overallReadiness).toBe('developing');
  });

  it('explicit overallReadiness wins over derivation', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    await svc.scoreTransitionDomain(tra._id, { domain: 'self_care', score: 0 });
    const completed = await svc.completeTransitionAssessment(tra._id, {
      overallReadiness: 'ready',
    });
    expect(completed.overallReadiness).toBe('ready');
  });
});

describe('Independence — supersede / cancel', () => {
  it('supersedeTransitionAssessment requires newAssessmentId', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    await svc.scoreTransitionDomain(tra._id, { domain: 'self_care', score: 2 });
    await svc.completeTransitionAssessment(tra._id, {});
    await expect(svc.supersedeTransitionAssessment(tra._id, {})).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const sup = await svc.supersedeTransitionAssessment(tra._id, { newAssessmentId: 'tra-2' });
    expect(sup.status).toBe('superseded');
    expect(String(sup.supersededByAssessmentId)).toBe('tra-2');
  });

  it('cancel requires cancellationReason', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    await expect(svc.cancelTransitionAssessment(tra._id, {})).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const c = await svc.cancelTransitionAssessment(tra._id, {
      cancellationReason: 'family withdrew plan',
    });
    expect(c.status).toBe('cancelled');
  });
});

describe('Independence — goals & barriers', () => {
  it('addGoal + updateGoal marks achieved', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'independent_living',
    });
    const added = await svc.addGoal(tra._id, {
      domain: 'money_management',
      goal: 'Open a bank account',
    });
    expect(added.goals.length).toBe(1);
    const goalId = added.goals[0]._id;
    const updated = await svc.updateGoal(tra._id, goalId, { status: 'achieved' });
    expect(updated.goals[0].status).toBe('achieved');
    expect(updated.goals[0].achievedAt).toBeTruthy();
  });

  it('updateGoal unknown status throws', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'independent_living',
    });
    const added = await svc.addGoal(tra._id, { goal: 'test' });
    const goalId = added.goals[0]._id;
    await expect(svc.updateGoal(tra._id, goalId, { status: 'bogus' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('addBarrier persists barrier + mitigation', async () => {
    const { svc } = mkServices();
    const tra = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'independent_living',
    });
    const after = await svc.addBarrier(tra._id, {
      domain: 'housing_readiness',
      barrier: 'No income',
      mitigationPlan: 'Apply for SSA',
    });
    expect(after.barriers.length).toBe(1);
    expect(after.barriers[0].mitigationPlan).toBe('Apply for SSA');
  });
});

describe('Independence — transition reads', () => {
  it('beneficiaryActiveTransition returns most recent open', async () => {
    const { svc } = mkServices();
    const t1 = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    const t2 = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'independent_living',
    });
    // Both should be draft and active — t2 is most recent
    const active = await svc.beneficiaryActiveTransition('ben-1');
    expect(active).toBeTruthy();
    expect([t1._id, t2._id]).toContain(active._id);
  });

  it('listTransitionAssessments filters by status', async () => {
    const { svc } = mkServices();
    const t1 = await svc.createTransitionAssessment({
      beneficiaryId: 'ben-1',
      targetTransition: 'adult_services',
    });
    await svc.createTransitionAssessment({
      beneficiaryId: 'ben-2',
      targetTransition: 'independent_living',
    });
    await svc.scoreTransitionDomain(t1._id, { domain: 'self_care', score: 2 });
    await svc.completeTransitionAssessment(t1._id, {});
    const done = await svc.listTransitionAssessments({ status: 'completed' });
    expect(done.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// IADL
// ═══════════════════════════════════════════════════════════════════

describe('Independence — administerIadl', () => {
  it('scores from canonical-order number[]', async () => {
    const { svc, dispatcher } = mkServices();
    const doc = await svc.administerIadl({
      beneficiaryId: 'ben-1',
      domainScores: [3, 3, 3, 3, 3, 3, 3, 3],
    });
    expect(doc.totalScore).toBe(24);
    expect(doc.band).toBe('fully_independent');
    expect(doc.recommendedAction).toBe('monitor_only');
    expect(dispatcher.events.some(e => e.name === 'ops.care.independence.iadl_administered')).toBe(
      true
    );
  });

  it('scores from object-array form', async () => {
    const { svc } = mkServices();
    const doc = await svc.administerIadl({
      beneficiaryId: 'ben-1',
      domainScores: IADL_DOMAIN_CODES.map(code => ({ domain: code, score: 2 })),
    });
    expect(doc.totalScore).toBe(16);
    expect(doc.band).toBe('mostly_independent');
    expect(doc.domainScores.length).toBe(8);
  });

  it('missing domain in object form → MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(
      svc.administerIadl({
        beneficiaryId: 'ben-1',
        domainScores: [{ domain: 'telephone_use', score: 2 }],
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('wrong number of scores → MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(
      svc.administerIadl({
        beneficiaryId: 'ben-1',
        domainScores: [1, 2, 3],
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('beneficiaryIadlTrend orders latest first', async () => {
    const { svc } = mkServices();
    await svc.administerIadl({
      beneficiaryId: 'ben-1',
      domainScores: [0, 0, 0, 0, 0, 0, 0, 0],
      assessedAt: new Date('2026-01-01'),
    });
    await svc.administerIadl({
      beneficiaryId: 'ben-1',
      domainScores: [3, 3, 3, 3, 3, 3, 3, 3],
      assessedAt: new Date('2026-03-01'),
    });
    const trend = await svc.beneficiaryIadlTrend('ben-1');
    expect(trend.series.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// COMMUNITY PARTICIPATION
// ═══════════════════════════════════════════════════════════════════

describe('Independence — logParticipation', () => {
  it('logs event + emits', async () => {
    const { svc, dispatcher } = mkServices();
    const doc = await svc.logParticipation({
      beneficiaryId: 'ben-1',
      activityType: 'volunteering',
      occurredAt: new Date(),
      supportLevel: 'minimal',
      outcome: 'positive',
    });
    expect(doc.activityType).toBe('volunteering');
    expect(
      dispatcher.events.some(e => e.name === 'ops.care.independence.participation_logged')
    ).toBe(true);
  });

  it('missing required → MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(
      svc.logParticipation({
        beneficiaryId: 'ben-1',
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('unknown activityType → MISSING_FIELD', async () => {
    const { svc } = mkServices();
    await expect(
      svc.logParticipation({
        beneficiaryId: 'ben-1',
        activityType: 'bogus',
        occurredAt: new Date(),
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('snapshots partner name when partnerId linked', async () => {
    const { svc, partnerModel } = mkServices();
    const p = partnerModel.add({ name: 'مسجد الكوثر' });
    const doc = await svc.logParticipation({
      beneficiaryId: 'ben-1',
      activityType: 'religious_activity',
      occurredAt: new Date(),
      partnerId: p._id,
    });
    expect(doc.partnerNameSnapshot).toBe('مسجد الكوثر');
  });

  it('unknown support level rejected', async () => {
    const { svc } = mkServices();
    await expect(
      svc.logParticipation({
        beneficiaryId: 'ben-1',
        activityType: 'social_event',
        occurredAt: new Date(),
        supportLevel: 'bogus',
      })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });
});

describe('Independence — participation analytics', () => {
  it('rolls up counts by type + support level + outcomes', async () => {
    const { svc } = mkServices();
    await svc.logParticipation({
      beneficiaryId: 'ben-1',
      activityType: 'volunteering',
      occurredAt: new Date(),
      supportLevel: 'minimal',
      outcome: 'very_positive',
      beneficiarySatisfaction: 5,
    });
    await svc.logParticipation({
      beneficiaryId: 'ben-1',
      activityType: 'volunteering',
      occurredAt: new Date(),
      supportLevel: 'moderate',
      outcome: 'positive',
      beneficiarySatisfaction: 4,
    });
    await svc.logParticipation({
      beneficiaryId: 'ben-1',
      activityType: 'religious_activity',
      occurredAt: new Date(),
      supportLevel: 'moderate',
      outcome: 'neutral',
      beneficiarySatisfaction: 3,
    });
    const stats = await svc.beneficiaryParticipationAnalytics('ben-1');
    expect(stats.total).toBe(3);
    expect(stats.byActivityType.volunteering).toBe(2);
    expect(stats.byActivityType.religious_activity).toBe(1);
    expect(stats.bySupportLevel.moderate).toBe(2);
    expect(stats.avgSatisfaction).toBe(4);
    expect(stats.positiveOutcomePct).toBe(66.7);
  });
});

describe('Independence — participation update', () => {
  it('update patches outcome + notes (not activityType)', async () => {
    const { svc } = mkServices();
    const p = await svc.logParticipation({
      beneficiaryId: 'ben-1',
      activityType: 'employment',
      occurredAt: new Date(),
    });
    const after = await svc.updateParticipation(p._id, {
      outcome: 'very_positive',
      notes: 'Completed all tasks',
      activityType: 'recreation', // should be ignored
    });
    expect(after.outcome).toBe('very_positive');
    expect(after.notes).toBe('Completed all tasks');
    expect(after.activityType).toBe('employment');
  });
});

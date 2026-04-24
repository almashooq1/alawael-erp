'use strict';

/**
 * care-social-service.test.js — Phase 17 Commit 2 (4.0.84).
 *
 * Behaviour tests for the social case service — full lifecycle,
 * 3 SLAs (intake / plan / high-risk), transfer, close, cancel.
 */

process.env.NODE_ENV = 'test';

const { createSocialCaseService } = require('../services/care/socialCase.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeCaseModel() {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `case-${++n}`,
      caseNumber: `SC-TEST-${n}`,
      statusHistory: [],
      assessment: {},
      interventionPlan: { items: [] },
      referrals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
      save: async function () {
        // Ensure intervention items have _id
        if (this.interventionPlan && Array.isArray(this.interventionPlan.items)) {
          for (const it of this.interventionPlan.items) {
            if (!it._id) it._id = `item-${Math.random().toString(36).slice(2, 10)}`;
          }
        }
        return this;
      },
    };
    // Give items _id immediately too
    if (doc.interventionPlan && Array.isArray(doc.interventionPlan.items)) {
      for (const it of doc.interventionPlan.items) {
        if (!it._id) it._id = `item-${Math.random().toString(36).slice(2, 10)}`;
      }
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
            if (v.$nin && v.$nin.includes(d[k])) return false;
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

function baseCaseData() {
  return {
    beneficiaryId: 'ben-1',
    assignedWorkerId: 'worker-1',
    assignedWorkerNameSnapshot: 'ا. سارة',
    caseType: 'intake',
    riskLevel: 'low',
    branchId: 'branch-1',
  };
}

// ── openCase ──────────────────────────────────────────────────────

describe('SocialCase — openCase', () => {
  it('creates case + activates intake SLA + emits event', async () => {
    const caseModel = makeCaseModel();
    const engine = makeSlaEngine();
    const dispatcher = makeDispatcher();
    const svc = createSocialCaseService({ caseModel, slaEngine: engine, dispatcher });

    const doc = await svc.openCase(baseCaseData());
    expect(doc.status).toBe('intake');
    expect(doc.intakeSlaId).toBeTruthy();
    const activate = engine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'social.case.intake_to_assessment'
    );
    expect(activate).toBeDefined();
    expect(dispatcher.events.some(e => e.name === 'ops.care.social.case_opened')).toBe(true);
  });

  it('throws MISSING_FIELD without beneficiaryId or assignedWorkerId', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    await expect(svc.openCase({ beneficiaryId: 'ben-1' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    await expect(svc.openCase({ assignedWorkerId: 'w-1' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('opening at high risk auto-activates high-risk SLA', async () => {
    const caseModel = makeCaseModel();
    const engine = makeSlaEngine();
    const svc = createSocialCaseService({ caseModel, slaEngine: engine });
    const doc = await svc.openCase({ ...baseCaseData(), riskLevel: 'high' });
    expect(doc.highRiskSlaId).toBeTruthy();
    const hr = engine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'social.case.high_risk_review'
    );
    expect(hr).toBeDefined();
  });
});

// ── Risk management ───────────────────────────────────────────────

describe('SocialCase — risk management', () => {
  it('flagHighRisk upgrades + activates HR SLA', async () => {
    const caseModel = makeCaseModel();
    const engine = makeSlaEngine();
    const dispatcher = makeDispatcher();
    const svc = createSocialCaseService({ caseModel, slaEngine: engine, dispatcher });
    const c = await svc.openCase(baseCaseData()); // low risk
    const flagged = await svc.flagHighRisk(c._id, { reason: 'domestic concerns' });
    expect(flagged.riskLevel).toBe('high');
    expect(flagged.highRiskSlaId).toBeTruthy();
    expect(dispatcher.events.some(e => e.name === 'ops.care.social.risk_upgraded')).toBe(true);
  });

  it('flagHighRisk refuses low/medium values', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c = await svc.openCase(baseCaseData());
    await expect(svc.flagHighRisk(c._id, { riskLevel: 'low' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('downgradeRisk resolves HR SLA', async () => {
    const caseModel = makeCaseModel();
    const engine = makeSlaEngine();
    const svc = createSocialCaseService({ caseModel, slaEngine: engine });
    const c = await svc.openCase({ ...baseCaseData(), riskLevel: 'high' });
    engine.calls.length = 0;
    const d = await svc.downgradeRisk(c._id, { riskLevel: 'low' });
    expect(d.riskLevel).toBe('low');
    expect(d.highRiskSlaId).toBeNull();
    const resolved = engine.calls.find(
      c => c.kind === 'observe' && c.args.eventType === 'resolved'
    );
    expect(resolved).toBeDefined();
  });

  it('downgradeRisk refuses high/critical values', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c = await svc.openCase({ ...baseCaseData(), riskLevel: 'high' });
    await expect(svc.downgradeRisk(c._id, { riskLevel: 'high' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });
});

// ── Assessment ────────────────────────────────────────────────────

describe('SocialCase — assessment', () => {
  it('recordAssessment resolves intake SLA + activates plan SLA', async () => {
    const caseModel = makeCaseModel();
    const engine = makeSlaEngine();
    const svc = createSocialCaseService({ caseModel, slaEngine: engine });
    const c = await svc.openCase(baseCaseData());
    engine.calls.length = 0;

    const doc = await svc.recordAssessment(c._id, {
      assessmentSummary: 'الأسرة تحتاج دعماً اقتصادياً ومدرسياً',
      domainScores: [
        { code: 'economic', score: 4, observation: 'دخل محدود' },
        { code: 'education', score: 3 },
      ],
      priorityNeeds: ['دعم مالي طارئ', 'ربط بمدرسة'],
    });

    expect(doc.status).toBe('intervention_planned');
    expect(doc.assessment.assessmentSummary).toBe('الأسرة تحتاج دعماً اقتصادياً ومدرسياً');
    expect(doc.assessmentSummary).toBe('الأسرة تحتاج دعماً اقتصادياً ومدرسياً');
    expect(doc.planSlaId).toBeTruthy();

    const resolved = engine.calls.find(
      c => c.kind === 'observe' && c.args.eventType === 'resolved'
    );
    const activated = engine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'social.case.assessment_to_plan'
    );
    expect(resolved).toBeDefined();
    expect(activated).toBeDefined();
  });

  it('recordAssessment requires assessmentSummary', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c = await svc.openCase(baseCaseData());
    await expect(svc.recordAssessment(c._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('recordAssessment rejects on closed/transferred/cancelled status', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c = await svc.openCase(baseCaseData());
    await svc.cancelCase(c._id, { reason: 'duplicate' });
    await expect(svc.recordAssessment(c._id, { assessmentSummary: 'x' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

// ── Intervention plan ─────────────────────────────────────────────

describe('SocialCase — intervention plan', () => {
  async function seedAtPlanned(engine = null) {
    const caseModel = makeCaseModel();
    const dispatcher = makeDispatcher();
    const svc = createSocialCaseService({
      caseModel,
      slaEngine: engine,
      dispatcher,
    });
    const c = await svc.openCase(baseCaseData());
    await svc.recordAssessment(c._id, {
      assessmentSummary: 'Need plan',
    });
    return { svc, caseId: c._id, dispatcher };
  }

  it('createInterventionPlan transitions to active + resolves plan SLA', async () => {
    const engine = makeSlaEngine();
    const { svc, caseId, dispatcher } = await seedAtPlanned(engine);
    engine.calls.length = 0;

    const doc = await svc.createInterventionPlan(caseId, {
      items: [
        { type: 'welfare_application', title: 'تقديم طلب الضمان الاجتماعي' },
        { type: 'home_visit', title: 'زيارة منزلية تقييمية' },
      ],
      rationale: 'بدء خطة مزدوجة — دعم مالي + متابعة منزلية',
    });

    expect(doc.status).toBe('active');
    expect(doc.interventionPlan.items.length).toBe(2);
    expect(doc.interventionPlan.items[0].status).toBe('planned');
    const resolved = engine.calls.find(
      c => c.kind === 'observe' && c.args.eventType === 'resolved'
    );
    expect(resolved).toBeDefined();
    expect(dispatcher.events.some(e => e.name === 'ops.care.social.plan_created')).toBe(true);
  });

  it('createInterventionPlan refuses empty items', async () => {
    const { svc, caseId } = await seedAtPlanned();
    await expect(svc.createInterventionPlan(caseId, { items: [] })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('createInterventionPlan refuses outside intervention_planned status', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c = await svc.openCase(baseCaseData());
    // Still in intake status
    await expect(
      svc.createInterventionPlan(c._id, {
        items: [{ type: 'home_visit', title: 'x' }],
      })
    ).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
  });

  it('addInterventionItem appends to plan in active/monitoring', async () => {
    const { svc, caseId } = await seedAtPlanned();
    await svc.createInterventionPlan(caseId, {
      items: [{ type: 'welfare_application', title: 'a' }],
    });
    const doc = await svc.addInterventionItem(caseId, {
      type: 'charity_referral',
      title: 'إحالة لجمعية البر',
    });
    expect(doc.interventionPlan.items.length).toBe(2);
  });

  it('updateInterventionItemStatus completes item', async () => {
    const { svc, caseId } = await seedAtPlanned();
    const planned = await svc.createInterventionPlan(caseId, {
      items: [{ type: 'home_visit', title: 'زيارة' }],
    });
    const itemId = planned.interventionPlan.items[0]._id;
    const doc = await svc.updateInterventionItemStatus(caseId, itemId, {
      toStatus: 'completed',
      outcome: 'تم التقييم — وضع مستقر',
    });
    const item = doc.interventionPlan.items.find(i => String(i._id) === String(itemId));
    expect(item.status).toBe('completed');
    expect(item.outcome).toBe('تم التقييم — وضع مستقر');
    expect(item.actualCompletionDate).toBeInstanceOf(Date);
  });
});

// ── Referrals ─────────────────────────────────────────────────────

describe('SocialCase — referrals', () => {
  it('addReferral appends', async () => {
    const caseModel = makeCaseModel();
    const dispatcher = makeDispatcher();
    const svc = createSocialCaseService({ caseModel, dispatcher });
    const c = await svc.openCase(baseCaseData());
    const doc = await svc.addReferral(c._id, {
      targetOrg: 'HRSD',
      reason: 'طلب الضمان الاجتماعي',
    });
    expect(doc.referrals.length).toBe(1);
    expect(doc.referrals[0].status).toBe('pending');
    expect(dispatcher.events.some(e => e.name === 'ops.care.social.referral_sent')).toBe(true);
  });

  it('addReferral requires targetOrg', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c = await svc.openCase(baseCaseData());
    await expect(svc.addReferral(c._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });
});

// ── transferCase ──────────────────────────────────────────────────

describe('SocialCase — transfer', () => {
  it('transferCase reassigns worker + requires reason', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c = await svc.openCase(baseCaseData());
    // assessment first
    await svc.recordAssessment(c._id, { assessmentSummary: 'x' });
    await expect(svc.transferCase(c._id, { toWorkerId: 'worker-2' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const doc = await svc.transferCase(c._id, {
      toWorkerId: 'worker-2',
      reason: 'إجازة أمومة',
    });
    expect(doc.status).toBe('transferred');
    expect(doc.assignedWorkerId).toBe('worker-2');
    expect(doc.transferReason).toBe('إجازة أمومة');
  });
});

// ── close / cancel ────────────────────────────────────────────────

describe('SocialCase — close / cancel', () => {
  it('closeCase walks through closing → closed, requires outcome + summary', async () => {
    const caseModel = makeCaseModel();
    const engine = makeSlaEngine();
    const svc = createSocialCaseService({ caseModel, slaEngine: engine });
    const c = await svc.openCase(baseCaseData());
    await svc.recordAssessment(c._id, { assessmentSummary: 's' });
    await svc.createInterventionPlan(c._id, {
      items: [{ type: 'home_visit', title: 'x' }],
    });
    // Missing outcome
    await expect(svc.closeCase(c._id, { closureSummary: 'x' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    // Full close
    const doc = await svc.closeCase(c._id, {
      closureOutcome: 'goals_met',
      closureSummary: 'استقرت الأسرة + تم تفعيل الضمان',
    });
    expect(doc.status).toBe('closed');
    expect(doc.closureOutcome).toBe('goals_met');
    expect(doc.closureSummary).toBe('استقرت الأسرة + تم تفعيل الضمان');
    expect(doc.closedAt).toBeInstanceOf(Date);
  });

  it('cancelCase requires reason + transitions to cancelled', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c = await svc.openCase(baseCaseData());
    await expect(svc.cancelCase(c._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
    const doc = await svc.cancelCase(c._id, { reason: 'duplicate' });
    expect(doc.status).toBe('cancelled');
    expect(doc.closureReason).toBe('duplicate');
  });
});

// ── Caseload + analytics ──────────────────────────────────────────

describe('SocialCase — workerCaseload', () => {
  it('returns only non-terminal cases by default', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c1 = await svc.openCase({ ...baseCaseData(), assignedWorkerId: 'w-1' });
    await svc.openCase({ ...baseCaseData(), assignedWorkerId: 'w-1' });
    await svc.cancelCase(c1._id, { reason: 'dup' });
    const load = await svc.workerCaseload('w-1');
    expect(load.length).toBe(1);
  });

  it('includes terminal when requested', async () => {
    const svc = createSocialCaseService({ caseModel: makeCaseModel() });
    const c1 = await svc.openCase({ ...baseCaseData(), assignedWorkerId: 'w-1' });
    await svc.cancelCase(c1._id, { reason: 'dup' });
    const load = await svc.workerCaseload('w-1', { includeTerminal: true });
    expect(load.length).toBe(1);
  });
});

// ── Bus events ─────────────────────────────────────────────────────

describe('SocialCase — bus events', () => {
  it('emits ops.care.social.<event> + .transitioned on transitions', async () => {
    const caseModel = makeCaseModel();
    const dispatcher = makeDispatcher();
    const svc = createSocialCaseService({ caseModel, dispatcher });
    const c = await svc.openCase(baseCaseData());
    await svc.recordAssessment(c._id, { assessmentSummary: 's' });
    const names = dispatcher.events.map(e => e.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'ops.care.social.case_opened',
        'ops.care.social.assessment_completed',
        'ops.care.social.transitioned',
      ])
    );
  });
});

'use strict';

/**
 * care-welfare-service.test.js — Phase 17 Commit 4 (4.0.86).
 *
 * Exercises the welfare application lifecycle:
 * create → submit → under_review → info_requested → resume → approved
 * → disbursed, plus the appeal fork (rejected → appealed →
 * appeal_approved → disbursed) and partial-approval appeals.
 */

process.env.NODE_ENV = 'test';

const { createWelfareService } = require('../services/care/welfare.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeAppModel() {
  const docs = [];
  let n = 0;
  function shape(data) {
    const doc = {
      _id: `wa-${++n}`,
      applicationNumber: `WA-TEST-${n}`,
      statusHistory: [],
      appeals: [],
      disbursements: [],
      documents: [],
      ...data,
      save: async function () {
        for (const a of this.appeals) {
          if (!a._id) a._id = `ap-${Math.random().toString(36).slice(2, 10)}`;
        }
        for (const d of this.disbursements) {
          if (!d._id) d._id = `db-${Math.random().toString(36).slice(2, 10)}`;
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
            if (v.$gte !== undefined && !(d[k] >= v.$gte)) return false;
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

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

function baseApp() {
  return {
    beneficiaryId: 'ben-1',
    applicationType: 'ssa_pension',
    targetAgency: 'hrsd',
    requestedAmount: 1500,
    branchId: 'branch-1',
  };
}

// ── createApplication ─────────────────────────────────────────────

describe('Welfare — createApplication', () => {
  it('creates a draft + emits application_created', async () => {
    const applicationModel = makeAppModel();
    const dispatcher = makeDispatcher();
    const svc = createWelfareService({ applicationModel, dispatcher });
    const doc = await svc.createApplication(baseApp(), { actorId: 'u1' });
    expect(doc.status).toBe('draft');
    expect(doc.applicationType).toBe('ssa_pension');
    expect(dispatcher.events.some(e => e.name === 'ops.care.welfare.application_created')).toBe(
      true
    );
  });

  it('throws MISSING_FIELD when required fields absent', async () => {
    const svc = createWelfareService({ applicationModel: makeAppModel() });
    await expect(svc.createApplication({ applicationType: 'ssa_pension' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('throws MISSING_FIELD for unknown applicationType', async () => {
    const svc = createWelfareService({ applicationModel: makeAppModel() });
    await expect(
      svc.createApplication({ ...baseApp(), applicationType: 'bogus' })
    ).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });

  it('throws MISSING_FIELD for unknown targetAgency', async () => {
    const svc = createWelfareService({ applicationModel: makeAppModel() });
    await expect(
      svc.createApplication({ ...baseApp(), targetAgency: 'bogus' })
    ).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });
});

// ── submit + info_request + resume ────────────────────────────────

describe('Welfare — submit + info_request flow', () => {
  it('draft → submitted stamps submittedAt + pushes history', async () => {
    const applicationModel = makeAppModel();
    const dispatcher = makeDispatcher();
    const svc = createWelfareService({ applicationModel, dispatcher });
    const a = await svc.createApplication(baseApp());
    const b = await svc.submitApplication(a._id);
    expect(b.status).toBe('submitted');
    expect(b.submittedAt).toBeTruthy();
    expect(b.statusHistory.length).toBe(1);
    expect(b.statusHistory[0].from).toBe('draft');
    expect(b.statusHistory[0].to).toBe('submitted');
  });

  it('submitted → info_requested → under_review resume path', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    const afterInfo = await svc.recordInfoRequest(a._id, { notes: 'need ID copy' });
    expect(afterInfo.status).toBe('info_requested');
    const afterResume = await svc.resumeFromInfoRequest(a._id);
    expect(afterResume.status).toBe('under_review');
  });
});

// ── approve → disburse happy path ─────────────────────────────────

describe('Welfare — approve → disburse', () => {
  it('submitted → approved → disbursed emits correct events', async () => {
    const applicationModel = makeAppModel();
    const dispatcher = makeDispatcher();
    const svc = createWelfareService({ applicationModel, dispatcher });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    const approved = await svc.approveApplication(a._id, { approvedAmount: 1500 });
    expect(approved.status).toBe('approved');
    expect(approved.approvedAmount).toBe(1500);
    const disbursed = await svc.recordDisbursement(a._id, { amount: 1500 });
    expect(disbursed.status).toBe('disbursed');
    expect(disbursed.disbursements.length).toBe(1);
    expect(disbursed.disbursedAmount).toBe(1500);
    const names = dispatcher.events.map(e => e.name);
    expect(names).toEqual(
      expect.arrayContaining(['ops.care.welfare.approved', 'ops.care.welfare.disbursed'])
    );
  });

  it('partially_approved path accumulates subsequent disbursements', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    const partial = await svc.approveApplication(a._id, { approvedAmount: 800, partial: true });
    expect(partial.status).toBe('partially_approved');
    const first = await svc.recordDisbursement(a._id, { amount: 400 });
    expect(first.status).toBe('disbursed');
    const second = await svc.recordDisbursement(a._id, { amount: 400 });
    expect(second.status).toBe('disbursed');
    expect(second.disbursements.length).toBe(2);
    expect(second.disbursedAmount).toBe(800);
  });

  it('recordDisbursement rejects when status forbids it', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await expect(svc.recordDisbursement(a._id, { amount: 100 })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('recordDisbursement without amount throws MISSING_FIELD', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    await svc.approveApplication(a._id, { approvedAmount: 500 });
    await expect(svc.recordDisbursement(a._id, {})).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });
});

// ── reject + appeal track ─────────────────────────────────────────

describe('Welfare — reject + appeal fork', () => {
  it('submitted → rejected → appealed → appeal_approved → disbursed', async () => {
    const applicationModel = makeAppModel();
    const dispatcher = makeDispatcher();
    const svc = createWelfareService({ applicationModel, dispatcher });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    const rejected = await svc.rejectApplication(a._id, {
      rejectionReason: 'Missing income proof',
    });
    expect(rejected.status).toBe('rejected');

    const appealed = await svc.fileAppeal(a._id, { reason: 'We have the proof now' });
    expect(appealed.status).toBe('appealed');
    expect(appealed.appeals.length).toBe(1);
    expect(appealed.appeals[0].outcome).toBe('pending');

    const appealId = appealed.appeals[0]._id;
    const decided = await svc.decideAppeal(a._id, appealId, { outcome: 'approved' });
    expect(decided.status).toBe('appeal_approved');
    expect(decided.appeals[0].outcome).toBe('approved');

    const disbursed = await svc.recordDisbursement(a._id, { amount: 1200 });
    expect(disbursed.status).toBe('disbursed');
  });

  it('fileAppeal without reason throws MISSING_FIELD', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    await svc.rejectApplication(a._id, { rejectionReason: 'No' });
    await expect(svc.fileAppeal(a._id, {})).rejects.toMatchObject({ code: 'MISSING_FIELD' });
  });

  it('fileAppeal from disbursed is illegal', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    await svc.approveApplication(a._id, { approvedAmount: 500 });
    await svc.recordDisbursement(a._id, { amount: 500 });
    await expect(svc.fileAppeal(a._id, { reason: 'too low' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('cannot file a second appeal while one is pending', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    await svc.rejectApplication(a._id, { rejectionReason: 'No' });
    await svc.fileAppeal(a._id, { reason: 'try again' });
    await expect(svc.fileAppeal(a._id, { reason: 'another' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('partial approval can also be appealed', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    await svc.approveApplication(a._id, { approvedAmount: 500, partial: true });
    const appealed = await svc.fileAppeal(a._id, { reason: 'We expected 1500 not 500' });
    expect(appealed.status).toBe('appealed');
  });

  it('decideAppeal rejected requires rejectionReason', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    await svc.rejectApplication(a._id, { rejectionReason: 'No' });
    const appealed = await svc.fileAppeal(a._id, { reason: 'try again' });
    const appealId = appealed.appeals[0]._id;
    await expect(svc.decideAppeal(a._id, appealId, { outcome: 'rejected' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const decided = await svc.decideAppeal(a._id, appealId, {
      outcome: 'rejected',
      rejectionReason: 'Still ineligible',
    });
    expect(decided.status).toBe('appeal_rejected');
  });

  it('decideAppeal rejects when no appeal id found', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    await svc.rejectApplication(a._id, { rejectionReason: 'No' });
    await svc.fileAppeal(a._id, { reason: 'retry' });
    await expect(
      svc.decideAppeal(a._id, 'ap-missing', { outcome: 'approved' })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// ── cancel / close / documents ────────────────────────────────────

describe('Welfare — cancel / close / documents', () => {
  it('cancelApplication requires valid cancellationReason', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await expect(
      svc.cancelApplication(a._id, { cancellationReason: 'bogus' })
    ).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
    const cancelled = await svc.cancelApplication(a._id, { cancellationReason: 'family_withdrew' });
    expect(cancelled.status).toBe('cancelled');
  });

  it('disbursed → closed terminal reached', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await svc.submitApplication(a._id);
    await svc.approveApplication(a._id, { approvedAmount: 500 });
    await svc.recordDisbursement(a._id, { amount: 500 });
    const closed = await svc.closeApplication(a._id);
    expect(closed.status).toBe('closed');
  });

  it('addDocument pushes onto documents[]', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    const after = await svc.addDocument(a._id, { kind: 'id_copy', fileName: 'id.pdf' });
    expect(after.documents.length).toBe(1);
    expect(after.documents[0].kind).toBe('id_copy');
  });

  it('addDocument missing fields throws MISSING_FIELD', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    await expect(svc.addDocument(a._id, { kind: 'id_copy' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });
});

// ── list / history / analytics ────────────────────────────────────

describe('Welfare — reads + analytics', () => {
  it('list filters by status', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    const a = await svc.createApplication(baseApp());
    const b = await svc.createApplication({ ...baseApp(), applicationType: 'food_basket' });
    await svc.submitApplication(a._id);
    const drafts = await svc.list({ status: 'draft' });
    expect(drafts.length).toBe(1);
    expect(drafts[0]._id).toBe(b._id);
  });

  it('beneficiaryHistory returns all apps for a beneficiary', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    await svc.createApplication(baseApp());
    await svc.createApplication({ ...baseApp(), applicationType: 'medical_aid' });
    await svc.createApplication({ ...baseApp(), beneficiaryId: 'ben-2' });
    const rows = await svc.beneficiaryHistory('ben-1');
    expect(rows.length).toBe(2);
  });

  it('getAnalytics rolls up approval rate + disbursed total', async () => {
    const applicationModel = makeAppModel();
    const svc = createWelfareService({ applicationModel });
    // Manually stamp createdAt on created docs (inside the window)
    const a = await svc.createApplication(baseApp());
    a.createdAt = new Date();
    await svc.submitApplication(a._id);
    await svc.approveApplication(a._id, { approvedAmount: 1000 });
    await svc.recordDisbursement(a._id, { amount: 1000 });

    const b = await svc.createApplication(baseApp());
    b.createdAt = new Date();
    await svc.submitApplication(b._id);
    await svc.rejectApplication(b._id, { rejectionReason: 'Not eligible' });

    const stats = await svc.getAnalytics({ windowDays: 30 });
    expect(stats.total).toBe(2);
    expect(stats.submitted).toBe(2);
    expect(stats.disbursed).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.totalDisbursedSAR).toBe(1000);
    expect(stats.approvalRatePct).toBeGreaterThan(0);
  });
});

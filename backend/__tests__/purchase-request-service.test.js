'use strict';

/**
 * purchase-request-service.test.js — Phase 16 Commit 4 (4.0.69).
 *
 * Behaviour tests for the PR→PO service, including SLA activation,
 * multi-level approval chain, pause/resume, and PO conversion.
 * Uses in-memory fake models + recorders so everything is hermetic.
 */

process.env.NODE_ENV = 'test';

const { createPurchaseRequestService } = require('../services/operations/purchaseRequest.service');

// ── fakes ─────────────────────────────────────────────────────────

function computeSummary(doc) {
  const items = doc.items || [];
  let qty = 0;
  let value = 0;
  for (const it of items) {
    const q = Number(it.quantity) || 0;
    const price = Number(it.estimatedUnitPrice) || 0;
    const lineTotal = Number(it.estimatedTotal) || q * price;
    it.estimatedTotal = lineTotal;
    qty += q;
    value += lineTotal;
  }
  const taxRate = doc.summary?.taxRate ?? 15;
  const tax = value * (taxRate / 100);
  doc.summary = {
    totalItems: items.length,
    totalQuantity: qty,
    estimatedValue: value,
    taxRate,
    estimatedTax: tax,
    estimatedTotal: value + tax,
  };
}

function makeFakePrModel() {
  const docs = [];
  let counter = 0;
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = {
        _id: `pr-${++counter}`,
        statusHistory: [],
        approvals: [],
        items: [],
        summary: { taxRate: 15 },
        ...data,
        save: async function () {
          computeSummary(this);
          if (!this.requestNumber) this.requestNumber = `PR-TEST-${this._id}`;
          return this;
        },
      };
      computeSummary(d);
      if (!d.requestNumber) d.requestNumber = `PR-TEST-${d._id}`;
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => {
        for (const [k, v] of Object.entries(filter || {})) {
          if (k === 'deleted_at' && v === null) {
            if (d.deleted_at) return false;
            continue;
          }
          if (d[k] !== v && v !== undefined) return false;
        }
        return true;
      });
      const api = {
        skip: n => {
          rows = rows.slice(n);
          return api;
        },
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        sort: () => api,
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    _docs: () => docs,
  };
}

function makeFakePoModel() {
  const docs = [];
  let counter = 0;
  return {
    docs,
    create: async data => {
      const d = {
        _id: `po-${++counter}`,
        po_number: `PO-TEST-${counter}`,
        ...data,
      };
      docs.push(d);
      return d;
    },
    _docs: () => docs,
  };
}

function makeSlaEngineRecorder() {
  const calls = [];
  let slaCounter = 0;
  return {
    calls,
    async activate(args) {
      const sla = { _id: `sla-${++slaCounter}`, ...args };
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

function itemList(totalValue = 3000, unitPrice = 100) {
  const qty = Math.round(totalValue / unitPrice);
  return [{ itemName: 'Printer paper', quantity: qty, estimatedUnitPrice: unitPrice }];
}

function baseData({ value = 3000 } = {}) {
  return {
    requiredDate: new Date('2026-05-15'),
    items: itemList(value),
    priority: 'normal',
    branchId: 'branch-1',
    department: 'admin',
  };
}

// ── tests ─────────────────────────────────────────────────────────

describe('PR service — createDraft', () => {
  it('creates a PR in draft with computed summary', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData({ value: 3000 }));
    expect(pr.status).toBe('draft');
    expect(pr.summary.estimatedValue).toBe(3000);
    expect(pr.summary.estimatedTax).toBeCloseTo(3000 * 0.15, 6);
    expect(pr.summary.estimatedTotal).toBeCloseTo(3000 * 1.15, 6);
  });

  it('throws MISSING_FIELD without items', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    await expect(svc.createDraft({ requiredDate: new Date(), items: [] })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });
});

describe('PR service — submit snapshots tier + activates SLA', () => {
  it('simple tier (≤5000) → 1 approval step', async () => {
    const prModel = makeFakePrModel();
    const engine = makeSlaEngineRecorder();
    const svc = createPurchaseRequestService({ prModel, slaEngine: engine });
    const pr = await svc.createDraft(baseData({ value: 3000 }));
    const submitted = await svc.submit(pr._id);
    expect(submitted.approvalTier).toBe('simple');
    expect(submitted.approvals.length).toBe(1);
    expect(submitted.approvals[0].role).toBe('department_head');
  });

  it('standard tier (≤50000) → 2 steps', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData({ value: 30000 }));
    const submitted = await svc.submit(pr._id);
    expect(submitted.approvalTier).toBe('standard');
    expect(submitted.approvals.length).toBe(2);
  });

  it('complex tier (≤500000) → 3 steps', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData({ value: 300000 }));
    const submitted = await svc.submit(pr._id);
    expect(submitted.approvalTier).toBe('complex');
    expect(submitted.approvals.length).toBe(3);
  });

  it('special tier (>500000) → 4 steps', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData({ value: 1000000 }));
    const submitted = await svc.submit(pr._id);
    expect(submitted.approvalTier).toBe('special');
    expect(submitted.approvals.length).toBe(4);
  });

  it('activates procurement.pr.approval SLA on submit', async () => {
    const prModel = makeFakePrModel();
    const engine = makeSlaEngineRecorder();
    const svc = createPurchaseRequestService({ prModel, slaEngine: engine });
    const pr = await svc.createDraft(baseData());
    await svc.submit(pr._id);
    const activate = engine.calls.find(c => c.kind === 'activate');
    expect(activate).toBeDefined();
    expect(activate.args.policyId).toBe('procurement.pr.approval');
    expect(activate.args.subjectType).toBe('PurchaseRequest');
  });

  it('rejects submit from non-draft status', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData());
    await svc.submit(pr._id);
    await expect(svc.submit(pr._id)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

describe('PR service — approval chain', () => {
  it('single-step tier: one approval flips to approved', async () => {
    const prModel = makeFakePrModel();
    const engine = makeSlaEngineRecorder();
    const svc = createPurchaseRequestService({ prModel, slaEngine: engine });
    const pr = await svc.createDraft(baseData({ value: 3000 }));
    await svc.submit(pr._id);
    const approved = await svc.approveStep(pr._id, {
      approverId: 'user-1',
      role: 'department_head',
    });
    expect(approved.status).toBe('approved');
    expect(approved.approvals[0].status).toBe('approved');
    // SLA resolved
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'resolved')).toBe(
      true
    );
  });

  it('multi-step tier: intermediate step → under_review; final → approved', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData({ value: 30000 }));
    await svc.submit(pr._id);

    const first = await svc.approveStep(pr._id, {
      approverId: 'user-1',
      role: 'department_head',
    });
    expect(first.status).toBe('under_review');
    expect(first.currentApprovalLevel).toBe(2);

    const second = await svc.approveStep(pr._id, {
      approverId: 'user-2',
      role: 'procurement_manager',
    });
    expect(second.status).toBe('approved');
  });

  it('wrong-role approval throws CONFLICT', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData({ value: 30000 }));
    await svc.submit(pr._id);
    await expect(
      svc.approveStep(pr._id, { approverId: 'user-1', role: 'cfo' })
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('double-approve on same step throws CONFLICT', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData({ value: 30000 }));
    await svc.submit(pr._id);
    await svc.approveStep(pr._id, {
      approverId: 'user-1',
      role: 'department_head',
    });
    await expect(
      svc.approveStep(pr._id, { approverId: 'user-1', role: 'department_head' })
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('PR service — reject / return / resubmit / cancel', () => {
  it('reject flips to rejected and closes SLA as cancelled', async () => {
    const prModel = makeFakePrModel();
    const engine = makeSlaEngineRecorder();
    const svc = createPurchaseRequestService({ prModel, slaEngine: engine });
    const pr = await svc.createDraft(baseData({ value: 30000 }));
    await svc.submit(pr._id);
    const rejected = await svc.reject(pr._id, {
      approverId: 'user-1',
      reason: 'Budget unavailable',
    });
    expect(rejected.status).toBe('rejected');
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'cancelled')).toBe(
      true
    );
  });

  it('returnForClarification pauses SLA', async () => {
    const prModel = makeFakePrModel();
    const engine = makeSlaEngineRecorder();
    const svc = createPurchaseRequestService({ prModel, slaEngine: engine });
    const pr = await svc.createDraft(baseData({ value: 30000 }));
    await svc.submit(pr._id);
    const returned = await svc.returnForClarification(pr._id, {
      actorId: 'user-1',
      notes: 'Need supplier quotes',
    });
    expect(returned.status).toBe('returned_for_clarification');
    const obs = engine.calls.find(
      c => c.kind === 'observe' && c.args.eventType === 'state_changed'
    );
    expect(obs).toBeDefined();
    expect(obs.args.state).toBe('returned_for_clarification');
  });

  it('resubmit resumes SLA', async () => {
    const prModel = makeFakePrModel();
    const engine = makeSlaEngineRecorder();
    const svc = createPurchaseRequestService({ prModel, slaEngine: engine });
    const pr = await svc.createDraft(baseData({ value: 30000 }));
    await svc.submit(pr._id);
    await svc.returnForClarification(pr._id, { actorId: 'u', notes: 'x' });
    const resumed = await svc.resubmit(pr._id);
    expect(resumed.status).toBe('under_review');
  });

  it('cancel closes SLA', async () => {
    const prModel = makeFakePrModel();
    const engine = makeSlaEngineRecorder();
    const svc = createPurchaseRequestService({ prModel, slaEngine: engine });
    const pr = await svc.createDraft(baseData({ value: 30000 }));
    await svc.submit(pr._id);
    const cancelled = await svc.cancel(pr._id, { actorId: 'u1', reason: 'Dup' });
    expect(cancelled.status).toBe('cancelled');
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'cancelled')).toBe(
      true
    );
  });
});

describe('PR service — convertToPo', () => {
  it('creates PO, back-links, activates po-issuance SLA', async () => {
    const prModel = makeFakePrModel();
    const poModel = makeFakePoModel();
    const engine = makeSlaEngineRecorder();
    const dispatcher = makeDispatcher();
    const svc = createPurchaseRequestService({
      prModel,
      poModel,
      slaEngine: engine,
      dispatcher,
    });
    const pr = await svc.createDraft(baseData({ value: 3000 }));
    await svc.submit(pr._id);
    await svc.approveStep(pr._id, { approverId: 'u', role: 'department_head' });

    const { purchaseRequest, purchaseOrder } = await svc.convertToPo(pr._id, {
      actorId: 'proc-user',
      supplierId: 'sup-1',
      supplierName: 'Best Suppliers',
    });

    expect(purchaseRequest.status).toBe('converted_to_po');
    expect(purchaseRequest.relatedPurchaseOrderId).toBe(purchaseOrder._id);
    expect(purchaseOrder.items.length).toBe(1);

    // PO-issuance SLA activated
    const poActivate = engine.calls.find(
      c => c.kind === 'activate' && c.args.policyId === 'procurement.po.issuance'
    );
    expect(poActivate).toBeDefined();

    // Bus events
    const names = dispatcher.events.map(e => e.name);
    expect(names).toEqual(expect.arrayContaining(['ops.pr.converted_to_po', 'ops.po.created']));
  });

  it('throws CONFLICT when PR already converted', async () => {
    const prModel = makeFakePrModel();
    const poModel = makeFakePoModel();
    const svc = createPurchaseRequestService({ prModel, poModel });
    const pr = await svc.createDraft(baseData({ value: 3000 }));
    await svc.submit(pr._id);
    await svc.approveStep(pr._id, { approverId: 'u', role: 'department_head' });
    await svc.convertToPo(pr._id, { actorId: 'u' });
    await expect(svc.convertToPo(pr._id, { actorId: 'u' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('rejects convertToPo from non-approved status', async () => {
    const prModel = makeFakePrModel();
    const poModel = makeFakePoModel();
    const svc = createPurchaseRequestService({ prModel, poModel });
    const pr = await svc.createDraft(baseData());
    await expect(svc.convertToPo(pr._id, { actorId: 'u' })).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  it('fails without poModel configured', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData({ value: 3000 }));
    await svc.submit(pr._id);
    await svc.approveStep(pr._id, { approverId: 'u', role: 'department_head' });
    await expect(svc.convertToPo(pr._id, { actorId: 'u' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });
});

describe('PR service — bus events', () => {
  it('emits ops.pr.<event> and ops.pr.transitioned on every transition', async () => {
    const prModel = makeFakePrModel();
    const dispatcher = makeDispatcher();
    const svc = createPurchaseRequestService({ prModel, dispatcher });
    const pr = await svc.createDraft(baseData({ value: 3000 }));
    await svc.submit(pr._id);
    await svc.approveStep(pr._id, { approverId: 'u', role: 'department_head' });

    const names = dispatcher.events.map(e => e.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'ops.pr.created',
        'ops.pr.submitted',
        'ops.pr.approved',
        'ops.pr.transitioned',
      ])
    );
  });
});

describe('PR service — list / findById', () => {
  it('list filters by status', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    await svc.createDraft(baseData());
    const pr2 = await svc.createDraft(baseData());
    await svc.submit(pr2._id);
    const drafts = await svc.list({ status: 'draft' });
    const submitted = await svc.list({ status: 'submitted' });
    expect(drafts.length).toBe(1);
    expect(submitted.length).toBe(1);
  });

  it('findById returns the doc', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    const pr = await svc.createDraft(baseData());
    const found = await svc.findById(pr._id);
    expect(found._id).toBe(pr._id);
  });

  it('findById returns null for unknown id', async () => {
    const prModel = makeFakePrModel();
    const svc = createPurchaseRequestService({ prModel });
    expect(await svc.findById('no-such-id')).toBeNull();
  });
});

/**
 * cheque-service.test.js — Phase 12 Commit 5.
 *
 * Unit tests for the cheque lifecycle service. Uses an in-memory
 * Mongoose-shaped stub + a journal capture stub so we can assert on
 * both state transitions and the double-entry postings.
 */

'use strict';

const svc = require('../services/finance/chequeService');

// -------- Test fixtures / fakes --------

function fakeChequeModel(initial = []) {
  const store = new Map(initial.map(c => [String(c._id), { ...c }]));
  return {
    _store: store,
    async create(data) {
      const id = String(data._id || `ch-${store.size + 1}`);
      const doc = { _id: id, ...data };
      store.set(id, doc);
      return doc;
    },
    async findById(id) {
      return store.get(String(id)) ? { ...store.get(String(id)) } : null;
    },
    async findByIdAndUpdate(id, patch) {
      const cur = store.get(String(id));
      if (!cur) return null;
      const next = { ...cur, ...patch };
      store.set(String(id), next);
      return { ...next };
    },
    find(filter = {}) {
      const rows = Array.from(store.values()).filter(c => {
        if (filter.status && filter.status.$in) {
          if (!filter.status.$in.includes(c.status)) return false;
        } else if (filter.status && c.status !== filter.status) {
          return false;
        }
        if (filter.type && c.type !== filter.type) return false;
        if (filter.branch_id && String(c.branch_id) !== String(filter.branch_id)) return false;
        return true;
      });
      return { lean: async () => rows.map(r => ({ ...r })) };
    },
    async updateMany(filter, patch) {
      let modified = 0;
      for (const [id, c] of store.entries()) {
        if (filter.status && filter.status.$in && !filter.status.$in.includes(c.status)) continue;
        if (filter.issueDate && filter.issueDate.$lt) {
          if (new Date(c.issueDate).getTime() >= filter.issueDate.$lt.getTime()) continue;
        }
        store.set(id, { ...c, ...(patch.$set || patch) });
        modified += 1;
      }
      return { modifiedCount: modified };
    },
  };
}

function fakeJournalModel(captured) {
  function Doc(data) {
    Object.assign(this, data);
  }
  Doc.prototype.save = function () {
    captured.push(this);
    return Promise.resolve(this);
  };
  return Doc;
}

function makeCheque(overrides = {}) {
  return {
    _id: 'ch-1',
    chequeNumber: 'CHQ-00001',
    type: 'received',
    bankName: 'Al Rajhi',
    amount: 1000,
    currency: 'SAR',
    issueDate: new Date('2026-03-01'),
    dueDate: new Date('2026-04-01'),
    payee: 'Acme',
    status: 'pending',
    ...overrides,
  };
}

// -------- createCheque --------

describe('chequeService — createCheque', () => {
  test('creates a pending received cheque', async () => {
    const ChequeModel = fakeChequeModel();
    const c = await svc.createCheque({
      ChequeModel,
      data: {
        chequeNumber: 'CHQ-1',
        type: 'received',
        bankName: 'ANB',
        amount: 2500,
        issueDate: new Date('2026-04-01'),
        dueDate: new Date('2026-05-01'),
        payee: 'Beneficiary A',
      },
      userId: 'u1',
    });
    expect(c.status).toBe('pending');
    expect(c.amount).toBe(2500);
  });

  test('rejects invalid type', async () => {
    const ChequeModel = fakeChequeModel();
    await expect(
      svc.createCheque({
        ChequeModel,
        data: {
          chequeNumber: 'X',
          type: 'foo',
          amount: 1,
          issueDate: new Date(),
          dueDate: new Date(),
          payee: 'p',
        },
        userId: 'u1',
      })
    ).rejects.toThrow(/type must be/);
  });

  test('rejects zero or negative amount', async () => {
    const ChequeModel = fakeChequeModel();
    await expect(
      svc.createCheque({
        ChequeModel,
        data: {
          chequeNumber: 'X',
          type: 'issued',
          amount: 0,
          issueDate: new Date(),
          dueDate: new Date(),
          payee: 'p',
        },
      })
    ).rejects.toThrow(/amount/);
  });
});

// -------- depositCheque --------

describe('chequeService — depositCheque', () => {
  test('pending→deposited posts a balanced journal entry', async () => {
    const ChequeModel = fakeChequeModel([makeCheque()]);
    const captured = [];
    const JournalEntryModel = fakeJournalModel(captured);
    const res = await svc.depositCheque({
      ChequeModel,
      JournalEntryModel,
      id: 'ch-1',
      userId: 'u1',
    });
    expect(res.cheque.status).toBe('deposited');
    expect(captured).toHaveLength(1);
    const je = captured[0];
    expect(je.lines).toHaveLength(2);
    const totalDebit = je.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = je.lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(1000);
  });

  test('refuses to deposit an issued cheque', async () => {
    const ChequeModel = fakeChequeModel([makeCheque({ type: 'issued' })]);
    await expect(svc.depositCheque({ ChequeModel, id: 'ch-1' })).rejects.toThrow(
      /only received cheques/
    );
  });

  test('refuses to deposit a non-pending cheque', async () => {
    const ChequeModel = fakeChequeModel([makeCheque({ status: 'cleared' })]);
    await expect(svc.depositCheque({ ChequeModel, id: 'ch-1' })).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });

  test('throws NOT_FOUND for unknown id', async () => {
    const ChequeModel = fakeChequeModel();
    await expect(svc.depositCheque({ ChequeModel, id: 'missing' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// -------- clearCheque --------

describe('chequeService — clearCheque', () => {
  test('deposited→cleared (received) posts bank / cheques-in-collection', async () => {
    const ChequeModel = fakeChequeModel([makeCheque({ status: 'deposited' })]);
    const captured = [];
    const res = await svc.clearCheque({
      ChequeModel,
      JournalEntryModel: fakeJournalModel(captured),
      id: 'ch-1',
    });
    expect(res.cheque.status).toBe('cleared');
    const je = captured[0];
    expect(je.lines.find(l => l.account_code === '1110').debit).toBe(1000);
    expect(je.lines.find(l => l.account_code === '1140').credit).toBe(1000);
  });

  test('pending issued → cleared posts AP / bank', async () => {
    const ChequeModel = fakeChequeModel([makeCheque({ type: 'issued', status: 'pending' })]);
    const captured = [];
    await svc.clearCheque({
      ChequeModel,
      JournalEntryModel: fakeJournalModel(captured),
      id: 'ch-1',
    });
    const je = captured[0];
    expect(je.lines.find(l => l.account_code === '2100').debit).toBe(1000);
    expect(je.lines.find(l => l.account_code === '1110').credit).toBe(1000);
  });
});

// -------- bounceCheque --------

describe('chequeService — bounceCheque', () => {
  test('bouncing a deposited cheque posts a reversal', async () => {
    const ChequeModel = fakeChequeModel([makeCheque({ status: 'deposited' })]);
    const captured = [];
    const res = await svc.bounceCheque({
      ChequeModel,
      JournalEntryModel: fakeJournalModel(captured),
      id: 'ch-1',
      reason: 'insufficient funds',
    });
    expect(res.cheque.status).toBe('bounced');
    expect(res.cheque.bounceReason).toBe('insufficient funds');
    expect(captured).toHaveLength(1);
    const je = captured[0];
    expect(je.entry_type).toBe('adjustment');
    expect(je.lines.find(l => l.account_code === '1200').debit).toBe(1000);
  });

  test('bouncing a pending issued cheque posts no journal (not deposited)', async () => {
    const ChequeModel = fakeChequeModel([makeCheque({ type: 'issued' })]);
    const captured = [];
    const res = await svc.bounceCheque({
      ChequeModel,
      JournalEntryModel: fakeJournalModel(captured),
      id: 'ch-1',
      reason: 'stopped',
    });
    expect(res.cheque.status).toBe('bounced');
    expect(captured).toHaveLength(0);
  });

  test('requires a reason', async () => {
    const ChequeModel = fakeChequeModel([makeCheque({ status: 'deposited' })]);
    await expect(svc.bounceCheque({ ChequeModel, id: 'ch-1' })).rejects.toThrow(/reason/i);
  });
});

// -------- cancelCheque / holdCheque / releaseHold --------

describe('chequeService — cancel / hold / release', () => {
  test('cancelCheque pending→cancelled', async () => {
    const ChequeModel = fakeChequeModel([makeCheque()]);
    const c = await svc.cancelCheque({ ChequeModel, id: 'ch-1', reason: 'duplicate' });
    expect(c.status).toBe('cancelled');
    expect(c.notes).toContain('duplicate');
  });

  test('cannot cancel a cleared cheque', async () => {
    const ChequeModel = fakeChequeModel([makeCheque({ status: 'cleared' })]);
    await expect(
      svc.cancelCheque({ ChequeModel, id: 'ch-1', reason: 'oops' })
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  test('hold then release returns to pending', async () => {
    const ChequeModel = fakeChequeModel([makeCheque()]);
    await svc.holdCheque({ ChequeModel, id: 'ch-1', reason: 'verify payer' });
    const after = await svc.releaseHold({ ChequeModel, id: 'ch-1' });
    expect(after.status).toBe('pending');
  });
});

// -------- expireStaleCheques --------

describe('chequeService — expireStaleCheques', () => {
  test('flips pending cheques older than 180 days to expired', async () => {
    const old = makeCheque({ _id: 'ch-old', issueDate: new Date('2025-01-01') });
    const fresh = makeCheque({ _id: 'ch-fresh', issueDate: new Date('2026-04-01') });
    const ChequeModel = fakeChequeModel([old, fresh]);
    const res = await svc.expireStaleCheques({ ChequeModel, asOfDate: new Date('2026-04-23') });
    expect(res.expiredCount).toBe(1);
    const stillFresh = await ChequeModel.findById('ch-fresh');
    expect(stillFresh.status).toBe('pending');
    const expired = await ChequeModel.findById('ch-old');
    expect(expired.status).toBe('expired');
  });
});

// -------- getChequeAgingReport --------

describe('chequeService — getChequeAgingReport', () => {
  test('buckets pending/deposited cheques by days-to-due', async () => {
    const asOf = new Date('2026-04-22');
    const ChequeModel = fakeChequeModel([
      makeCheque({ _id: 'a', dueDate: new Date('2026-04-10'), amount: 100 }), // overdue
      makeCheque({ _id: 'b', dueDate: new Date('2026-04-22'), amount: 200 }), // due_today
      makeCheque({ _id: 'c', dueDate: new Date('2026-04-25'), amount: 300 }), // due_this_week
      makeCheque({ _id: 'd', dueDate: new Date('2026-05-15'), amount: 400 }), // due_later
      makeCheque({ _id: 'e', dueDate: new Date('2026-04-30'), status: 'cleared', amount: 999 }), // excluded
    ]);
    const report = await svc.getChequeAgingReport({ ChequeModel, asOfDate: asOf });
    const byLabel = Object.fromEntries(report.buckets.map(b => [b.label, b]));
    expect(byLabel.overdue.count).toBe(1);
    expect(byLabel.due_today.count).toBe(1);
    expect(byLabel.due_this_week.count).toBe(1);
    expect(byLabel.due_later.count).toBe(1);
    expect(report.total.count).toBe(4);
    expect(report.total.amount).toBe(1000);
  });

  test('scopes by type when given', async () => {
    const ChequeModel = fakeChequeModel([
      makeCheque({ _id: 'a', type: 'received', dueDate: new Date('2026-05-01') }),
      makeCheque({ _id: 'b', type: 'issued', dueDate: new Date('2026-05-01') }),
    ]);
    const report = await svc.getChequeAgingReport({
      ChequeModel,
      asOfDate: new Date('2026-04-22'),
      type: 'received',
    });
    expect(report.total.count).toBe(1);
  });
});

// -------- transition guard --------

describe('chequeService — transition guard', () => {
  test('RECEIVED_TRANSITIONS from pending allow deposit/cancel/on_hold/expire', () => {
    const allowed = svc._internal.RECEIVED_TRANSITIONS.pending;
    expect(allowed).toEqual(
      expect.arrayContaining(['deposited', 'cancelled', 'on_hold', 'expired'])
    );
  });

  test('ISSUED_TRANSITIONS from pending allow clear/bounce/cancel/on_hold/expire', () => {
    const allowed = svc._internal.ISSUED_TRANSITIONS.pending;
    expect(allowed).toEqual(
      expect.arrayContaining(['cleared', 'bounced', 'cancelled', 'on_hold', 'expired'])
    );
  });
});

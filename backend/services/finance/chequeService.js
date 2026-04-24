/**
 * chequeService.js — Phase 12 Commit 5.
 *
 * Full lifecycle management for cheques (issued and received).
 * Before this, routes/financeOperations.routes.js had thin CRUD but
 * no state-machine validation, no journal-entry posting on deposits/
 * clears/bounces, no ageing report for pending cheques.
 *
 * Lifecycle:
 *
 *   received (type=received):
 *     pending → deposited → cleared
 *     pending → deposited → bounced
 *     pending → cancelled
 *     pending → on_hold ↔ pending
 *     pending → expired        (auto, via expireStaleCheques())
 *
 *   issued (type=issued):
 *     pending → cleared                (paid to payee)
 *     pending → bounced                (returned unpaid)
 *     pending → cancelled              (stopped)
 *     pending → expired                (beyond statute)
 *
 * Journal entries on state changes (received type):
 *   deposit : dr cheques-in-collection (1140) / cr AR (1200)
 *   cleared : dr bank (1110) / cr cheques-in-collection (1140)
 *   bounced : reverse the deposit entry + flag
 *
 * Pure/injectable: pass in { ChequeModel, JournalEntryModel }.
 * Saudi commercial law: a cheque is legally valid for 6 months from
 * its issue date — expireStaleCheques() enforces that.
 */

'use strict';

const EXPIRY_DAYS = 180; // Saudi Commercial Law (6 months)

const RECEIVED_TRANSITIONS = {
  pending: ['deposited', 'cancelled', 'on_hold', 'expired'],
  on_hold: ['pending', 'cancelled'],
  deposited: ['cleared', 'bounced'],
  cleared: [],
  bounced: [],
  cancelled: [],
  expired: [],
};

const ISSUED_TRANSITIONS = {
  pending: ['cleared', 'bounced', 'cancelled', 'on_hold', 'expired'],
  on_hold: ['pending', 'cancelled'],
  cleared: [],
  bounced: ['pending'], // bank returned — may be re-issued
  cancelled: [],
  expired: [],
};

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function assertTransition(cheque, to) {
  const table = cheque.type === 'issued' ? ISSUED_TRANSITIONS : RECEIVED_TRANSITIONS;
  const allowed = table[cheque.status] || [];
  if (!allowed.includes(to)) {
    const err = new Error(`invalid cheque transition: ${cheque.type}/${cheque.status} → ${to}`);
    err.code = 'INVALID_TRANSITION';
    err.allowed = allowed;
    throw err;
  }
}

async function saveOrUpdate(ChequeModel, id, patch) {
  const updated = await ChequeModel.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  });
  if (!updated) {
    const err = new Error(`cheque ${id} not found`);
    err.code = 'NOT_FOUND';
    throw err;
  }
  return updated;
}

async function postJournal(JournalEntryModel, entry) {
  if (!JournalEntryModel) return null;
  const doc = new JournalEntryModel(entry);
  return doc.save();
}

/**
 * Create a new cheque record. Does not post a journal entry — that
 * happens on deposit/clear/bounce. The record starts in 'pending'.
 */
async function createCheque({ ChequeModel, data, userId }) {
  if (!data || !data.chequeNumber) {
    throw new Error('chequeNumber is required');
  }
  if (!data.type || !['issued', 'received'].includes(data.type)) {
    throw new Error('type must be "issued" or "received"');
  }
  if (!data.amount || Number(data.amount) <= 0) {
    throw new Error('amount must be > 0');
  }
  if (!data.issueDate || !data.dueDate) {
    throw new Error('issueDate and dueDate are required');
  }
  const doc = await ChequeModel.create({
    ...data,
    amount: round2(data.amount),
    status: 'pending',
    createdBy: userId || null,
  });
  return doc;
}

/**
 * Deposit a received cheque into the bank for collection.
 * Transition: pending → deposited. Posts journal entry if model given.
 */
async function depositCheque({
  ChequeModel,
  JournalEntryModel,
  id,
  depositDate,
  userId,
  accountCodes = { chequesInCollection: '1140', accountsReceivable: '1200' },
}) {
  const cheque = await ChequeModel.findById(id);
  if (!cheque) {
    const err = new Error('cheque not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (cheque.type !== 'received') {
    throw new Error('only received cheques can be deposited');
  }
  assertTransition(cheque, 'deposited');

  const updated = await saveOrUpdate(ChequeModel, id, {
    status: 'deposited',
    depositDate: depositDate || new Date(),
  });

  const journal = await postJournal(JournalEntryModel, {
    entry_type: 'payment',
    description_ar: `إيداع شيك رقم ${cheque.chequeNumber}`,
    reference_type: 'Cheque',
    reference_id: cheque._id,
    reference_number: cheque.chequeNumber,
    lines: [
      { account_code: accountCodes.chequesInCollection, debit: cheque.amount, credit: 0 },
      { account_code: accountCodes.accountsReceivable, debit: 0, credit: cheque.amount },
    ],
    status: 'posted',
    created_by: userId || null,
  });

  return { cheque: updated, journal };
}

/**
 * Mark a cheque as cleared (funds received by us for received-type,
 * or debited from us for issued-type).
 */
async function clearCheque({
  ChequeModel,
  JournalEntryModel,
  id,
  clearDate,
  userId,
  accountCodes = {
    bank: '1110',
    chequesInCollection: '1140',
    accountsPayable: '2100',
  },
}) {
  const cheque = await ChequeModel.findById(id);
  if (!cheque) {
    const err = new Error('cheque not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertTransition(cheque, 'cleared');

  const updated = await saveOrUpdate(ChequeModel, id, {
    status: 'cleared',
    clearDate: clearDate || new Date(),
  });

  const lines =
    cheque.type === 'received'
      ? [
          { account_code: accountCodes.bank, debit: cheque.amount, credit: 0 },
          { account_code: accountCodes.chequesInCollection, debit: 0, credit: cheque.amount },
        ]
      : [
          { account_code: accountCodes.accountsPayable, debit: cheque.amount, credit: 0 },
          { account_code: accountCodes.bank, debit: 0, credit: cheque.amount },
        ];

  const journal = await postJournal(JournalEntryModel, {
    entry_type: 'payment',
    description_ar: `تسوية شيك رقم ${cheque.chequeNumber}`,
    reference_type: 'Cheque',
    reference_id: cheque._id,
    reference_number: cheque.chequeNumber,
    lines,
    status: 'posted',
    created_by: userId || null,
  });

  return { cheque: updated, journal };
}

/**
 * Mark a cheque as bounced. For received-deposited cheques, posts a
 * reversal of the deposit plus a fee pass-through to the bouncer (AR).
 */
async function bounceCheque({
  ChequeModel,
  JournalEntryModel,
  id,
  reason,
  bounceDate,
  userId,
  accountCodes = { chequesInCollection: '1140', accountsReceivable: '1200' },
}) {
  if (!reason) throw new Error('bounceReason is required');
  const cheque = await ChequeModel.findById(id);
  if (!cheque) {
    const err = new Error('cheque not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertTransition(cheque, 'bounced');

  const updated = await saveOrUpdate(ChequeModel, id, {
    status: 'bounced',
    bounceDate: bounceDate || new Date(),
    bounceReason: reason,
  });

  let journal = null;
  if (cheque.type === 'received' && cheque.status === 'deposited') {
    journal = await postJournal(JournalEntryModel, {
      entry_type: 'adjustment',
      description_ar: `ارتداد شيك رقم ${cheque.chequeNumber} — ${reason}`,
      reference_type: 'Cheque',
      reference_id: cheque._id,
      reference_number: cheque.chequeNumber,
      lines: [
        { account_code: accountCodes.accountsReceivable, debit: cheque.amount, credit: 0 },
        { account_code: accountCodes.chequesInCollection, debit: 0, credit: cheque.amount },
      ],
      status: 'posted',
      created_by: userId || null,
    });
  }

  return { cheque: updated, journal };
}

async function cancelCheque({ ChequeModel, id, reason, userId }) {
  const cheque = await ChequeModel.findById(id);
  if (!cheque) {
    const err = new Error('cheque not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertTransition(cheque, 'cancelled');
  return saveOrUpdate(ChequeModel, id, {
    status: 'cancelled',
    notes: reason ? `Cancelled: ${reason}` : cheque.notes,
  });
}

async function holdCheque({ ChequeModel, id, reason }) {
  const cheque = await ChequeModel.findById(id);
  if (!cheque) {
    const err = new Error('cheque not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertTransition(cheque, 'on_hold');
  return saveOrUpdate(ChequeModel, id, {
    status: 'on_hold',
    notes: reason ? `On hold: ${reason}` : cheque.notes,
  });
}

async function releaseHold({ ChequeModel, id }) {
  const cheque = await ChequeModel.findById(id);
  if (!cheque) {
    const err = new Error('cheque not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertTransition(cheque, 'pending');
  return saveOrUpdate(ChequeModel, id, { status: 'pending' });
}

/**
 * Scan for cheques whose issueDate is more than EXPIRY_DAYS ago and
 * are still pending / on_hold. Flip them to 'expired'. Meant to be
 * run by a daily scheduler.
 */
async function expireStaleCheques({ ChequeModel, asOfDate = new Date() }) {
  const cutoff = new Date(asOfDate.getTime() - EXPIRY_DAYS * 24 * 3600 * 1000);
  const res = await ChequeModel.updateMany(
    { status: { $in: ['pending', 'on_hold'] }, issueDate: { $lt: cutoff } },
    { $set: { status: 'expired' } }
  );
  return {
    expiredCount: res.modifiedCount ?? res.nModified ?? 0,
    cutoff: cutoff.toISOString(),
  };
}

/**
 * Summary counts + aging report grouped by days-to-due (for pending +
 * deposited cheques). Useful for a dashboard widget.
 */
async function getChequeAgingReport({
  ChequeModel,
  asOfDate = new Date(),
  branchId = null,
  type = null,
}) {
  const filter = { status: { $in: ['pending', 'deposited', 'on_hold'] } };
  if (branchId) filter.branch_id = branchId;
  if (type) filter.type = type;

  const q = ChequeModel.find(filter);
  const docs = (q && typeof q.lean === 'function' ? await q.lean() : await q) || [];

  const buckets = {
    overdue: { label: 'overdue', count: 0, amount: 0 },
    due_today: { label: 'due_today', count: 0, amount: 0 },
    due_this_week: { label: 'due_this_week', count: 0, amount: 0 },
    due_later: { label: 'due_later', count: 0, amount: 0 },
  };

  const asOf = new Date(asOfDate).getTime();
  const dayMs = 24 * 3600 * 1000;

  for (const c of docs) {
    const due = c.dueDate ? new Date(c.dueDate).getTime() : null;
    if (due === null) continue;
    const days = Math.floor((due - asOf) / dayMs);
    let b;
    if (days < 0) b = buckets.overdue;
    else if (days === 0) b = buckets.due_today;
    else if (days <= 7) b = buckets.due_this_week;
    else b = buckets.due_later;
    b.count += 1;
    b.amount += Number(c.amount) || 0;
  }

  for (const k of Object.keys(buckets)) {
    buckets[k].amount = round2(buckets[k].amount);
  }

  return {
    asOfDate: new Date(asOfDate).toISOString(),
    branchId: branchId ? String(branchId) : null,
    type,
    buckets: Object.values(buckets),
    total: {
      count: docs.length,
      amount: round2(docs.reduce((s, c) => s + (Number(c.amount) || 0), 0)),
    },
  };
}

module.exports = {
  createCheque,
  depositCheque,
  clearCheque,
  bounceCheque,
  cancelCheque,
  holdCheque,
  releaseHold,
  expireStaleCheques,
  getChequeAgingReport,
  EXPIRY_DAYS,
  _internal: {
    assertTransition,
    RECEIVED_TRANSITIONS,
    ISSUED_TRANSITIONS,
  },
};

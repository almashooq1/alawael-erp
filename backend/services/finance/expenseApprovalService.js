/**
 * expenseApprovalService.js — Phase 12 Commit 2.
 *
 * Multi-level expense / procurement approval chain with segregation
 * of duties (SoD). Designed to plug on top of AccountingExpense
 * without schema surgery: the service keeps its own in-memory chain
 * state inside a lightweight store that callers can back with a DB,
 * Redis, or keep in-process for tests.
 *
 * Approval matrix (default, SAR):
 *   level 1:  amount ≤ 5,000       → supervisor
 *   level 2:  amount ≤ 25,000      → branch_manager
 *   level 3:  amount ≤ 100,000     → finance_manager
 *   level 4:  amount >  100,000    → cfo + ceo (two-hands rule)
 *
 * SoD rules (hard-enforced by approve()):
 *   - The creator of an expense can never approve their own request.
 *   - A user who already approved at level N cannot approve level N+k.
 *   - The cashier role can release payment but cannot authorize it.
 *
 * The service is pure/functional: pass an in-memory store or a DB-backed
 * adapter that implements { get(id), put(id, record) }.
 */

'use strict';

const DEFAULT_MATRIX = [
  {
    level: 1,
    maxAmount: 5000,
    roles: ['supervisor', 'branch_manager', 'finance_manager', 'cfo', 'admin'],
  },
  { level: 2, maxAmount: 25000, roles: ['branch_manager', 'finance_manager', 'cfo', 'admin'] },
  { level: 3, maxAmount: 100000, roles: ['finance_manager', 'cfo', 'admin'] },
  { level: 4, maxAmount: Infinity, roles: ['cfo', 'ceo', 'admin'], dualControl: true },
];

const PAYMENT_RELEASE_ROLES = new Set(['cashier', 'accountant', 'finance_manager', 'admin']);
const AUTHORIZATION_ONLY_ROLES = new Set([
  'supervisor',
  'branch_manager',
  'finance_manager',
  'cfo',
  'ceo',
  'admin',
]);

/**
 * In-memory store (default). Tests and callers can swap in any
 * adapter implementing the same async interface.
 */
function createMemoryStore() {
  const data = new Map();
  return {
    async get(id) {
      return data.get(String(id)) || null;
    },
    async put(id, rec) {
      data.set(String(id), { ...rec });
      return rec;
    },
    async list(filter = {}) {
      const out = [];
      for (const rec of data.values()) {
        let ok = true;
        for (const [k, v] of Object.entries(filter)) {
          if (rec[k] !== v) {
            ok = false;
            break;
          }
        }
        if (ok) out.push(rec);
      }
      return out;
    },
  };
}

function resolveChain(amount, matrix) {
  const chain = [];
  for (const step of matrix) {
    chain.push(step);
    if (amount <= step.maxAmount) break;
  }
  return chain;
}

function hasApprovingRole(user, allowedRoles) {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.some(r => allowedRoles.includes(r));
}

/**
 * Submit an expense for approval. Builds the chain from the matrix
 * based on amount, and returns the created record.
 */
async function submit({
  store,
  expenseId,
  amount,
  branchId,
  category,
  createdBy,
  matrix = DEFAULT_MATRIX,
  metadata = {},
}) {
  if (!expenseId) throw new Error('expenseId is required');
  if (!createdBy || !createdBy.userId) throw new Error('createdBy.userId is required');
  if (typeof amount !== 'number' || amount < 0)
    throw new Error('amount must be a non-negative number');

  const existing = await store.get(expenseId);
  if (existing) throw new Error(`approval chain already exists for expense ${expenseId}`);

  const chain = resolveChain(amount, matrix).map(step => ({
    level: step.level,
    maxAmount: step.maxAmount === Infinity ? null : step.maxAmount,
    allowedRoles: step.roles,
    dualControl: !!step.dualControl,
    status: 'pending',
    approvers: [],
    decidedAt: null,
  }));

  const record = {
    expenseId: String(expenseId),
    amount,
    branchId: branchId ? String(branchId) : null,
    category: category || null,
    status: 'pending',
    createdBy: { userId: String(createdBy.userId), roles: createdBy.roles || [] },
    chain,
    currentLevel: chain.length > 0 ? chain[0].level : null,
    history: [
      {
        at: new Date().toISOString(),
        action: 'submitted',
        actorId: String(createdBy.userId),
        amount,
      },
    ],
    metadata,
  };

  await store.put(expenseId, record);
  return record;
}

/**
 * Approve the current pending level. Enforces SoD:
 *   - actor != creator
 *   - actor has not approved a prior level on this chain
 *   - actor has a role whitelisted for this level
 *   - if the level is dual-control, needs two distinct approvers
 */
async function approve({ store, expenseId, actor, note }) {
  if (!actor || !actor.userId) throw new Error('actor.userId is required');
  const rec = await store.get(expenseId);
  if (!rec) throw new Error(`no approval chain for expense ${expenseId}`);
  if (rec.status !== 'pending') throw new Error(`chain is already ${rec.status}`);

  if (String(actor.userId) === String(rec.createdBy.userId)) {
    const err = new Error('segregation-of-duties: creator cannot approve their own expense');
    err.code = 'SOD_SELF_APPROVAL';
    throw err;
  }

  const alreadyApproved = rec.chain.some(step =>
    (step.approvers || []).some(a => String(a.userId) === String(actor.userId))
  );
  if (alreadyApproved) {
    const err = new Error('segregation-of-duties: actor already approved an earlier level');
    err.code = 'SOD_DUPLICATE_APPROVER';
    throw err;
  }

  if (!hasApprovingRole(actor, Array.from(AUTHORIZATION_ONLY_ROLES))) {
    const err = new Error('actor lacks any role permitted to authorize expenses');
    err.code = 'FORBIDDEN_ROLE';
    throw err;
  }

  const step = rec.chain.find(s => s.status === 'pending');
  if (!step) throw new Error('no pending level found; chain may already be complete');

  if (!hasApprovingRole(actor, step.allowedRoles)) {
    const err = new Error(
      `actor role not permitted at level ${step.level}; allowed: ${step.allowedRoles.join(', ')}`
    );
    err.code = 'FORBIDDEN_LEVEL';
    throw err;
  }

  step.approvers.push({
    userId: String(actor.userId),
    roles: actor.roles || [],
    at: new Date().toISOString(),
    note: note || null,
  });

  const required = step.dualControl ? 2 : 1;
  if (step.approvers.length >= required) {
    step.status = 'approved';
    step.decidedAt = new Date().toISOString();
    const next = rec.chain.find(s => s.status === 'pending');
    rec.currentLevel = next ? next.level : null;
    if (!next) rec.status = 'approved';
  }

  rec.history.push({
    at: new Date().toISOString(),
    action: rec.status === 'approved' ? 'final_approval' : 'level_approved',
    actorId: String(actor.userId),
    level: step.level,
  });

  await store.put(expenseId, rec);
  return rec;
}

/**
 * Reject the current pending level. Any legitimate approver can reject
 * at their level; the chain is closed as 'rejected' with a reason.
 */
async function reject({ store, expenseId, actor, reason }) {
  if (!actor || !actor.userId) throw new Error('actor.userId is required');
  if (!reason) throw new Error('reason is required when rejecting');
  const rec = await store.get(expenseId);
  if (!rec) throw new Error(`no approval chain for expense ${expenseId}`);
  if (rec.status !== 'pending') throw new Error(`chain is already ${rec.status}`);
  if (String(actor.userId) === String(rec.createdBy.userId)) {
    const err = new Error('segregation-of-duties: creator cannot reject their own expense');
    err.code = 'SOD_SELF_REJECT';
    throw err;
  }
  const step = rec.chain.find(s => s.status === 'pending');
  if (!step) throw new Error('no pending level');
  if (!hasApprovingRole(actor, step.allowedRoles)) {
    const err = new Error(`actor role not permitted at level ${step.level}`);
    err.code = 'FORBIDDEN_LEVEL';
    throw err;
  }
  step.status = 'rejected';
  step.decidedAt = new Date().toISOString();
  rec.status = 'rejected';
  rec.rejection = {
    by: String(actor.userId),
    reason,
    at: new Date().toISOString(),
    level: step.level,
  };
  rec.currentLevel = null;
  rec.history.push({
    at: new Date().toISOString(),
    action: 'rejected',
    actorId: String(actor.userId),
    level: step.level,
    reason,
  });
  await store.put(expenseId, rec);
  return rec;
}

/**
 * Release payment on an approved expense. Enforces the cashier-vs-authorizer
 * split: the person who released payment must hold a payment-release role and
 * must not appear among the chain's approvers (two-hands rule for cash).
 */
async function releasePayment({ store, expenseId, actor, note }) {
  if (!actor || !actor.userId) throw new Error('actor.userId is required');
  const rec = await store.get(expenseId);
  if (!rec) throw new Error(`no approval chain for expense ${expenseId}`);
  if (rec.status !== 'approved') {
    throw new Error(`expense must be approved before payment release (status: ${rec.status})`);
  }
  if (rec.payment && rec.payment.status === 'released') {
    throw new Error('payment already released');
  }
  if (!hasApprovingRole(actor, Array.from(PAYMENT_RELEASE_ROLES))) {
    const err = new Error('actor lacks any role permitted to release payment');
    err.code = 'FORBIDDEN_PAY_ROLE';
    throw err;
  }
  const approverIds = new Set();
  for (const s of rec.chain) {
    for (const a of s.approvers || []) approverIds.add(String(a.userId));
  }
  if (approverIds.has(String(actor.userId))) {
    const err = new Error('segregation-of-duties: payment releaser cannot be an approver');
    err.code = 'SOD_APPROVER_PAYS';
    throw err;
  }
  rec.payment = {
    status: 'released',
    by: String(actor.userId),
    at: new Date().toISOString(),
    note: note || null,
  };
  rec.history.push({
    at: new Date().toISOString(),
    action: 'payment_released',
    actorId: String(actor.userId),
  });
  await store.put(expenseId, rec);
  return rec;
}

async function getStatus({ store, expenseId }) {
  return store.get(expenseId);
}

async function listPending({ store, branchId = null, role = null }) {
  const filter = { status: 'pending' };
  if (branchId) filter.branchId = String(branchId);
  const all = await store.list(filter);
  if (!role) return all;
  return all.filter(rec => {
    const step = rec.chain.find(s => s.status === 'pending');
    return step && step.allowedRoles.includes(role);
  });
}

module.exports = {
  createMemoryStore,
  submit,
  approve,
  reject,
  releasePayment,
  getStatus,
  listPending,
  DEFAULT_MATRIX,
  PAYMENT_RELEASE_ROLES,
  _internal: { resolveChain, hasApprovingRole },
};

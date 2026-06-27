/**
 * expenseApprovalStore.mongo.js — Phase 12 Commit 4.
 *
 * MongoDB-backed adapter for expenseApprovalService's store interface.
 * Contract: async get(id), async put(id, record), async list(filter).
 *
 * The service works with plain JS objects. This adapter serialises
 * records into the ExpenseApprovalChain schema on write, and projects
 * back to the same plain shape on read — so service and route code
 * can stay ORM-agnostic.
 *
 * Usage:
 *   const ExpenseApprovalChain = require('../../models/finance/ExpenseApprovalChain');
 *   const store = createMongoStore({ Model: ExpenseApprovalChain });
 *   router.setStore(store);
 */

'use strict';

/**
 * Strip mongoose internals from a fetched doc, returning the plain
 * record shape the service expects.
 */
function project(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    expenseId: o.expenseId,
    amount: o.amount,
    branchId: o.branchId || null,
    category: o.category || null,
    status: o.status,
    currentLevel: o.currentLevel === undefined ? null : o.currentLevel,
    createdBy: o.createdBy ? { userId: o.createdBy.userId, roles: o.createdBy.roles || [] } : null,
    chain: (o.chain || []).map(s => ({
      level: s.level,
      maxAmount: s.maxAmount === null || s.maxAmount === undefined ? null : s.maxAmount,
      allowedRoles: s.allowedRoles || [],
      dualControl: !!s.dualControl,
      status: s.status,
      approvers: (s.approvers || []).map(a => ({
        userId: a.userId,
        roles: a.roles || [],
        at: a.at,
        note: a.note || null,
      })),
      decidedAt: s.decidedAt || null,
    })),
    history: (o.history || []).map(h => ({
      at: h.at,
      action: h.action,
      actorId: h.actorId || null,
      level: h.level === undefined ? null : h.level,
      amount: h.amount === undefined ? null : h.amount,
      reason: h.reason || null,
    })),
    payment: o.payment && o.payment.status ? o.payment : null,
    rejection: o.rejection && o.rejection.by ? o.rejection : null,
    metadata: o.metadata || {},
    // W442: surface __v to the service so put() can CAS-gate against
    // the exact version we read. Service treats it as opaque (just
    // copies it back unchanged); store interprets it as the
    // optimistic-concurrency token.
    __v: typeof o.__v === 'number' ? o.__v : 0,
  };
}

function createMongoStore({ Model }) {
  if (!Model) throw new Error('createMongoStore: Model is required');

  return {
    async get(id) {
      const doc = await Model.findOne({ expenseId: String(id) }).lean();
      return project(doc);
    },

    async put(id, record) {
      // W442: optimistic concurrency on the store contract. The
      // expenseApprovalService's approve/reject/etc. flows do
      // store.get → mutate-in-memory → store.put. Pre-W442 was full-
      // document replace via findOneAndUpdate({expenseId}, {$set:
      // record}) — no version check. Two concurrent approvers at
      // step.dualControl level both read approvers=[], both push their
      // approver, both call put → second's put SILENTLY OVERWRITES
      // the first, losing one approval entry. Result: chain advances
      // with only ONE recorded approver instead of two, AND audit
      // history is incomplete.
      //
      // Fix: include `__v` from the read in the filter as a CAS gate.
      // If the doc was modified concurrently, the filter fails and
      // we throw CONCURRENT_MODIFICATION so the caller (route or
      // ABAC layer) can retry / surface as 409.
      const expectedV = typeof record.__v === 'number' ? record.__v : null;
      const { __v: _ignore, ...recordNoVersion } = record;
      if (expectedV !== null) {
        // UPDATE path — CAS against the version we read.
        const updated = await Model.findOneAndUpdate(
          { expenseId: String(id), __v: expectedV },
          {
            $set: { ...recordNoVersion, expenseId: String(id) },
            $inc: { __v: 1 },
          },
          { returnDocument: 'after' }
        ).lean();
        if (updated) return project(updated);
        // CAS miss — disambiguate: doesn't exist, or version mismatch.
        const exists = await Model.exists({ expenseId: String(id) });
        if (exists) {
          const err = new Error(
            `expense ${id} was modified concurrently (expected __v=${expectedV}) — retry`
          );
          err.code = 'CONCURRENT_MODIFICATION';
          throw err;
        }
        // Doesn't exist but caller had a version — fall through to
        // upsert path. This happens when a record was deleted between
        // get and put; treat as a fresh insert.
      }
      // CREATE path (no __v) or fallback after a stale-version on a
      // deleted-then-recreated record: upsert without version filter.
      const doc = await Model.findOneAndUpdate(
        { expenseId: String(id) },
        {
          $set: { ...recordNoVersion, expenseId: String(id) },
          $setOnInsert: { __v: 0 },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      ).lean();
      return project(doc);
    },

    async list(filter = {}) {
      const q = {};
      if (filter.status) q.status = filter.status;
      if (filter.branchId) q.branchId = String(filter.branchId);
      if (filter.expenseId) q.expenseId = String(filter.expenseId);
      const docs = await Model.find(q).lean();
      return docs.map(project).filter(Boolean);
    },
  };
}

module.exports = { createMongoStore, _project: project };

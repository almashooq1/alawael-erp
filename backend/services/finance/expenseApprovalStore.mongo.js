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
      // upsert so create and update go through the same code path
      const doc = await Model.findOneAndUpdate(
        { expenseId: String(id) },
        { $set: { ...record, expenseId: String(id) } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
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

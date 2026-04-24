/**
 * redFlagOverrideLog.js — Beneficiary-360 Foundation Commit 8.
 *
 * Minimal append-only log over red-flag emergency-override events.
 * The in-memory store (Commit 3b) already rejects raises during a
 * cooldown; the GUARD (Commit 3c) decides when a user may bypass.
 * THIS service is the audit partner — every bypass produces one
 * row here.
 *
 * Design decisions:
 *
 *   1. Factory returns an async interface. In tests, the model is
 *      swapped with an in-memory double that satisfies the same
 *      shape (`create` / `find`).
 *
 *   2. Input validation is strict: `reason` must be ≥ 10 chars
 *      trimmed, `overriddenBy` and `beneficiaryId` non-empty,
 *      `blockingFlagIds` an array. We enforce these at the service
 *      layer rather than leaning on Mongoose validation so the
 *      in-memory double can run the same suite.
 */

'use strict';

const DEFAULT_MODEL = require('../models/RedFlagOverride');

function validateInput(input) {
  if (input == null || typeof input !== 'object') {
    throw new Error('redFlagOverrideLog: input must be an object');
  }
  if (typeof input.beneficiaryId !== 'string' || input.beneficiaryId.length === 0) {
    throw new Error('redFlagOverrideLog: beneficiaryId is required');
  }
  if (typeof input.overriddenBy !== 'string' || input.overriddenBy.length === 0) {
    throw new Error('redFlagOverrideLog: overriddenBy is required');
  }
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (reason.length < 10) {
    throw new Error('redFlagOverrideLog: reason must be at least 10 characters');
  }
  if (input.blockingFlagIds != null && !Array.isArray(input.blockingFlagIds)) {
    throw new Error('redFlagOverrideLog: blockingFlagIds must be an array');
  }
}

function createOverrideLog(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;

  async function record(input) {
    validateInput(input);
    const doc = await Model.create({
      beneficiaryId: input.beneficiaryId,
      overriddenBy: input.overriddenBy,
      overriddenAt: input.overriddenAt || new Date(),
      reason: input.reason.trim(),
      blockingFlagIds: input.blockingFlagIds || [],
      context: {
        sessionId: input.context?.sessionId,
        therapistId: input.context?.therapistId,
        scheduledStartTime: input.context?.scheduledStartTime,
        branchId: input.context?.branchId,
      },
    });
    return toRecord(doc);
  }

  async function listForBeneficiary(beneficiaryId, { limit = 50 } = {}) {
    if (!beneficiaryId) {
      throw new Error('redFlagOverrideLog: beneficiaryId is required');
    }
    const docs = await Model.find({ beneficiaryId }).sort({ overriddenAt: -1 }).limit(limit).lean();
    return docs.map(toRecord);
  }

  async function listRecent({ limit = 100, sinceIso } = {}) {
    const query = sinceIso ? { overriddenAt: { $gte: new Date(sinceIso) } } : {};
    const docs = await Model.find(query).sort({ overriddenAt: -1 }).limit(limit).lean();
    return docs.map(toRecord);
  }

  return Object.freeze({ record, listForBeneficiary, listRecent });
}

function toRecord(doc) {
  if (doc == null) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(plain._id),
    beneficiaryId: plain.beneficiaryId,
    overriddenBy: plain.overriddenBy,
    overriddenAt:
      plain.overriddenAt instanceof Date ? plain.overriddenAt.toISOString() : plain.overriddenAt,
    reason: plain.reason,
    blockingFlagIds: plain.blockingFlagIds || [],
    context: plain.context || {},
  };
}

module.exports = { createOverrideLog };

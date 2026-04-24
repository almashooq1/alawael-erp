'use strict';

/**
 * community.service.js — Phase 17 Commit 4 (4.0.86).
 *
 * Two coupled services in one module:
 *
 *   • Partner directory (CommunityPartner) — simple CRUD.
 *   • Linkages (CommunityLinkage) — per-beneficiary records with
 *     active/paused/ended/cancelled lifecycle.
 *
 * No SLA wiring (external long-lived relationships, not internal
 * process work). Event emission on all mutations for the
 * notification router to subscribe to.
 */

const registry = require('../../config/care/community.registry');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}
class IllegalTransitionError extends Error {
  constructor(msg, extra = {}) {
    super(msg);
    this.code = 'ILLEGAL_TRANSITION';
    Object.assign(this, extra);
  }
}
class MissingFieldError extends Error {
  constructor(fields) {
    super(`Missing required fields: ${fields.join(', ')}`);
    this.code = 'MISSING_FIELD';
    this.fields = fields;
  }
}
class ConflictError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'CONFLICT';
  }
}

function createCommunityService({
  partnerModel,
  linkageModel,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!partnerModel) throw new Error('community.service: partnerModel required');
  if (!linkageModel) throw new Error('community.service: linkageModel required');
  registry.validate();

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[Community] emit ${name} failed: ${err.message}`);
    }
  }

  function _missing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  // ── Partner CRUD ───────────────────────────────────────────────

  async function createPartner(data, { actorId = null } = {}) {
    const required = ['name', 'category'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.isValidPartnerCategory(data.category)) {
      throw new MissingFieldError([`category (unknown '${data.category}')`]);
    }

    const doc = await partnerModel.create({
      ...data,
      status: data.status || 'active',
      contacts: data.contacts || [],
      branchesServed: data.branchesServed || [],
      createdBy: actorId,
    });
    await _emit('ops.care.community.partner_created', {
      partnerId: String(doc._id),
      partnerNumber: doc.partnerNumber,
      category: doc.category,
      name: doc.name,
    });
    return doc;
  }

  async function updatePartner(id, patch, { actorId = null } = {}) {
    const doc = await partnerModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Partner not found');
    for (const [k, v] of Object.entries(patch || {})) {
      if (k === '_id' || k === 'partnerNumber') continue;
      doc[k] = v;
    }
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function deactivatePartner(id, { actorId = null } = {}) {
    const doc = await partnerModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Partner not found');
    doc.status = 'inactive';
    doc.updatedBy = actorId;
    await doc.save();
    await _emit('ops.care.community.partner_deactivated', {
      partnerId: String(doc._id),
      partnerNumber: doc.partnerNumber,
    });
    return doc;
  }

  async function addPartnerContact(id, contact, { actorId = null } = {}) {
    if (!contact?.name) throw new MissingFieldError(['name']);
    const doc = await partnerModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Partner not found');
    doc.contacts.push({
      name: contact.name,
      role: contact.role || null,
      phone: contact.phone || null,
      email: contact.email || null,
      preferredContactMethod: contact.preferredContactMethod || 'phone',
    });
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function findPartnerById(id) {
    const doc = await partnerModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function listPartners({
    category = null,
    status = null,
    branchId = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (branchId) filter.branchesServed = branchId;
    return partnerModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit);
  }

  // ── Linkage lifecycle ──────────────────────────────────────────

  async function createLinkage(data, { actorId = null } = {}) {
    const required = ['beneficiaryId', 'partnerId', 'linkageType', 'primaryPurpose', 'startDate'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.LINKAGE_TYPES.includes(data.linkageType)) {
      throw new MissingFieldError([`linkageType (unknown '${data.linkageType}')`]);
    }
    if (!registry.LINKAGE_PURPOSES.includes(data.primaryPurpose)) {
      throw new MissingFieldError([`primaryPurpose (unknown '${data.primaryPurpose}')`]);
    }

    // Verify partner exists + is active
    const partner = await partnerModel.findById(data.partnerId);
    if (!partner || partner.deleted_at) {
      throw new NotFoundError('Partner not found');
    }
    if (partner.status !== 'active') {
      throw new ConflictError(`Partner is ${partner.status} — cannot create new linkages`);
    }

    const doc = await linkageModel.create({
      ...data,
      partnerNameSnapshot: partner.name,
      status: 'active',
      createdBy: actorId,
    });

    await _emit('ops.care.community.linkage_created', {
      linkageId: String(doc._id),
      linkageNumber: doc.linkageNumber,
      beneficiaryId: String(doc.beneficiaryId),
      partnerId: String(doc.partnerId),
      partnerNameSnapshot: doc.partnerNameSnapshot,
      linkageType: doc.linkageType,
      primaryPurpose: doc.primaryPurpose,
    });

    return doc;
  }

  async function updateLinkage(id, patch, { actorId = null } = {}) {
    const doc = await linkageModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Linkage not found');
    if (['ended', 'cancelled'].includes(doc.status)) {
      throw new IllegalTransitionError(`Cannot update a ${doc.status} linkage`, {
        status: doc.status,
      });
    }
    // Don't allow changing partner or beneficiary after creation
    for (const [k, v] of Object.entries(patch || {})) {
      if (['_id', 'linkageNumber', 'beneficiaryId', 'partnerId'].includes(k)) continue;
      doc[k] = v;
    }
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function recordContact(id, { notes = null, actorId = null } = {}) {
    const doc = await linkageModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Linkage not found');
    if (doc.status !== 'active') {
      throw new IllegalTransitionError(`Linkage is ${doc.status} — cannot record contact`, {
        status: doc.status,
      });
    }
    doc.lastContactAt = now();
    if (notes) doc.outcomeNotes = notes;
    doc.updatedBy = actorId;
    await doc.save();
    await _emit('ops.care.community.linkage_contact_recorded', {
      linkageId: String(doc._id),
      linkageNumber: doc.linkageNumber,
    });
    return doc;
  }

  async function pauseLinkage(id, { reason = null, actorId = null } = {}) {
    const doc = await linkageModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Linkage not found');
    if (doc.status !== 'active') {
      throw new IllegalTransitionError(
        `Can only pause an active linkage (current='${doc.status}')`,
        { from: doc.status, to: 'paused' }
      );
    }
    doc.status = 'paused';
    if (reason) doc.outcomeNotes = reason;
    doc.updatedBy = actorId;
    await doc.save();
    await _emit('ops.care.community.linkage_paused', {
      linkageId: String(doc._id),
      linkageNumber: doc.linkageNumber,
      reason,
    });
    return doc;
  }

  async function resumeLinkage(id, { actorId = null } = {}) {
    const doc = await linkageModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Linkage not found');
    if (doc.status !== 'paused') {
      throw new IllegalTransitionError(
        `Can only resume a paused linkage (current='${doc.status}')`,
        { from: doc.status, to: 'active' }
      );
    }
    doc.status = 'active';
    doc.updatedBy = actorId;
    await doc.save();
    await _emit('ops.care.community.linkage_resumed', {
      linkageId: String(doc._id),
      linkageNumber: doc.linkageNumber,
    });
    return doc;
  }

  async function endLinkage(
    id,
    { endedReason, outcomeNotes = null, endDate = null, actorId = null } = {}
  ) {
    if (!endedReason) throw new MissingFieldError(['endedReason']);
    const doc = await linkageModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Linkage not found');
    if (['ended', 'cancelled'].includes(doc.status)) {
      throw new IllegalTransitionError(`Linkage already ${doc.status}`, {
        from: doc.status,
        to: 'ended',
      });
    }
    doc.status = 'ended';
    doc.endedReason = endedReason;
    doc.endDate = endDate ? new Date(endDate) : now();
    if (outcomeNotes) doc.outcomeNotes = outcomeNotes;
    doc.updatedBy = actorId;
    await doc.save();
    await _emit('ops.care.community.linkage_ended', {
      linkageId: String(doc._id),
      linkageNumber: doc.linkageNumber,
      endedReason,
    });
    return doc;
  }

  async function cancelLinkage(id, { reason = null, actorId = null } = {}) {
    const doc = await linkageModel.findById(id);
    if (!doc || doc.deleted_at) throw new NotFoundError('Linkage not found');
    if (doc.status !== 'active' && doc.status !== 'paused') {
      throw new IllegalTransitionError(
        `Can only cancel active/paused linkage (current='${doc.status}')`,
        { from: doc.status, to: 'cancelled' }
      );
    }
    doc.status = 'cancelled';
    doc.endedReason = reason || 'cancelled';
    doc.endDate = now();
    doc.updatedBy = actorId;
    await doc.save();
    await _emit('ops.care.community.linkage_cancelled', {
      linkageId: String(doc._id),
      linkageNumber: doc.linkageNumber,
    });
    return doc;
  }

  // ── Reads ──────────────────────────────────────────────────────

  async function findLinkageById(id) {
    const doc = await linkageModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function listLinkages({
    beneficiaryId = null,
    partnerId = null,
    caseId = null,
    status = null,
    linkageType = null,
    primaryPurpose = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (partnerId) filter.partnerId = partnerId;
    if (caseId) filter.caseId = caseId;
    if (status) filter.status = status;
    if (linkageType) filter.linkageType = linkageType;
    if (primaryPurpose) filter.primaryPurpose = primaryPurpose;
    return linkageModel.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit);
  }

  async function beneficiaryLinkages(beneficiaryId, { includeEnded = false } = {}) {
    const filter = { beneficiaryId, deleted_at: null };
    if (!includeEnded) {
      filter.status = { $in: ['active', 'paused'] };
    }
    return linkageModel.find(filter).sort({ startDate: -1 });
  }

  async function partnerLinkages(partnerId, { includeEnded = false } = {}) {
    const filter = { partnerId, deleted_at: null };
    if (!includeEnded) {
      filter.status = { $in: ['active', 'paused'] };
    }
    return linkageModel.find(filter).sort({ startDate: -1 });
  }

  return {
    // Partner
    createPartner,
    updatePartner,
    deactivatePartner,
    addPartnerContact,
    findPartnerById,
    listPartners,
    // Linkage
    createLinkage,
    updateLinkage,
    recordContact,
    pauseLinkage,
    resumeLinkage,
    endLinkage,
    cancelLinkage,
    findLinkageById,
    listLinkages,
    beneficiaryLinkages,
    partnerLinkages,
  };
}

module.exports = {
  createCommunityService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
  ConflictError,
};

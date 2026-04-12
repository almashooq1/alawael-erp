'use strict';
/**
 * ArchiveManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddArchiveManager.js
 */

const {
  DDDArchiveRecord,
  DDDRetentionPolicy,
  DDDLegalHold,
  DDDDisposalRequest,
  ARCHIVE_TYPES,
  ARCHIVE_STATUSES,
  RETENTION_CATEGORIES,
  HOLD_TYPES,
  DISPOSAL_METHODS,
  ARCHIVE_PRIORITIES,
  BUILTIN_RETENTION_POLICIES,
} = require('../models/DddArchiveManager');

const BaseCrudService = require('./base/BaseCrudService');

class ArchiveManager extends BaseCrudService {
  constructor() {
    super('ArchiveManager', {
      description: 'Document archival, retention policies, legal holds & disposal',
      version: '1.0.0',
    }, {
      archiveRecords: DDDArchiveRecord,
      retentionPolicys: DDDRetentionPolicy,
      legalHolds: DDDLegalHold,
      disposalRequests: DDDDisposalRequest,
    })
  }

  async initialize() {
    await this._seedPolicies();
    this.log('Archive Manager initialised ✓');
    return true;
  }

  async _seedPolicies() {
    for (const p of BUILTIN_RETENTION_POLICIES) {
      const exists = await DDDRetentionPolicy.findOne({ code: p.code }).lean();
      if (!exists) await DDDRetentionPolicy.create(p);
    }
  }

  /* ── Archives ── */
  async listArchives(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    return DDDArchiveRecord.find(q).sort({ archivedAt: -1 }).limit(100).lean();
  }
  async getArchive(id) { return this._getById(DDDArchiveRecord, id); }
  async createArchive(data) {
    if (!data.archiveCode) data.archiveCode = `ARC-${Date.now()}`;
    return DDDArchiveRecord.create(data);
  }
  async updateArchive(id, data) { return this._update(DDDArchiveRecord, id, data, { runValidators: true }); }
  async restoreArchive(id) {
    return DDDArchiveRecord.findByIdAndUpdate(id, { status: 'restored' }, { new: true }).lean();
  }

  /* ── Retention Policies ── */
  async listPolicies() { return this._list(DDDRetentionPolicy, { isActive: true }, { sort: { name: 1 } }); }
  async createPolicy(data) { return this._create(DDDRetentionPolicy, data); }
  async updatePolicy(id, data) { return this._update(DDDRetentionPolicy, id, data); }

  /* ── Legal Holds ── */
  async listHolds(filters = {}) {
    const q = {};
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    if (filters.type) q.type = filters.type;
    return DDDLegalHold.find(q).sort({ issuedAt: -1 }).lean();
  }
  async createHold(data) {
    if (!data.holdCode) data.holdCode = `HOLD-${Date.now()}`;
    return DDDLegalHold.create(data);
  }
  async releaseHold(id, userId, reason) {
    return DDDLegalHold.findByIdAndUpdate(
      id,
      { isActive: false, releasedAt: new Date(), releasedBy: userId, releaseReason: reason },
      { new: true }
    ).lean();
  }

  /* ── Disposal ── */
  async listDisposals(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    return DDDDisposalRequest.find(q).sort({ createdAt: -1 }).lean();
  }
  async createDisposal(data) {
    if (!data.disposalCode) data.disposalCode = `DSP-${Date.now()}`;
    return DDDDisposalRequest.create(data);
  }
  async approveDisposal(id, userId) {
    return DDDDisposalRequest.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy: userId, approvedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Analytics ── */
  async getArchiveAnalytics() {
    const [archives, policies, holds, disposals] = await Promise.all([
      DDDArchiveRecord.countDocuments(),
      DDDRetentionPolicy.countDocuments(),
      DDDLegalHold.countDocuments({ isActive: true }),
      DDDDisposalRequest.countDocuments(),
    ]);
    const pending = await DDDArchiveRecord.countDocuments({ status: 'pending_disposal' });
    return { archives, policies, activeHolds: holds, disposals, pendingDisposal: pending };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new ArchiveManager();

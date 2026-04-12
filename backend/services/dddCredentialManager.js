'use strict';
/**
 * CredentialManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddCredentialManager.js
 */

const {
  DDDCredential,
  DDDCredentialCEURecord,
  DDDVerificationLog,
  DDDComplianceRequirement,
  CREDENTIAL_TYPES,
  CREDENTIAL_STATUSES,
  ISSUING_BODIES,
  CEU_CATEGORIES,
  VERIFICATION_METHODS,
  RENEWAL_FREQUENCIES,
  BUILTIN_CREDENTIAL_TEMPLATES,
} = require('../models/DddCredentialManager');

const BaseCrudService = require('./base/BaseCrudService');

class CredentialManager extends BaseCrudService {
  constructor() {
    super('CredentialManager', {}, {
      credentials: DDDCredential,
      credentialCEURecords: DDDCredentialCEURecord,
      verificationLogs: DDDVerificationLog,
      complianceRequirements: DDDComplianceRequirement,
    });
  }

  /* ── Credentials ── */
  async createCredential(data) { return this._create(DDDCredential, data); }
  async listCredentials(filter = {}, page = 1, limit = 20) { return this._list(DDDCredential, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async getCredentialById(id) { return this._getById(DDDCredential, id); }
  async updateCredential(id, data) { return this._update(DDDCredential, id, data); }

  /* ── CEU Records ── */
  async createCEURecord(data) { return this._create(DDDCredentialCEURecord, data); }
  async listCEURecords(filter = {}, page = 1, limit = 20) { return this._list(DDDCredentialCEURecord, filter, { page: page, limit: limit, sort: { completionDate: -1 } }); }
  async getStaffCEUSummary(staffId) {
    return DDDCredentialCEURecord.aggregate([
      { $match: { staffId: new mongoose.Types.ObjectId(staffId) } },
      { $group: { _id: '$category', totalHours: { $sum: '$hoursEarned' }, count: { $sum: 1 } } },
      { $sort: { totalHours: -1 } },
    ]);
  }

  /* ── Verification ── */
  async createVerificationLog(data) { return this._create(DDDVerificationLog, data); }
  async listVerificationLogs(credentialId) {
    return DDDVerificationLog.find({ credentialId }).sort({ verifiedAt: -1 }).lean();
  }

  /* ── Compliance ── */
  async createRequirement(data) { return this._create(DDDComplianceRequirement, data); }
  async listRequirements(filter = {}) { return this._list(DDDComplianceRequirement, filter); }

  /* ── Expiring Credentials ── */
  async getExpiringCredentials(daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return DDDCredential.find({ expiryDate: { $lte: cutoff }, status: 'active' })
      .sort({ expiryDate: 1 })
      .lean();
  }

  /* ── Analytics ── */
  async getComplianceStats() {
    const [total, active, expired, pending] = await Promise.all([
      DDDCredential.countDocuments(),
      DDDCredential.countDocuments({ status: 'active' }),
      DDDCredential.countDocuments({ status: 'expired' }),
      DDDCredential.countDocuments({ status: 'pending' }),
    ]);
    return {
      total,
      active,
      expired,
      pending,
      complianceRate: total ? ((active / total) * 100).toFixed(1) : 0,
    };
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new CredentialManager();

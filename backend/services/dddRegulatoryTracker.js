'use strict';
/**
 * RegulatoryTracker Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddRegulatoryTracker.js
 */

const {
  DDDRegulatoryRequirement,
  DDDComplianceAudit,
  DDDCertification,
  DDDRegulatoryChange,
  REQUIREMENT_TYPES,
  REQUIREMENT_STATUSES,
  AUDIT_TYPES,
  AUDIT_STATUSES,
  CERTIFICATION_TYPES,
  CERTIFICATION_STATUSES,
  CHANGE_IMPACT_LEVELS,
  REGULATORY_BODIES,
  BUILTIN_REQUIREMENTS,
} = require('../models/DddRegulatoryTracker');

const BaseCrudService = require('./base/BaseCrudService');

class RegulatoryTracker extends BaseCrudService {
  constructor() {
    super('RegulatoryTracker', {
      description: 'Regulatory requirements, audits & certifications',
      version: '1.0.0',
    }, {
      regulatoryRequirements: DDDRegulatoryRequirement,
      complianceAudits: DDDComplianceAudit,
      certifications: DDDCertification,
      regulatoryChanges: DDDRegulatoryChange,
    })
  }

  async initialize() {
    for (const r of BUILTIN_REQUIREMENTS) {
      const exists = await DDDRegulatoryRequirement.findOne({ requirementCode: r.code }).lean();
      if (!exists)
        await DDDRegulatoryRequirement.create({
          requirementCode: r.code,
          name: r.name,
          nameAr: r.nameAr,
          type: r.type,
          regulatoryBody: r.body,
        });
    }
    this.log('Regulatory Tracker initialised ✓');
    return true;
  }

  /* Requirements */
  async listRequirements(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.regulatoryBody) q.regulatoryBody = filters.regulatoryBody;
    return DDDRegulatoryRequirement.find(q).sort({ name: 1 }).lean();
  }
  async getRequirement(id) { return this._getById(DDDRegulatoryRequirement, id); }
  async createRequirement(data) {
    if (!data.requirementCode) data.requirementCode = `REQ-${Date.now()}`;
    return DDDRegulatoryRequirement.create(data);
  }
  async updateRequirement(id, data) { return this._update(DDDRegulatoryRequirement, id, data); }

  /* Audits */
  async listAudits(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDComplianceAudit.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleAudit(data) {
    if (!data.auditCode) data.auditCode = `AUD-${Date.now()}`;
    return DDDComplianceAudit.create(data);
  }
  async updateAudit(id, data) { return this._update(DDDComplianceAudit, id, data); }

  /* Certifications */
  async listCertifications(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDCertification.find(q).sort({ expiryDate: 1 }).lean();
  }
  async addCertification(data) {
    if (!data.certificationCode) data.certificationCode = `CERT-${Date.now()}`;
    return DDDCertification.create(data);
  }

  /* Regulatory Changes */
  async listChanges(filters = {}) {
    const q = {};
    if (filters.impactLevel) q.impactLevel = filters.impactLevel;
    return DDDRegulatoryChange.find(q).sort({ identifiedDate: -1 }).lean();
  }
  async trackChange(data) {
    if (!data.changeCode) data.changeCode = `RCHG-${Date.now()}`;
    return DDDRegulatoryChange.create(data);
  }

  /* Analytics */
  async getRegulatoryAnalytics() {
    const [requirements, audits, certifications, changes] = await Promise.all([
      DDDRegulatoryRequirement.countDocuments(),
      DDDComplianceAudit.countDocuments(),
      DDDCertification.countDocuments(),
      DDDRegulatoryChange.countDocuments(),
    ]);
    const compliant = await DDDRegulatoryRequirement.countDocuments({ status: 'compliant' });
    const nonCompliant = await DDDRegulatoryRequirement.countDocuments({ status: 'non_compliant' });
    const activeCerts = await DDDCertification.countDocuments({ status: 'active' });
    return {
      requirements,
      compliant,
      nonCompliant,
      audits,
      certifications,
      activeCertifications: activeCerts,
      pendingChanges: changes,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new RegulatoryTracker();

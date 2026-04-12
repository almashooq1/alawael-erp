'use strict';
/**
 * LegalCaseTracker Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddLegalCaseTracker.js
 */

const {
  DDDLegalCase,
  DDDLegalDocument,
  DDDLegalParty,
  DDDLegalMilestone,
  CASE_TYPES,
  CASE_STATUSES,
  CASE_PRIORITIES,
  DOCUMENT_TYPES,
  PARTY_ROLES,
  MILESTONE_TYPES,
  BUILTIN_CASE_CATEGORIES,
} = require('../models/DddLegalCaseTracker');

const BaseCrudService = require('./base/BaseCrudService');

class LegalCaseTracker extends BaseCrudService {
  constructor() {
    super('LegalCaseTracker', {
      description: 'Legal case & litigation tracking',
      version: '1.0.0',
    }, {
      legalCases: DDDLegalCase,
      legalDocuments: DDDLegalDocument,
      legalPartys: DDDLegalParty,
      legalMilestones: DDDLegalMilestone,
    })
  }

  async initialize() {
    this.log('Legal Case Tracker initialised ✓');
    return true;
  }

  /* Cases */
  async listCases(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    return DDDLegalCase.find(q).sort({ createdAt: -1 }).limit(200).lean();
  }
  async getCase(id) { return this._getById(DDDLegalCase, id); }
  async openCase(data) {
    if (!data.caseCode) data.caseCode = `CASE-${Date.now()}`;
    return DDDLegalCase.create(data);
  }
  async updateCase(id, data) { return this._update(DDDLegalCase, id, data); }

  /* Documents */
  async listDocuments(caseId) {
    return DDDLegalDocument.find({ caseId }).sort({ filedDate: -1 }).lean();
  }
  async addDocument(data) {
    if (!data.documentCode) data.documentCode = `LDOC-${Date.now()}`;
    return DDDLegalDocument.create(data);
  }

  /* Parties */
  async listParties(caseId) {
    return DDDLegalParty.find({ caseId }).lean();
  }
  async addParty(data) { return this._create(DDDLegalParty, data); }

  /* Milestones */
  async listMilestones(caseId) {
    return DDDLegalMilestone.find({ caseId }).sort({ dueDate: 1 }).lean();
  }
  async addMilestone(data) {
    if (!data.milestoneCode) data.milestoneCode = `LMS-${Date.now()}`;
    return DDDLegalMilestone.create(data);
  }
  async completeMilestone(id) {
    return DDDLegalMilestone.findByIdAndUpdate(
      id,
      { isCompleted: true, completedDate: new Date() },
      { new: true }
    ).lean();
  }

  /* Analytics */
  async getCaseAnalytics() {
    const [total, open, active, settled, closed] = await Promise.all([
      DDDLegalCase.countDocuments(),
      DDDLegalCase.countDocuments({ status: 'open' }),
      DDDLegalCase.countDocuments({ status: 'active_litigation' }),
      DDDLegalCase.countDocuments({ status: 'settled' }),
      DDDLegalCase.countDocuments({ status: 'closed' }),
    ]);
    const overdueMilestones = await DDDLegalMilestone.countDocuments({
      isCompleted: false,
      dueDate: { $lt: new Date() },
    });
    return { total, open, activeLitigation: active, settled, closed, overdueMilestones };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new LegalCaseTracker();

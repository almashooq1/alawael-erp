'use strict';
/**
 * ContractManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddContractManager.js
 */

const {
  DDDContract,
  DDDContractTemplate,
  DDDContractAmendment,
  DDDContractObligation,
  CONTRACT_TYPES,
  CONTRACT_STATUSES,
  OBLIGATION_TYPES,
  OBLIGATION_STATUSES,
  AMENDMENT_TYPES,
  TEMPLATE_CATEGORIES,
  BUILTIN_CONTRACT_TEMPLATES,
} = require('../models/DddContractManager');

const BaseCrudService = require('./base/BaseCrudService');

class ContractManager extends BaseCrudService {
  constructor() {
    super('ContractManager', { description: 'Contract lifecycle management', version: '1.0.0' }, {
      contracts: DDDContract,
      contractTemplates: DDDContractTemplate,
      contractAmendments: DDDContractAmendment,
      contractObligations: DDDContractObligation,
    })
  }

  async initialize() {
    for (const t of BUILTIN_CONTRACT_TEMPLATES) {
      const exists = await DDDContractTemplate.findOne({ code: t.code }).lean();
      if (!exists) await DDDContractTemplate.create(t);
    }
    this.log('Contract Manager initialised ✓');
    return true;
  }

  /* Contracts */
  async listContracts(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDContract.find(q).sort({ createdAt: -1 }).limit(200).lean();
  }
  async getContract(id) { return this._getById(DDDContract, id); }
  async createContract(data) {
    if (!data.contractCode) data.contractCode = `CTR-${Date.now()}`;
    return DDDContract.create(data);
  }
  async updateContract(id, data) { return this._update(DDDContract, id, data); }

  /* Templates */
  async listTemplates(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    return DDDContractTemplate.find(q).sort({ name: 1 }).lean();
  }
  async createTemplate(data) { return this._create(DDDContractTemplate, data); }

  /* Amendments */
  async listAmendments(contractId) {
    return DDDContractAmendment.find({ contractId }).sort({ createdAt: -1 }).lean();
  }
  async createAmendment(data) {
    if (!data.amendmentCode) data.amendmentCode = `AMND-${Date.now()}`;
    return DDDContractAmendment.create(data);
  }

  /* Obligations */
  async listObligations(contractId) {
    const q = contractId ? { contractId } : {};
    return DDDContractObligation.find(q).sort({ dueDate: 1 }).lean();
  }
  async createObligation(data) {
    if (!data.obligationCode) data.obligationCode = `OBL-${Date.now()}`;
    return DDDContractObligation.create(data);
  }
  async fulfillObligation(id) {
    return DDDContractObligation.findByIdAndUpdate(
      id,
      { status: 'fulfilled', completedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* Analytics */
  async getContractAnalytics() {
    const [contracts, templates, amendments, obligations] = await Promise.all([
      DDDContract.countDocuments(),
      DDDContractTemplate.countDocuments(),
      DDDContractAmendment.countDocuments(),
      DDDContractObligation.countDocuments(),
    ]);
    const active = await DDDContract.countDocuments({ status: 'active' });
    const overdue = await DDDContractObligation.countDocuments({ status: 'overdue' });
    return { contracts, active, templates, amendments, obligations, overdueObligations: overdue };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new ContractManager();

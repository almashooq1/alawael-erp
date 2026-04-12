'use strict';
/**
 * PolicyGovernance Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddPolicyGovernance.js
 */

const {
  DDDOrganizationalPolicy,
  DDDPolicyVersion,
  DDDPolicyAcknowledgment,
  DDDGovernanceCommittee,
  POLICY_TYPES,
  POLICY_STATUSES,
  GOVERNANCE_LEVELS,
  ACKNOWLEDGMENT_STATUSES,
  COMMITTEE_TYPES,
  REVIEW_FREQUENCIES,
  BUILTIN_POLICIES,
} = require('../models/DddPolicyGovernance');

const BaseCrudService = require('./base/BaseCrudService');

class PolicyGovernance extends BaseCrudService {
  constructor() {
    super('PolicyGovernance', {
      description: 'Organisational policy & governance management',
      version: '1.0.0',
    }, {
      organizationalPolicys: DDDOrganizationalPolicy,
      policyVersions: DDDPolicyVersion,
      policyAcknowledgments: DDDPolicyAcknowledgment,
      governanceCommittees: DDDGovernanceCommittee,
    })
  }

  async initialize() {
    for (const p of BUILTIN_POLICIES) {
      const exists = await DDDOrganizationalPolicy.findOne({ policyCode: p.code }).lean();
      if (!exists)
        await DDDOrganizationalPolicy.create({
          policyCode: p.code,
          name: p.name,
          nameAr: p.nameAr,
          type: p.type,
          level: p.level,
        });
    }
    this.log('Policy Governance initialised ✓');
    return true;
  }

  /* Policies */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDOrganizationalPolicy.find(q).sort({ name: 1 }).lean();
  }
  async getPolicy(id) { return this._getById(DDDOrganizationalPolicy, id); }
  async createPolicy(data) {
    if (!data.policyCode) data.policyCode = `POL-${Date.now()}`;
    return DDDOrganizationalPolicy.create(data);
  }
  async updatePolicy(id, data) { return this._update(DDDOrganizationalPolicy, id, data); }

  /* Versions */
  async listVersions(policyId) {
    return DDDPolicyVersion.find({ policyId }).sort({ versionNumber: -1 }).lean();
  }
  async createVersion(data) { return this._create(DDDPolicyVersion, data); }

  /* Acknowledgments */
  async listAcknowledgments(policyId) {
    return DDDPolicyAcknowledgment.find({ policyId }).lean();
  }
  async requestAcknowledgment(data) { return this._create(DDDPolicyAcknowledgment, data); }
  async acknowledge(id) {
    return DDDPolicyAcknowledgment.findByIdAndUpdate(
      id,
      { status: 'acknowledged', acknowledgedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* Committees */
  async listCommittees() {
    return DDDGovernanceCommittee.find({ isActive: true }).lean();
  }
  async createCommittee(data) {
    if (!data.committeeCode) data.committeeCode = `CMT-${Date.now()}`;
    return DDDGovernanceCommittee.create(data);
  }

  /* Analytics */
  async getPolicyAnalytics() {
    const [policies, versions, acknowledgments, committees] = await Promise.all([
      DDDOrganizationalPolicy.countDocuments(),
      DDDPolicyVersion.countDocuments(),
      DDDPolicyAcknowledgment.countDocuments(),
      DDDGovernanceCommittee.countDocuments(),
    ]);
    const active = await DDDOrganizationalPolicy.countDocuments({
      status: { $in: ['published', 'active'] },
    });
    const pendingAck = await DDDPolicyAcknowledgment.countDocuments({ status: 'pending' });
    return {
      policies,
      activePolicies: active,
      versions,
      acknowledgments,
      pendingAcknowledgments: pendingAck,
      committees,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new PolicyGovernance();

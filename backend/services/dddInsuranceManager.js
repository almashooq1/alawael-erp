'use strict';
/**
 * InsuranceManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddInsuranceManager.js
 */

const {
  DDDInsuranceProvider,
  DDDInsurancePolicy,
  DDDPreAuthorization,
  DDDCoverageRule,
  PROVIDER_TYPES,
  POLICY_STATUSES,
  COVERAGE_TYPES,
  PREAUTH_STATUSES,
  NETWORK_TIERS,
  BENEFIT_CATEGORIES,
  PREAUTH_URGENCY,
  BUILTIN_PROVIDERS,
} = require('../models/DddInsuranceManager');

const BaseCrudService = require('./base/BaseCrudService');

class InsuranceManager extends BaseCrudService {
  constructor() {
    super('InsuranceManager', {
      description: 'Insurance verification, coverage rules, pre-authorization & provider network',
      version: '1.0.0',
    }, {
      insuranceProviders: DDDInsuranceProvider,
      insurancePolicys: DDDInsurancePolicy,
      preAuthorizations: DDDPreAuthorization,
      coverageRules: DDDCoverageRule,
    })
  }

  async initialize() {
    await this._seedProviders();
    this.log('Insurance Manager initialised ✓');
    return true;
  }

  async _seedProviders() {
    for (const p of BUILTIN_PROVIDERS) {
      const exists = await DDDInsuranceProvider.findOne({ code: p.code }).lean();
      if (!exists) await DDDInsuranceProvider.create(p);
    }
  }

  async _nextAuthNumber() {
    const count = await DDDPreAuthorization.countDocuments();
    return `PA-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  /* ── Provider CRUD ── */
  async listProviders(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDInsuranceProvider.find(q).sort({ name: 1 }).lean();
  }
  async getProvider(id) { return this._getById(DDDInsuranceProvider, id); }
  async createProvider(data) { return this._create(DDDInsuranceProvider, data); }
  async updateProvider(id, data) { return this._update(DDDInsuranceProvider, id, data, { runValidators: true }); }

  /* ── Policy CRUD ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.providerId) q.providerId = filters.providerId;
    if (filters.status) q.status = filters.status;
    return DDDInsurancePolicy.find(q)
      .populate('providerId', 'name nameAr code')
      .sort({ effectiveDate: -1 })
      .lean();
  }
  async getPolicy(id) {
    return DDDInsurancePolicy.findById(id).populate('providerId').lean();
  }
  async createPolicy(data) { return this._create(DDDInsurancePolicy, data); }
  async updatePolicy(id, data) { return this._update(DDDInsurancePolicy, id, data, { runValidators: true }); }

  async verifyPolicy(id, userId, notes) {
    return DDDInsurancePolicy.findByIdAndUpdate(
      id,
      {
        verifiedAt: new Date(),
        verifiedBy: userId,
        verificationNotes: notes,
      },
      { new: true }
    ).lean();
  }

  /** Check coverage eligibility for a service */
  async checkCoverage(policyId, serviceCategory) {
    const policy = await DDDInsurancePolicy.findById(policyId).lean();
    if (!policy) return { eligible: false, reason: 'Policy not found' };
    if (policy.status !== 'active')
      return { eligible: false, reason: `Policy status: ${policy.status}` };
    if (new Date() > new Date(policy.expiryDate))
      return { eligible: false, reason: 'Policy expired' };

    const benefit = (policy.benefits || []).find(b => b.category === serviceCategory);
    if (!benefit)
      return {
        eligible: true,
        coverageType: 'full',
        coPayPercent: 0,
        notes: 'No specific limits found',
      };

    if (benefit.maxSessions && benefit.usedSessions >= benefit.maxSessions) {
      return { eligible: false, reason: 'Session limit exhausted' };
    }
    if (benefit.maxAmount && benefit.usedAmount >= benefit.maxAmount) {
      return { eligible: false, reason: 'Benefit amount exhausted' };
    }

    return {
      eligible: true,
      coverageType: benefit.coverageType,
      coPayPercent: benefit.coPayPercent || 0,
      coPayFixed: benefit.coPayFixed || 0,
      remainingSessions: benefit.maxSessions ? benefit.maxSessions - benefit.usedSessions : null,
      remainingAmount: benefit.maxAmount ? benefit.maxAmount - benefit.usedAmount : null,
      preAuthRequired: benefit.preAuthRequired || false,
    };
  }

  /** Calculate patient share for a service */
  calculatePatientShare(totalAmount, coverageResult) {
    if (!coverageResult.eligible) return { patientShare: totalAmount, insuranceShare: 0 };
    if (coverageResult.coverageType === 'full')
      return { patientShare: 0, insuranceShare: totalAmount };
    if (coverageResult.coverageType === 'excluded')
      return { patientShare: totalAmount, insuranceShare: 0 };

    let patientShare = 0;
    if (coverageResult.coPayFixed) {
      patientShare = coverageResult.coPayFixed;
    } else if (coverageResult.coPayPercent) {
      patientShare = totalAmount * (coverageResult.coPayPercent / 100);
    }
    patientShare = Math.min(patientShare, totalAmount);
    return {
      patientShare: Math.round(patientShare * 100) / 100,
      insuranceShare: Math.round((totalAmount - patientShare) * 100) / 100,
    };
  }

  /* ── Pre-Authorization CRUD ── */
  async listPreAuths(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.policyId) q.policyId = filters.policyId;
    if (filters.status) q.status = filters.status;
    if (filters.urgency) q.urgency = filters.urgency;
    return DDDPreAuthorization.find(q).sort({ createdAt: -1 }).lean();
  }
  async getPreAuth(id) { return this._getById(DDDPreAuthorization, id); }

  async createPreAuth(data) {
    data.authNumber = data.authNumber || (await this._nextAuthNumber());
    data.history = [{ action: 'created', date: new Date(), actor: 'system' }];
    return DDDPreAuthorization.create(data);
  }

  async submitPreAuth(id, userId) {
    return DDDPreAuthorization.findByIdAndUpdate(
      id,
      {
        status: 'submitted',
        submittedAt: new Date(),
        submittedBy: userId,
        $push: { history: { action: 'submitted', date: new Date(), actor: String(userId) } },
      },
      { new: true }
    ).lean();
  }

  async approvePreAuth(id, reviewer, approvals) {
    const update = {
      status: 'approved',
      approvedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: reviewer,
      $push: { history: { action: 'approved', date: new Date(), actor: reviewer } },
    };
    if (approvals) update['requestedServices'] = approvals;
    return DDDPreAuthorization.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  async denyPreAuth(id, reviewer, reason) {
    return DDDPreAuthorization.findByIdAndUpdate(
      id,
      {
        status: 'denied',
        deniedAt: new Date(),
        denialReason: reason,
        reviewedAt: new Date(),
        reviewedBy: reviewer,
        $push: { history: { action: 'denied', date: new Date(), actor: reviewer, notes: reason } },
      },
      { new: true }
    ).lean();
  }

  /* ── Coverage Rules CRUD ── */
  async listCoverageRules(filters = {}) {
    const q = {};
    if (filters.providerId) q.providerId = filters.providerId;
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDCoverageRule.find(q).sort({ category: 1 }).lean();
  }
  async getCoverageRule(id) { return this._getById(DDDCoverageRule, id); }
  async createCoverageRule(data) { return this._create(DDDCoverageRule, data); }
  async updateCoverageRule(id, data) { return this._update(DDDCoverageRule, id, data, { runValidators: true }); }

  /* ── Expiring Policies ── */
  async getExpiringPolicies(withinDays = 30) {
    const future = new Date();
    future.setDate(future.getDate() + withinDays);
    return DDDInsurancePolicy.find({
      status: 'active',
      expiryDate: { $lte: future, $gte: new Date() },
    })
      .populate('providerId', 'name nameAr code')
      .sort({ expiryDate: 1 })
      .lean();
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new InsuranceManager();

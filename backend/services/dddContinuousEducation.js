'use strict';
/**
 * ContinuousEducation Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddContinuousEducation.js
 */

const {
  DDDCEURecord,
  DDDProfDevPlan,
  DDDAccreditedProvider,
  DDDCEURequirement,
  CEU_CATEGORIES,
  CEU_ACTIVITY_TYPES,
  CEU_STATUSES,
  DEV_PLAN_STATUSES,
  DEV_GOAL_STATUSES,
  ACCREDITATION_TYPES,
  RENEWAL_CYCLES,
  BUILTIN_CEU_REQUIREMENTS,
} = require('../models/DddContinuousEducation');

const BaseCrudService = require('./base/BaseCrudService');

class ContinuousEducation extends BaseCrudService {
  constructor() {
    super('ContinuousEducation', {
      description: 'CEU tracking, professional development plans, accreditation & CE compliance',
      version: '1.0.0',
    }, {
      cEURecords: DDDCEURecord,
      profDevPlans: DDDProfDevPlan,
      accreditedProviders: DDDAccreditedProvider,
      cEURequirements: DDDCEURequirement,
    })
  }

  async initialize() {
    await this._seedRequirements();
    this.log('Continuous Education initialised ✓');
    return true;
  }

  async _seedRequirements() {
    for (const r of BUILTIN_CEU_REQUIREMENTS) {
      const exists = await DDDCEURequirement.findOne({ code: r.code }).lean();
      if (!exists) await DDDCEURequirement.create(r);
    }
  }

  /* ── CEU Record CRUD ── */
  async listCEURecords(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.category) q.category = filters.category;
    if (filters.status) q.status = filters.status;
    if (filters.activityType) q.activityType = filters.activityType;
    if (filters.from || filters.to) {
      q.activityDate = {};
      if (filters.from) q.activityDate.$gte = new Date(filters.from);
      if (filters.to) q.activityDate.$lte = new Date(filters.to);
    }
    return DDDCEURecord.find(q).sort({ activityDate: -1 }).lean();
  }
  async getCEURecord(id) { return this._getById(DDDCEURecord, id); }
  async createCEURecord(data) { return this._create(DDDCEURecord, data); }
  async updateCEURecord(id, data) { return this._update(DDDCEURecord, id, data, { runValidators: true }); }

  async approveCEURecord(id, userId) {
    return DDDCEURecord.findByIdAndUpdate(
      id,
      { status: 'approved', verifiedAt: new Date(), verifiedBy: userId },
      { new: true }
    ).lean();
  }
  async rejectCEURecord(id, reason) {
    return DDDCEURecord.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    ).lean();
  }

  /* ── CEU Compliance ── */
  async getCEUCompliance(userId, requirementCode) {
    const req = await DDDCEURequirement.findOne({ code: requirementCode }).lean();
    if (!req) throw new Error('CEU requirement not found');

    const records = await DDDCEURecord.find({ userId, status: 'approved' }).lean();
    const totalEarned = records.reduce((s, r) => s + (r.credits || 0), 0);
    const ethicsEarned = records
      .filter(r => r.category === 'professional_ethics')
      .reduce((s, r) => s + (r.credits || 0), 0);
    const byCategory = {};
    for (const r of records) {
      byCategory[r.category] = (byCategory[r.category] || 0) + r.credits;
    }

    return {
      requirement: req,
      totalRequired: req.totalCredits,
      totalEarned,
      remaining: Math.max(0, req.totalCredits - totalEarned),
      ethicsRequired: req.minEthics,
      ethicsEarned,
      ethicsRemaining: Math.max(0, req.minEthics - ethicsEarned),
      compliant: totalEarned >= req.totalCredits && ethicsEarned >= req.minEthics,
      byCategory,
      records,
    };
  }

  /* ── Professional Dev Plan CRUD ── */
  async listDevPlans(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.status) q.status = filters.status;
    return DDDProfDevPlan.find(q).sort({ createdAt: -1 }).lean();
  }
  async getDevPlan(id) { return this._getById(DDDProfDevPlan, id); }

  async createDevPlan(data) {
    data.overallProgress = 0;
    return DDDProfDevPlan.create(data);
  }

  async updateDevPlan(id, data) { return this._update(DDDProfDevPlan, id, data, { runValidators: true }); }

  async updateGoalProgress(planId, goalId, progressData) {
    const plan = await DDDProfDevPlan.findById(planId);
    if (!plan) throw new Error('Plan not found');
    const goal = plan.goals.id(goalId);
    if (!goal) throw new Error('Goal not found');
    Object.assign(goal, progressData);
    if (goal.progress >= 100) {
      goal.status = 'completed';
      goal.completedAt = new Date();
    } else if (goal.progress > 0) {
      goal.status = 'in_progress';
    }
    // Recalculate overall
    const total = plan.goals.length || 1;
    plan.overallProgress = Math.round(plan.goals.reduce((s, g) => s + g.progress, 0) / total);
    if (plan.goals.every(g => g.status === 'completed' || g.status === 'cancelled')) {
      plan.status = 'completed';
    }
    await plan.save();
    return plan;
  }

  async approveDevPlan(id, userId, notes) {
    return DDDProfDevPlan.findByIdAndUpdate(
      id,
      {
        status: 'active',
        approvedAt: new Date(),
        approvedBy: userId,
        reviewNotes: notes,
      },
      { new: true }
    ).lean();
  }

  /* ── Accredited Provider CRUD ── */
  async listProviders(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDAccreditedProvider.find(q).sort({ name: 1 }).lean();
  }
  async getProvider(id) { return this._getById(DDDAccreditedProvider, id); }
  async createProvider(data) { return this._create(DDDAccreditedProvider, data); }
  async updateProvider(id, data) { return this._update(DDDAccreditedProvider, id, data, { runValidators: true }); }

  /* ── CEU Requirement CRUD ── */
  async listRequirements(filters = {}) {
    const q = {};
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDCEURequirement.find(q).sort({ role: 1 }).lean();
  }
  async getRequirement(id) { return this._getById(DDDCEURequirement, id); }
  async createRequirement(data) { return this._create(DDDCEURequirement, data); }
  async updateRequirement(id, data) { return this._update(DDDCEURequirement, id, data, { runValidators: true }); }

  /* ── Analytics ── */
  async getCEUDashboard(userId) {
    const records = await DDDCEURecord.find({ userId, status: 'approved' }).lean();
    const plans = await DDDProfDevPlan.find({
      userId,
      status: { $in: ['active', 'completed'] },
    }).lean();
    const totalCredits = records.reduce((s, r) => s + (r.credits || 0), 0);
    const byCategory = {};
    for (const r of records) {
      byCategory[r.category] = (byCategory[r.category] || 0) + r.credits;
    }
    const byYear = {};
    for (const r of records) {
      const y = new Date(r.activityDate).getFullYear();
      byYear[y] = (byYear[y] || 0) + r.credits;
    }
    return {
      userId,
      totalCredits,
      byCategory,
      byYear,
      totalRecords: records.length,
      activePlans: plans.filter(p => p.status === 'active').length,
    };
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new ContinuousEducation();

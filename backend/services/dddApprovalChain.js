'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Approval Chain — Phase 15 (3/4)
 *  Multi-level approvals, delegation, escalation, audit trail
 * ═══════════════════════════════════════════════════════════════
 */

const { APPROVAL_TYPES, APPROVAL_STATUSES, ESCALATION_TRIGGERS, DELEGATION_TYPES, BUILTIN_APPROVAL_POLICIES } = require('../models/DddApprovalChain');

const BaseCrudService = require('./base/BaseCrudService');

class ApprovalChainService extends BaseCrudService {
  /* ── Policies CRUD ── */
  async listPolicies(filter = {}) {
    const q = { isActive: true };
    if (filter.type) q.type = filter.type;
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDApprovalPolicy.find(q)
        .sort({ type: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDApprovalPolicy.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getPolicy(id) {
    return DDDApprovalPolicy.findById(oid(id)).lean();
  }
  async createPolicy(data) { return this._create(DDDApprovalPolicy, data); }
  async updatePolicy(id, data) {
    return DDDApprovalPolicy.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  /* ── Requests ── */
  async createRequest(data) {
    const policy = await DDDApprovalPolicy.findById(oid(data.policyId)).lean();
    if (!policy) throw new Error('Approval policy not found');

    const count = await DDDApprovalRequest.countDocuments();
    const firstLevel = policy.levels.find(l => l.levelNumber === 1);
    const dueAt = firstLevel?.autoEscalateHours
      ? new Date(Date.now() + firstLevel.autoEscalateHours * 3600000)
      : undefined;

    return DDDApprovalRequest.create({
      ...data,
      code: `APR-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(5, '0')}`,
      type: data.type || policy.type,
      currentLevel: 1,
      dueAt,
    });
  }

  async listRequests(filter = {}) {
    const q = {};
    if (filter.status) q.status = filter.status;
    if (filter.type) q.type = filter.type;
    if (filter.requestedBy) q.requestedBy = oid(filter.requestedBy);
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDApprovalRequest.find(q)
        .sort({ requestedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('requestedBy', 'name email')
        .populate('policyId', 'name code type')
        .lean(),
      DDDApprovalRequest.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getRequest(id) {
    return DDDApprovalRequest.findById(oid(id))
      .populate('requestedBy', 'name email')
      .populate('policyId', 'name code type levels')
      .populate('decisions.approverId', 'name email')
      .lean();
  }

  async decide(requestId, approverId, decision, comment, attachments) {
    const request = await DDDApprovalRequest.findById(oid(requestId));
    if (!request || request.status !== 'pending') throw new Error('Request not pending');

    const policy = await DDDApprovalPolicy.findById(request.policyId).lean();
    if (!policy) throw new Error('Policy not found');

    // Check delegation
    let actualApproverId = oid(approverId);
    const delegation = await DDDDelegation.findOne({
      delegateId: actualApproverId,
      isActive: true,
      startDate: { $lte: new Date() },
      $or: [{ endDate: null }, { endDate: { $gte: new Date() } }],
      $or: [{ approvalType: 'all' }, { approvalType: request.type }],
    }).lean();

    // Record decision
    request.decisions.push({
      level: request.currentLevel,
      approverId: actualApproverId,
      decision,
      comment,
      attachments,
      decidedAt: new Date(),
    });

    if (decision === 'rejected') {
      request.status = 'rejected';
      request.completedAt = new Date();
    } else if (decision === 'returned') {
      request.status = 'returned';
    } else if (decision === 'approved') {
      const nextLevel = request.currentLevel + 1;
      const hasNextLevel = policy.levels.find(l => l.levelNumber === nextLevel);

      if (hasNextLevel) {
        request.currentLevel = nextLevel;
        const nextLevelCfg = hasNextLevel;
        if (nextLevelCfg.autoEscalateHours) {
          request.dueAt = new Date(Date.now() + nextLevelCfg.autoEscalateHours * 3600000);
        }
      } else {
        request.status = 'approved';
        request.completedAt = new Date();
      }
    }

    await request.save();
    return request.toObject();
  }

  async escalate(requestId, escalatedBy, reason) {
    return DDDApprovalRequest.findByIdAndUpdate(
      oid(requestId),
      {
        $set: { status: 'escalated', escalatedAt: new Date() },
        $push: {
          decisions: {
            level: 0,
            approverId: oid(escalatedBy),
            decision: 'delegated',
            comment: `Escalated: ${reason}`,
            decidedAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean();
  }

  async cancelRequest(requestId) {
    return DDDApprovalRequest.findByIdAndUpdate(
      oid(requestId),
      {
        $set: { status: 'cancelled', completedAt: new Date() },
      },
      { new: true }
    ).lean();
  }

  /* ── Pending for user ── */
  async getPendingForUser(userId, role, tenant = 'default') {
    const policies = await DDDApprovalPolicy.find({ isActive: true, tenant }).lean();
    const matchingPolicies = [];

    for (const p of policies) {
      for (const level of p.levels) {
        if (level.approverId?.toString() === String(userId) || level.approverRole === role) {
          matchingPolicies.push({ policyId: p._id, level: level.levelNumber });
        }
      }
    }

    const orConditions = matchingPolicies.map(mp => ({
      policyId: mp.policyId,
      currentLevel: mp.level,
      status: 'pending',
    }));

    if (orConditions.length === 0) return { data: [], total: 0 };

    const docs = await DDDApprovalRequest.find({ $or: orConditions, tenant })
      .sort({ requestedAt: -1 })
      .populate('requestedBy', 'name email')
      .populate('policyId', 'name code type')
      .lean();

    return { data: docs, total: docs.length };
  }

  /* ── Delegations ── */
  async createDelegation(data) { return this._create(DDDDelegation, data); }
  async listDelegations(userId) {
    return DDDDelegation.find({
      $or: [{ delegatorId: oid(userId) }, { delegateId: oid(userId) }],
      isActive: true,
    })
      .populate('delegatorId', 'name email')
      .populate('delegateId', 'name email')
      .lean();
  }
  async revokeDelegation(id) {
    return DDDDelegation.findByIdAndUpdate(
      oid(id),
      { $set: { isActive: false } },
      { new: true }
    ).lean();
  }

  /* ── Auto-escalation ── */
  async autoEscalate(tenant = 'default') {
    const now = new Date();
    const overdue = await DDDApprovalRequest.find({
      status: 'pending',
      dueAt: { $lt: now },
      tenant,
    }).lean();

    let escalated = 0;
    for (const req of overdue) {
      await DDDApprovalRequest.findByIdAndUpdate(req._id, {
        $set: { status: 'escalated', escalatedAt: now },
      });
      escalated++;
    }
    return { escalated, total: overdue.length };
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const [policyCount, pendingCount, approvedCount, rejectedCount, avgDays] = await Promise.all([
      DDDApprovalPolicy.countDocuments({ isActive: true, tenant }),
      DDDApprovalRequest.countDocuments({ status: 'pending', tenant }),
      DDDApprovalRequest.countDocuments({ status: 'approved', tenant }),
      DDDApprovalRequest.countDocuments({ status: 'rejected', tenant }),
      DDDApprovalRequest.aggregate([
        { $match: { status: 'approved', completedAt: { $ne: null }, tenant } },
        {
          $project: {
            days: { $divide: [{ $subtract: ['$completedAt', '$requestedAt'] }, 86400000] },
          },
        },
        { $group: { _id: null, avg: { $avg: '$days' } } },
      ]),
    ]);
    return {
      policyCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      avgApprovalDays: avgDays[0]?.avg ? Math.round(avgDays[0].avg * 10) / 10 : 0,
      builtinPolicies: BUILTIN_APPROVAL_POLICIES.length,
    };
  }
}

module.exports = new ApprovalChainService();

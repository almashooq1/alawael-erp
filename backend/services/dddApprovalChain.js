'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Approval Chain — Phase 15 (3/4)
 *  Multi-level approvals, delegation, escalation, audit trail
 * ═══════════════════════════════════════════════════════════════
 */
const mongoose = require('mongoose');
const { Router } = require('express');

/* ── helpers ── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};
const oid = v => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return v;
  }
};
const safe = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    next(e);
  }
};

/* ══════════════════════════════════════════════════════════════
   1) CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const APPROVAL_TYPES = [
  'treatment_plan',
  'discharge',
  'equipment_purchase',
  'leave_request',
  'budget_allocation',
  'policy_change',
  'referral',
  'document_review',
  'incident_report',
  'custom',
];

const APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'delegated',
  'escalated',
  'expired',
  'cancelled',
  'returned',
];

const ESCALATION_TRIGGERS = [
  'timeout',
  'manual',
  'policy_violation',
  'high_value',
  'repeat_rejection',
];

const DELEGATION_TYPES = ['temporary', 'permanent', 'out_of_office', 'role_based'];

const BUILTIN_APPROVAL_POLICIES = [
  {
    code: 'POL-TREAT-PLAN',
    name: 'Treatment Plan Approval',
    nameAr: 'موافقة على خطة العلاج',
    type: 'treatment_plan',
    levels: 2,
    autoEscalateHours: 48,
  },
  {
    code: 'POL-DISCHARGE',
    name: 'Discharge Approval',
    nameAr: 'موافقة على الخروج',
    type: 'discharge',
    levels: 2,
    autoEscalateHours: 24,
  },
  {
    code: 'POL-EQUIP-LOW',
    name: 'Equipment Purchase (Low)',
    nameAr: 'شراء معدات (منخفض)',
    type: 'equipment_purchase',
    levels: 1,
    autoEscalateHours: 72,
  },
  {
    code: 'POL-EQUIP-HIGH',
    name: 'Equipment Purchase (High)',
    nameAr: 'شراء معدات (مرتفع)',
    type: 'equipment_purchase',
    levels: 3,
    autoEscalateHours: 48,
  },
  {
    code: 'POL-LEAVE',
    name: 'Leave Request',
    nameAr: 'طلب إجازة',
    type: 'leave_request',
    levels: 1,
    autoEscalateHours: 48,
  },
  {
    code: 'POL-BUDGET',
    name: 'Budget Allocation',
    nameAr: 'تخصيص الميزانية',
    type: 'budget_allocation',
    levels: 3,
    autoEscalateHours: 72,
  },
  {
    code: 'POL-REFERRAL',
    name: 'External Referral',
    nameAr: 'إحالة خارجية',
    type: 'referral',
    levels: 2,
    autoEscalateHours: 24,
  },
  {
    code: 'POL-DOC-REVIEW',
    name: 'Document Review',
    nameAr: 'مراجعة مستند',
    type: 'document_review',
    levels: 1,
    autoEscalateHours: 72,
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Approval Policy Schema ── */
const approvalPolicySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    type: { type: String, enum: APPROVAL_TYPES, required: true, index: true },
    description: String,

    /* Levels */
    levels: [
      {
        levelNumber: { type: Number, required: true },
        name: String,
        nameAr: String,
        approverRole: String,
        approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requiredApprovals: { type: Number, default: 1 },
        autoApproveCondition: String, // JS expression
        autoEscalateHours: Number,
        escalateToRole: String,
      },
    ],

    /* Rules */
    rules: {
      allowDelegation: { type: Boolean, default: true },
      allowReturn: { type: Boolean, default: true },
      requireComment: { type: Boolean, default: false },
      requireAttachment: { type: Boolean, default: false },
      parallelLevels: { type: Boolean, default: false },
      minAmountForLevel: [{ level: Number, minAmount: Number }],
    },

    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDApprovalPolicy =
  model('DDDApprovalPolicy') || mongoose.model('DDDApprovalPolicy', approvalPolicySchema);

/* ── Approval Request Schema ── */
const approvalRequestSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, sparse: true, index: true },
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDApprovalPolicy',
      required: true,
      index: true,
    },
    type: { type: String, enum: APPROVAL_TYPES, required: true, index: true },
    status: { type: String, enum: APPROVAL_STATUSES, default: 'pending', index: true },

    /* Subject */
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    amount: Number,
    currency: { type: String, default: 'SAR' },

    /* Context */
    entityType: String,
    entityId: { type: mongoose.Schema.Types.ObjectId },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    workflowInstanceId: { type: mongoose.Schema.Types.ObjectId },

    /* Approval Progress */
    currentLevel: { type: Number, default: 1 },
    decisions: [
      {
        level: { type: Number, required: true },
        approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        decision: { type: String, enum: ['approved', 'rejected', 'returned', 'delegated'] },
        comment: String,
        attachments: [String],
        decidedAt: { type: Date, default: Date.now },
        delegatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    /* Timing */
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedAt: { type: Date, default: Date.now, index: true },
    dueAt: Date,
    completedAt: Date,
    escalatedAt: Date,

    attachments: [String],
    metadata: mongoose.Schema.Types.Mixed,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

approvalRequestSchema.index({ status: 1, currentLevel: 1 });

const DDDApprovalRequest =
  model('DDDApprovalRequest') || mongoose.model('DDDApprovalRequest', approvalRequestSchema);

/* ── Delegation Schema ── */
const delegationSchema = new mongoose.Schema(
  {
    delegatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    delegateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: DELEGATION_TYPES, required: true },
    approvalType: { type: String, enum: [...APPROVAL_TYPES, 'all'] },
    startDate: { type: Date, required: true },
    endDate: Date,
    reason: String,
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDDelegation = model('DDDDelegation') || mongoose.model('DDDDelegation', delegationSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE
   ══════════════════════════════════════════════════════════════ */

class ApprovalChainService {
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
  async createPolicy(data) {
    return DDDApprovalPolicy.create(data);
  }
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
  async createDelegation(data) {
    return DDDDelegation.create(data);
  }
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

const approvalChainService = new ApprovalChainService();

/* ══════════════════════════════════════════════════════════════
   4) ROUTER
   ══════════════════════════════════════════════════════════════ */

function createApprovalChainRouter() {
  const r = Router();

  /* Policies */
  r.get(
    '/approval-chain/policies',
    safe(async (req, res) => {
      res.json({ success: true, ...(await approvalChainService.listPolicies(req.query)) });
    })
  );
  r.get(
    '/approval-chain/policies/:id',
    safe(async (req, res) => {
      const doc = await approvalChainService.getPolicy(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/approval-chain/policies',
    safe(async (req, res) => {
      const doc = await approvalChainService.createPolicy(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );
  r.put(
    '/approval-chain/policies/:id',
    safe(async (req, res) => {
      const doc = await approvalChainService.updatePolicy(req.params.id, req.body);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* Requests */
  r.get(
    '/approval-chain/requests',
    safe(async (req, res) => {
      res.json({ success: true, ...(await approvalChainService.listRequests(req.query)) });
    })
  );
  r.get(
    '/approval-chain/requests/:id',
    safe(async (req, res) => {
      const doc = await approvalChainService.getRequest(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/approval-chain/requests',
    safe(async (req, res) => {
      const doc = await approvalChainService.createRequest(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );
  r.post(
    '/approval-chain/requests/:id/decide',
    safe(async (req, res) => {
      const { approverId, decision, comment, attachments } = req.body;
      if (!approverId || !decision)
        return res.status(400).json({ success: false, error: 'approverId & decision required' });
      const doc = await approvalChainService.decide(
        req.params.id,
        approverId,
        decision,
        comment,
        attachments
      );
      res.json({ success: true, data: doc });
    })
  );
  r.post(
    '/approval-chain/requests/:id/escalate',
    safe(async (req, res) => {
      const doc = await approvalChainService.escalate(
        req.params.id,
        req.body.escalatedBy,
        req.body.reason
      );
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/approval-chain/requests/:id/cancel',
    safe(async (req, res) => {
      const doc = await approvalChainService.cancelRequest(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* Pending for user */
  r.get(
    '/approval-chain/pending',
    safe(async (req, res) => {
      const { userId, role } = req.query;
      if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
      const data = await approvalChainService.getPendingForUser(userId, role, req.query.tenant);
      res.json({ success: true, ...data });
    })
  );

  /* Delegations */
  r.get(
    '/approval-chain/delegations/:userId',
    safe(async (req, res) => {
      const data = await approvalChainService.listDelegations(req.params.userId);
      res.json({ success: true, data });
    })
  );
  r.post(
    '/approval-chain/delegations',
    safe(async (req, res) => {
      const doc = await approvalChainService.createDelegation(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );
  r.delete(
    '/approval-chain/delegations/:id',
    safe(async (req, res) => {
      await approvalChainService.revokeDelegation(req.params.id);
      res.json({ success: true, message: 'Revoked' });
    })
  );

  /* Auto-escalation */
  r.post(
    '/approval-chain/auto-escalate',
    safe(async (req, res) => {
      const data = await approvalChainService.autoEscalate(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* Stats */
  r.get(
    '/approval-chain/stats',
    safe(async (req, res) => {
      const data = await approvalChainService.getStats(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* Meta */
  r.get('/approval-chain/meta', (_req, res) => {
    res.json({
      success: true,
      approvalTypes: APPROVAL_TYPES,
      approvalStatuses: APPROVAL_STATUSES,
      escalationTriggers: ESCALATION_TRIGGERS,
      delegationTypes: DELEGATION_TYPES,
      builtinPolicies: BUILTIN_APPROVAL_POLICIES,
    });
  });

  return r;
}

/* ══════════════════════════════════════════════════════════════
   5) EXPORTS
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDApprovalPolicy,
  DDDApprovalRequest,
  DDDDelegation,
  ApprovalChainService,
  approvalChainService,
  createApprovalChainRouter,
  APPROVAL_TYPES,
  APPROVAL_STATUSES,
  ESCALATION_TRIGGERS,
  DELEGATION_TYPES,
  BUILTIN_APPROVAL_POLICIES,
};

/**
 * Document Approval Chains Service — خدمة سلاسل الموافقات
 * ──────────────────────────────────────────────────────────
 * سلاسل موافقات متعددة المستويات • تفويض • تصعيد تلقائي
 * تتبع SLA • إشعارات • تقارير أداء
 */

const mongoose = require('mongoose');

/* ══════════════════════════════════════════════════════════════
   MODELS
   ══════════════════════════════════════════════════════════════ */

const approvalChainSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    category: { type: String, default: 'general' },
    priority: { type: String, enum: ['urgent', 'high', 'normal', 'low'], default: 'normal' },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },

    steps: [
      {
        stepNumber: { type: Number, required: true },
        name: { type: String, required: true },
        nameAr: String,
        type: {
          type: String,
          enum: ['single', 'all', 'any', 'majority', 'sequential'],
          default: 'single',
        },
        // single = واحد فقط, all = الكل, any = أي واحد, majority = الأغلبية, sequential = تسلسلي

        approvers: [
          {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            role: String,
            department: String,
            name: String,
          },
        ],

        sla: {
          durationHours: { type: Number, default: 24 },
          warningHours: { type: Number, default: 4 },
          escalateOnExpiry: { type: Boolean, default: true },
        },

        escalation: {
          enabled: { type: Boolean, default: false },
          escalateTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          afterHours: { type: Number, default: 48 },
        },

        delegation: {
          allowed: { type: Boolean, default: true },
          maxDelegations: { type: Number, default: 2 },
        },

        actions: {
          approve: { type: Boolean, default: true },
          reject: { type: Boolean, default: true },
          returnBack: { type: Boolean, default: true },
          addComment: { type: Boolean, default: true },
          requestInfo: { type: Boolean, default: true },
        },

        conditions: {
          field: String,
          operator: String,
          value: mongoose.Schema.Types.Mixed,
        },

        notifications: {
          onAssigned: { type: Boolean, default: true },
          onReminder: { type: Boolean, default: true },
          onEscalated: { type: Boolean, default: true },
          channels: [{ type: String, enum: ['email', 'sms', 'push', 'system'] }],
        },
      },
    ],

    settings: {
      allowParallelSteps: { type: Boolean, default: false },
      autoApproveTimeout: { type: Boolean, default: false },
      requireCommentOnReject: { type: Boolean, default: true },
      allowResubmit: { type: Boolean, default: true },
      notifyRequester: { type: Boolean, default: true },
      maxRetries: { type: Number, default: 3 },
    },

    appliesTo: {
      documentTypes: [String],
      categories: [String],
      departments: [String],
      minAmount: Number,
      maxAmount: Number,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'approval_chains' }
);

approvalChainSchema.index({ status: 1, isActive: 1 });
approvalChainSchema.index({ category: 1 });

const ApprovalChain =
  mongoose.models.ApprovalChain || mongoose.model('ApprovalChain', approvalChainSchema);

/* ─── Approval Request ─── */
const approvalRequestSchema = new mongoose.Schema(
  {
    chainId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalChain', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    referenceId: String,
    referenceType: String,

    status: {
      type: String,
      enum: [
        'pending',
        'in_progress',
        'approved',
        'rejected',
        'cancelled',
        'returned',
        'escalated',
        'expired',
        'info_requested',
      ],
      default: 'pending',
    },

    currentStep: { type: Number, default: 0 },

    stepResults: [
      {
        stepNumber: Number,
        stepName: String,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'returned', 'skipped', 'escalated', 'expired'],
        },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        comment: String,
        delegatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        delegatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        slaDeadline: Date,
        slaBreached: { type: Boolean, default: false },
        escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        escalatedAt: Date,
        duration: Number, // minutes
        responses: [
          {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            action: {
              type: String,
              enum: ['approve', 'reject', 'return', 'info_request', 'comment'],
            },
            comment: String,
            timestamp: { type: Date, default: Date.now },
          },
        ],
      },
    ],

    totalDuration: Number, // minutes
    slaStatus: { type: String, enum: ['on_track', 'warning', 'breached'], default: 'on_track' },
    retryCount: { type: Number, default: 0 },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestNote: String,

    completedAt: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'approval_requests' }
);

approvalRequestSchema.index({ chainId: 1, status: 1 });
approvalRequestSchema.index({ documentId: 1 });
approvalRequestSchema.index({ requestedBy: 1, createdAt: -1 });
approvalRequestSchema.index({ 'stepResults.approvedBy': 1 });
approvalRequestSchema.index({ status: 1, currentStep: 1 });

const ApprovalRequest =
  mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', approvalRequestSchema);

/* ─── Delegation Log ─── */
const delegationSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: String,
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    scope: { type: String, enum: ['all', 'specific_chain', 'specific_request'], default: 'all' },
    chainId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalChain' },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRequest' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'approval_delegations' }
);

const Delegation =
  mongoose.models.ApprovalDelegation || mongoose.model('ApprovalDelegation', delegationSchema);

/* ══════════════════════════════════════════════════════════════
   SERVICE
   ══════════════════════════════════════════════════════════════ */

class ApprovalChainsService {
  /* ══════ Chain Management ══════ */

  async createChain(data, userId) {
    // Auto-number steps
    if (data.steps) {
      data.steps.forEach((s, i) => {
        s.stepNumber = i + 1;
      });
    }
    const chain = await ApprovalChain.create({ ...data, createdBy: userId });
    return { success: true, chain };
  }

  async updateChain(chainId, data) {
    if (data.steps) {
      data.steps.forEach((s, i) => {
        s.stepNumber = i + 1;
      });
    }
    const chain = await ApprovalChain.findByIdAndUpdate(chainId, { $set: data }, { new: true });
    if (!chain) throw new Error('سلسلة الموافقات غير موجودة');
    return { success: true, chain };
  }

  async getChain(chainId) {
    const chain = await ApprovalChain.findById(chainId)
      .populate('createdBy', 'name email')
      .populate('steps.approvers.userId', 'name email')
      .populate('steps.escalation.escalateTo', 'name email');
    if (!chain) throw new Error('سلسلة الموافقات غير موجودة');
    return { success: true, chain };
  }

  async getChains(filters = {}) {
    const query = { isActive: true };
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { nameAr: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const [chains, total] = await Promise.all([
      ApprovalChain.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name')
        .lean(),
      ApprovalChain.countDocuments(query),
    ]);
    return { success: true, chains, total, page, pages: Math.ceil(total / limit) };
  }

  async deleteChain(chainId) {
    await ApprovalChain.findByIdAndUpdate(chainId, { isActive: false });
    return { success: true };
  }

  async activateChain(chainId) {
    const chain = await ApprovalChain.findByIdAndUpdate(
      chainId,
      { status: 'active' },
      { new: true }
    );
    return { success: true, chain };
  }

  /* ══════ Approval Requests ══════ */

  async submitRequest(chainId, data, userId) {
    const chain = await ApprovalChain.findById(chainId);
    if (!chain) throw new Error('سلسلة الموافقات غير موجودة');
    if (chain.status !== 'active') throw new Error('سلسلة الموافقات غير مفعلة');

    // Initialize step results
    const stepResults = chain.steps.map(step => ({
      stepNumber: step.stepNumber,
      stepName: step.nameAr || step.name,
      status: 'pending',
      slaDeadline: new Date(Date.now() + (step.sla?.durationHours || 24) * 3600000),
      responses: [],
    }));

    // Set first step
    stepResults[0].status = 'pending';

    const request = await ApprovalRequest.create({
      chainId,
      documentId: data.documentId,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
      status: 'in_progress',
      currentStep: 1,
      stepResults,
      requestedBy: userId,
      requestNote: data.note,
      metadata: data.metadata || {},
    });

    return { success: true, request };
  }

  async processStep(requestId, action, comment, userId) {
    const request = await ApprovalRequest.findById(requestId);
    if (!request) throw new Error('طلب الموافقة غير موجود');
    if (!['in_progress', 'info_requested'].includes(request.status))
      throw new Error('لا يمكن معالجة هذا الطلب');

    const chain = await ApprovalChain.findById(request.chainId);
    const stepIdx = request.currentStep - 1;
    const stepResult = request.stepResults[stepIdx];
    const stepDef = chain.steps[stepIdx];

    // Check delegation
    let actualApprover = userId;
    const delegation = await Delegation.findOne({
      toUser: userId,
      isActive: true,
      $or: [
        { scope: 'all' },
        { scope: 'specific_chain', chainId: request.chainId },
        { scope: 'specific_request', requestId: request._id },
      ],
      $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
    });

    // Record response
    stepResult.responses.push({
      userId: actualApprover,
      action,
      comment,
      timestamp: new Date(),
    });

    const startTime = stepResult.slaDeadline
      ? new Date(stepResult.slaDeadline.getTime() - (stepDef?.sla?.durationHours || 24) * 3600000)
      : request.createdAt;
    stepResult.duration = Math.round((Date.now() - startTime.getTime()) / 60000);

    // Check SLA
    if (stepResult.slaDeadline && new Date() > stepResult.slaDeadline) {
      stepResult.slaBreached = true;
      request.slaStatus = 'breached';
    }

    // Process based on step type
    const stepType = stepDef?.type || 'single';

    if (action === 'approve') {
      let shouldAdvance = false;

      if (stepType === 'single' || stepType === 'any') {
        shouldAdvance = true;
      } else if (stepType === 'all') {
        const totalApprovers = stepDef.approvers?.length || 1;
        const approvedCount = stepResult.responses.filter(r => r.action === 'approve').length;
        shouldAdvance = approvedCount >= totalApprovers;
      } else if (stepType === 'majority') {
        const totalApprovers = stepDef.approvers?.length || 1;
        const approvedCount = stepResult.responses.filter(r => r.action === 'approve').length;
        shouldAdvance = approvedCount > totalApprovers / 2;
      }

      if (shouldAdvance) {
        stepResult.status = 'approved';
        stepResult.approvedBy = actualApprover;
        stepResult.approvedAt = new Date();

        // Move to next step or complete
        if (request.currentStep >= chain.steps.length) {
          request.status = 'approved';
          request.completedAt = new Date();
          request.totalDuration = Math.round((Date.now() - request.createdAt.getTime()) / 60000);
        } else {
          request.currentStep++;
          const nextStep = request.stepResults[request.currentStep - 1];
          nextStep.slaDeadline = new Date(
            Date.now() + (chain.steps[request.currentStep - 1]?.sla?.durationHours || 24) * 3600000
          );
        }
      }
    } else if (action === 'reject') {
      stepResult.status = 'rejected';
      stepResult.approvedBy = actualApprover;
      stepResult.approvedAt = new Date();
      request.status = 'rejected';
      request.completedAt = new Date();
      request.totalDuration = Math.round((Date.now() - request.createdAt.getTime()) / 60000);
    } else if (action === 'return') {
      stepResult.status = 'returned';
      if (request.currentStep > 1) {
        request.currentStep--;
        request.stepResults[request.currentStep - 1].status = 'pending';
      }
      request.status = 'returned';
    } else if (action === 'info_request') {
      request.status = 'info_requested';
    }

    await request.save();
    return { success: true, request };
  }

  async getRequest(requestId) {
    const request = await ApprovalRequest.findById(requestId)
      .populate('chainId', 'name nameAr steps')
      .populate('requestedBy', 'name email')
      .populate('stepResults.approvedBy', 'name email')
      .populate('stepResults.delegatedTo', 'name email')
      .populate('stepResults.responses.userId', 'name email');
    if (!request) throw new Error('طلب الموافقة غير موجود');
    return { success: true, request };
  }

  async getRequests(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.chainId) query.chainId = filters.chainId;
    if (filters.documentId) query.documentId = filters.documentId;
    if (filters.requestedBy) query.requestedBy = filters.requestedBy;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [requests, total] = await Promise.all([
      ApprovalRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('chainId', 'name nameAr')
        .populate('requestedBy', 'name')
        .lean(),
      ApprovalRequest.countDocuments(query),
    ]);
    return { success: true, requests, total, page, pages: Math.ceil(total / limit) };
  }

  async getMyPendingApprovals(userId) {
    // Find all chains where user is an approver
    const chains = await ApprovalChain.find({
      isActive: true,
      status: 'active',
      'steps.approvers.userId': userId,
    })
      .select('_id')
      .lean();

    const chainIds = chains.map(c => c._id);

    // Also check for delegations
    const delegations = await Delegation.find({
      toUser: userId,
      isActive: true,
      $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
    }).lean();

    const requests = await ApprovalRequest.find({
      status: 'in_progress',
      chainId: { $in: chainIds },
    })
      .populate('chainId', 'name nameAr steps')
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, requests, delegations };
  }

  async cancelRequest(requestId, userId) {
    const request = await ApprovalRequest.findById(requestId);
    if (!request) throw new Error('طلب الموافقة غير موجود');
    if (['approved', 'rejected', 'cancelled'].includes(request.status)) {
      throw new Error('لا يمكن إلغاء هذا الطلب');
    }
    request.status = 'cancelled';
    request.completedAt = new Date();
    await request.save();
    return { success: true, request };
  }

  async resubmitRequest(requestId, note, userId) {
    const request = await ApprovalRequest.findById(requestId);
    if (!request) throw new Error('طلب الموافقة غير موجود');
    if (!['rejected', 'returned'].includes(request.status)) {
      throw new Error('لا يمكن إعادة تقديم هذا الطلب');
    }

    const chain = await ApprovalChain.findById(request.chainId);
    if (chain?.settings?.maxRetries && request.retryCount >= chain.settings.maxRetries) {
      throw new Error('تم تجاوز الحد الأقصى لإعادة المحاولة');
    }

    // Reset steps
    request.stepResults.forEach(sr => {
      sr.status = 'pending';
      sr.approvedBy = undefined;
      sr.approvedAt = undefined;
      sr.responses = [];
      sr.slaBreached = false;
    });
    request.currentStep = 1;
    request.status = 'in_progress';
    request.retryCount++;
    request.slaStatus = 'on_track';
    request.requestNote = note || request.requestNote;
    request.stepResults[0].slaDeadline = new Date(
      Date.now() + (chain?.steps[0]?.sla?.durationHours || 24) * 3600000
    );

    await request.save();
    return { success: true, request };
  }

  /* ══════ Delegation ══════ */

  async createDelegation(data, userId) {
    const delegation = await Delegation.create({ ...data, fromUser: userId });
    return { success: true, delegation };
  }

  async revokeDelegation(delegationId) {
    await Delegation.findByIdAndUpdate(delegationId, { isActive: false });
    return { success: true };
  }

  async getMyDelegations(userId) {
    const [given, received] = await Promise.all([
      Delegation.find({ fromUser: userId, isActive: true }).populate('toUser', 'name email').lean(),
      Delegation.find({ toUser: userId, isActive: true }).populate('fromUser', 'name email').lean(),
    ]);
    return { success: true, given, received };
  }

  /* ══════ SLA Check ══════ */

  async checkSLA() {
    const now = new Date();
    const activeRequests = await ApprovalRequest.find({ status: 'in_progress' });
    const results = { checked: 0, warned: 0, escalated: 0 };

    for (const req of activeRequests) {
      results.checked++;
      const stepResult = req.stepResults[req.currentStep - 1];
      if (!stepResult?.slaDeadline) continue;

      const chain = await ApprovalChain.findById(req.chainId);
      const stepDef = chain?.steps[req.currentStep - 1];
      const warningHours = stepDef?.sla?.warningHours || 4;
      const warningTime = new Date(stepResult.slaDeadline.getTime() - warningHours * 3600000);

      if (now >= stepResult.slaDeadline) {
        stepResult.slaBreached = true;
        req.slaStatus = 'breached';

        // Auto-escalate
        if (stepDef?.escalation?.enabled && stepDef.escalation.escalateTo) {
          stepResult.escalatedTo = stepDef.escalation.escalateTo;
          stepResult.escalatedAt = now;
          stepResult.status = 'escalated';
          req.status = 'escalated';
          results.escalated++;
        }
        // Auto-approve on timeout
        else if (chain?.settings?.autoApproveTimeout) {
          stepResult.status = 'approved';
          stepResult.approvedAt = now;
          if (req.currentStep >= chain.steps.length) {
            req.status = 'approved';
            req.completedAt = now;
          } else {
            req.currentStep++;
          }
        }
        await req.save();
      } else if (now >= warningTime) {
        req.slaStatus = 'warning';
        await req.save();
        results.warned++;
      }
    }

    return { success: true, ...results };
  }

  /* ══════ Stats ══════ */

  async getStats() {
    const [totalChains, activeChains, totalRequests, statusStats, avgDuration, slaStats] =
      await Promise.all([
        ApprovalChain.countDocuments({ isActive: true }),
        ApprovalChain.countDocuments({ isActive: true, status: 'active' }),
        ApprovalRequest.countDocuments(),
        ApprovalRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        ApprovalRequest.aggregate([
          { $match: { status: 'approved', totalDuration: { $gt: 0 } } },
          {
            $group: {
              _id: null,
              avg: { $avg: '$totalDuration' },
              min: { $min: '$totalDuration' },
              max: { $max: '$totalDuration' },
            },
          },
        ]),
        ApprovalRequest.aggregate([{ $group: { _id: '$slaStatus', count: { $sum: 1 } } }]),
      ]);

    return {
      success: true,
      totalChains,
      activeChains,
      totalRequests,
      requestsByStatus: Object.fromEntries(statusStats.map(s => [s._id, s.count])),
      avgDurationMinutes: Math.round(avgDuration[0]?.avg || 0),
      minDurationMinutes: avgDuration[0]?.min || 0,
      maxDurationMinutes: avgDuration[0]?.max || 0,
      slaPerformance: Object.fromEntries(slaStats.map(s => [s._id, s.count])),
    };
  }
}

module.exports = new ApprovalChainsService();

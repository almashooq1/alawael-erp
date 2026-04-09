/**
 * Document Lifecycle Management Service — خدمة إدارة دورة حياة المستند
 * Phase 9 — تتبع كامل من الإنشاء حتى الإتلاف مع سياسات الاحتفاظ والتحولات
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Schemas ────────────────────────────────────────────── */
const lifecyclePhaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameAr: { type: String },
  order: { type: Number, default: 0 },
  duration: { type: Number }, // days
  autoTransition: { type: Boolean, default: false },
  actions: [{ type: String }], // allowed actions in this phase
  conditions: {
    requiredApprovals: { type: Number, default: 0 },
    requiredFields: [String],
    expiryAction: {
      type: String,
      enum: ['archive', 'destroy', 'review', 'extend', 'notify'],
      default: 'notify',
    },
  },
  notifications: [
    {
      trigger: { type: String, enum: ['enter', 'exit', 'expiring', 'overdue'] },
      days: Number,
      recipients: [String],
      template: String,
    },
  ],
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
});

const lifecyclePolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    description: String,
    category: { type: String, default: 'عام' },
    status: { type: String, enum: ['draft', 'active', 'suspended', 'archived'], default: 'draft' },
    phases: [lifecyclePhaseSchema],
    defaultRetentionDays: { type: Number, default: 365 },
    autoDestroyEnabled: { type: Boolean, default: false },
    legalHoldSupport: { type: Boolean, default: true },
    complianceFramework: { type: String },
    documentTypes: [String],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'lifecycle_policies' }
);

const documentLifecycleSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'LifecyclePolicy' },
    currentPhase: {
      name: String,
      enteredAt: Date,
      expiresAt: Date,
      order: Number,
    },
    phaseHistory: [
      {
        phase: String,
        enteredAt: Date,
        exitedAt: Date,
        duration: Number, // minutes
        exitReason: String,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],
    retentionInfo: {
      retentionEndDate: Date,
      legalHold: { type: Boolean, default: false },
      legalHoldReason: String,
      legalHoldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      legalHoldDate: Date,
      dispositionDate: Date,
      dispositionMethod: { type: String, enum: ['archive', 'destroy', 'transfer', 'review'] },
      dispositionApproved: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'completed', 'disposed', 'legal_hold'],
      default: 'active',
    },
    events: [
      {
        type: { type: String },
        timestamp: { type: Date, default: Date.now },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        details: { type: Map, of: mongoose.Schema.Types.Mixed },
      },
    ],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_lifecycles' }
);

const dispositionRequestSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    lifecycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentLifecycle' },
    method: { type: String, enum: ['archive', 'destroy', 'transfer', 'review'], required: true },
    reason: String,
    scheduledDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'executed', 'cancelled'],
      default: 'pending',
    },
    approvals: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        action: { type: String, enum: ['approve', 'reject'] },
        date: Date,
        notes: String,
      },
    ],
    executedAt: Date,
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    certificate: {
      // destruction certificate
      number: String,
      issuedAt: Date,
      hash: String,
      witnesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'disposition_requests' }
);

lifecyclePolicySchema.index({ status: 1, category: 1 });
documentLifecycleSchema.index({ documentId: 1 }, { unique: true });
documentLifecycleSchema.index({ 'currentPhase.expiresAt': 1, status: 1 });
documentLifecycleSchema.index({ 'retentionInfo.retentionEndDate': 1 });
dispositionRequestSchema.index({ documentId: 1, status: 1 });

const LifecyclePolicy =
  mongoose.models.LifecyclePolicy || mongoose.model('LifecyclePolicy', lifecyclePolicySchema);
const DocumentLifecycle =
  mongoose.models.DocumentLifecycle || mongoose.model('DocumentLifecycle', documentLifecycleSchema);
const DispositionRequest =
  mongoose.models.DispositionRequest ||
  mongoose.model('DispositionRequest', dispositionRequestSchema);

/* ─── Service ────────────────────────────────────────────── */
class DocumentLifecycleService {
  /* ── Policies ─────────────────────── */
  async createPolicy(data, userId) {
    const policy = new LifecyclePolicy({ ...data, createdBy: userId });
    if (policy.phases?.length) {
      policy.phases = policy.phases.map((p, i) => ({ ...p, order: i }));
    }
    await policy.save();
    return policy;
  }

  async updatePolicy(policyId, data, userId) {
    const policy = await LifecyclePolicy.findByIdAndUpdate(
      policyId,
      { ...data, updatedBy: userId },
      { new: true }
    );
    if (!policy) throw new Error('السياسة غير موجودة');
    return policy;
  }

  async activatePolicy(policyId, userId) {
    return this.updatePolicy(policyId, { status: 'active' }, userId);
  }

  async getPolicies(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    return LifecyclePolicy.find(query).sort('-createdAt').lean();
  }

  async getPolicy(policyId) {
    const p = await LifecyclePolicy.findById(policyId).lean();
    if (!p) throw new Error('السياسة غير موجودة');
    return p;
  }

  async deletePolicy(policyId) {
    const count = await DocumentLifecycle.countDocuments({ policyId });
    if (count > 0) throw new Error('لا يمكن حذف سياسة مرتبطة بمستندات');
    return LifecyclePolicy.findByIdAndDelete(policyId);
  }

  /* ── Document Lifecycle ───────────── */
  async assignLifecycle(documentId, policyId, userId) {
    const policy = await LifecyclePolicy.findById(policyId);
    if (!policy || policy.status !== 'active') throw new Error('السياسة غير نشطة');

    const firstPhase = policy.phases.sort((a, b) => a.order - b.order)[0];
    if (!firstPhase) throw new Error('السياسة لا تحتوي على مراحل');

    const expiresAt = firstPhase.duration
      ? new Date(Date.now() + firstPhase.duration * 86400000)
      : null;

    const lifecycle = new DocumentLifecycle({
      documentId,
      policyId,
      createdBy: userId,
      currentPhase: {
        name: firstPhase.name,
        enteredAt: new Date(),
        expiresAt,
        order: firstPhase.order,
      },
      retentionInfo: {
        retentionEndDate: new Date(Date.now() + policy.defaultRetentionDays * 86400000),
      },
      events: [
        {
          type: 'lifecycle_assigned',
          userId,
          details: { policyId: policy._id, policyName: policy.name, phase: firstPhase.name },
        },
      ],
    });
    await lifecycle.save();
    return lifecycle;
  }

  async getDocumentLifecycle(documentId) {
    const lc = await DocumentLifecycle.findOne({ documentId })
      .populate('policyId', 'name nameAr phases')
      .populate('createdBy', 'name email')
      .lean();
    if (!lc) throw new Error('لا توجد دورة حياة لهذا المستند');
    return lc;
  }

  async transitionPhase(documentId, targetPhase, userId, notes = '') {
    const lc = await DocumentLifecycle.findOne({ documentId });
    if (!lc) throw new Error('لا توجد دورة حياة');
    if (lc.status === 'legal_hold') throw new Error('المستند تحت حجز قانوني');

    const policy = await LifecyclePolicy.findById(lc.policyId);
    const phase = policy?.phases?.find(p => p.name === targetPhase);
    if (!phase) throw new Error('المرحلة غير موجودة');

    const now = new Date();
    // close current phase
    lc.phaseHistory.push({
      phase: lc.currentPhase.name,
      enteredAt: lc.currentPhase.enteredAt,
      exitedAt: now,
      duration: Math.round((now - lc.currentPhase.enteredAt) / 60000),
      exitReason: 'manual_transition',
      userId,
      notes,
    });

    const expiresAt = phase.duration ? new Date(now.getTime() + phase.duration * 86400000) : null;
    lc.currentPhase = { name: phase.name, enteredAt: now, expiresAt, order: phase.order };
    lc.events.push({
      type: 'phase_transition',
      userId,
      details: { from: lc.phaseHistory.at(-1)?.phase, to: targetPhase, notes },
    });
    await lc.save();
    return lc;
  }

  async setLegalHold(documentId, reason, userId) {
    const lc = await DocumentLifecycle.findOne({ documentId });
    if (!lc) throw new Error('لا توجد دورة حياة');

    lc.status = 'legal_hold';
    lc.retentionInfo.legalHold = true;
    lc.retentionInfo.legalHoldReason = reason;
    lc.retentionInfo.legalHoldBy = userId;
    lc.retentionInfo.legalHoldDate = new Date();
    lc.events.push({ type: 'legal_hold_set', userId, details: { reason } });
    await lc.save();
    return lc;
  }

  async releaseLegalHold(documentId, userId) {
    const lc = await DocumentLifecycle.findOne({ documentId });
    if (!lc) throw new Error('لا توجد دورة حياة');

    lc.status = 'active';
    lc.retentionInfo.legalHold = false;
    lc.events.push({ type: 'legal_hold_released', userId });
    await lc.save();
    return lc;
  }

  async extendRetention(documentId, additionalDays, userId, reason = '') {
    const lc = await DocumentLifecycle.findOne({ documentId });
    if (!lc) throw new Error('لا توجد دورة حياة');

    const current = lc.retentionInfo.retentionEndDate || new Date();
    lc.retentionInfo.retentionEndDate = new Date(current.getTime() + additionalDays * 86400000);
    lc.events.push({
      type: 'retention_extended',
      userId,
      details: { additionalDays, reason, newDate: lc.retentionInfo.retentionEndDate },
    });
    await lc.save();
    return lc;
  }

  /* ── Disposition ──────────────────── */
  async requestDisposition(documentId, method, reason, userId) {
    const lc = await DocumentLifecycle.findOne({ documentId });
    if (lc?.retentionInfo?.legalHold) throw new Error('المستند تحت حجز قانوني');

    const req = new DispositionRequest({
      documentId,
      lifecycleId: lc?._id,
      method,
      reason,
      scheduledDate: new Date(Date.now() + 7 * 86400000),
      createdBy: userId,
    });
    await req.save();
    if (lc) {
      lc.events.push({ type: 'disposition_requested', userId, details: { method, reason } });
      await lc.save();
    }
    return req;
  }

  async approveDisposition(requestId, userId, notes = '') {
    const req = await DispositionRequest.findById(requestId);
    if (!req || req.status !== 'pending') throw new Error('الطلب غير صالح');

    req.approvals.push({ userId, action: 'approve', date: new Date(), notes });
    req.status = 'approved';
    await req.save();
    return req;
  }

  async executeDisposition(requestId, userId) {
    const req = await DispositionRequest.findById(requestId);
    if (!req || req.status !== 'approved') throw new Error('الطلب غير معتمد');

    req.status = 'executed';
    req.executedAt = new Date();
    req.executedBy = userId;
    req.certificate = {
      number: `DISP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      issuedAt: new Date(),
      hash: crypto
        .createHash('sha256')
        .update(`${req._id}:${req.documentId}:${Date.now()}`)
        .digest('hex'),
      witnesses: [userId],
    };
    await req.save();

    const lc = await DocumentLifecycle.findOne({ documentId: req.documentId });
    if (lc) {
      lc.status = 'disposed';
      lc.events.push({
        type: 'disposed',
        userId,
        details: { method: req.method, certificate: req.certificate.number },
      });
      await lc.save();
    }
    return req;
  }

  async getDispositionRequests(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.method) query.method = filters.method;
    return DispositionRequest.find(query).populate('createdBy', 'name').sort('-createdAt').lean();
  }

  /* ── Expiry & Processing ──────────── */
  async getExpiringDocuments(days = 30) {
    const deadline = new Date(Date.now() + days * 86400000);
    return DocumentLifecycle.find({
      'currentPhase.expiresAt': { $lte: deadline, $gte: new Date() },
      status: 'active',
    })
      .populate('documentId', 'title name')
      .lean();
  }

  async getRetentionExpiring(days = 30) {
    const deadline = new Date(Date.now() + days * 86400000);
    return DocumentLifecycle.find({
      'retentionInfo.retentionEndDate': { $lte: deadline, $gte: new Date() },
      status: { $ne: 'disposed' },
      'retentionInfo.legalHold': { $ne: true },
    })
      .populate('documentId', 'title name')
      .lean();
  }

  async processAutoTransitions() {
    const expired = await DocumentLifecycle.find({
      'currentPhase.expiresAt': { $lte: new Date() },
      status: 'active',
    });

    let processed = 0;
    for (const lc of expired) {
      try {
        const policy = await LifecyclePolicy.findById(lc.policyId);
        if (!policy) continue;
        const currentIdx = policy.phases.findIndex(p => p.name === lc.currentPhase.name);
        const nextPhase = policy.phases[currentIdx + 1];
        if (nextPhase && policy.phases[currentIdx]?.autoTransition) {
          await this.transitionPhase(lc.documentId, nextPhase.name, null, 'انتقال تلقائي');
          processed++;
        }
      } catch {
        /* skip */
      }
    }
    return { processed, total: expired.length };
  }

  /* ── Timeline ─────────────────────── */
  async getTimeline(documentId) {
    const lc = await DocumentLifecycle.findOne({ documentId }).lean();
    if (!lc) return { phases: [], events: [] };
    return {
      currentPhase: lc.currentPhase,
      phases: lc.phaseHistory,
      events: lc.events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      retention: lc.retentionInfo,
      status: lc.status,
    };
  }

  /* ── Stats ────────────────────────── */
  async getStats() {
    const [policies, lifecycles, dispositions, legalHolds, expiring] = await Promise.all([
      LifecyclePolicy.countDocuments(),
      DocumentLifecycle.countDocuments(),
      DispositionRequest.countDocuments(),
      DocumentLifecycle.countDocuments({ 'retentionInfo.legalHold': true }),
      DocumentLifecycle.countDocuments({
        'currentPhase.expiresAt': { $lte: new Date(Date.now() + 30 * 86400000) },
        status: 'active',
      }),
    ]);

    const byPhase = await DocumentLifecycle.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$currentPhase.name', count: { $sum: 1 } } },
    ]);

    const byStatus = await DocumentLifecycle.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      totalPolicies: policies,
      totalLifecycles: lifecycles,
      totalDispositions: dispositions,
      legalHolds,
      expiringIn30Days: expiring,
      byPhase,
      byStatus,
    };
  }
}

module.exports = new DocumentLifecycleService();

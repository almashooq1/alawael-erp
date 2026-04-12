'use strict';
/**
 * ClaimsProcessor Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddClaimsProcessor.js
 */

const {
  DDDClaim,
  DDDClaimBatch,
  DDDClaimAppeal,
  DDDEOB,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  DENIAL_REASONS,
  APPEAL_STATUSES,
  APPEAL_LEVELS,
  SUBMISSION_CHANNELS,
  EOB_TYPES,
  ADJUDICATION_TYPES,
  BUILTIN_CLAIM_TEMPLATES,
} = require('../models/DddClaimsProcessor');

const BaseCrudService = require('./base/BaseCrudService');

class ClaimsProcessor extends BaseCrudService {
  constructor() {
    super('ClaimsProcessor', {
      description: 'Claims submission, adjudication, denial management, appeals & EOB processing',
      version: '1.0.0',
    }, {
      claims: DDDClaim,
      claimBatchs: DDDClaimBatch,
      claimAppeals: DDDClaimAppeal,
    })
  }

  async initialize() {
    this.log('Claims Processor initialised ✓');
    return true;
  }

  /* ── Sequence generators ── */
  async _nextClaimNumber() {
    const count = await DDDClaim.countDocuments();
    return `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(7, '0')}`;
  }
  async _nextBatchNumber() {
    const count = await DDDClaimBatch.countDocuments();
    return `BATCH-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  async _nextAppealNumber() {
    const count = await DDDClaimAppeal.countDocuments();
    return `APL-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  async _nextEOBNumber() {
    const count = await DDDEOB.countDocuments();
    return `EOB-${new Date().getFullYear()}-${String(count + 1).padStart(7, '0')}`;
  }

  /* ── Claim CRUD ── */
  async listClaims(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.policyId) q.policyId = filters.policyId;
    if (filters.providerId) q.providerId = filters.providerId;
    if (filters.status) q.status = filters.status;
    if (filters.claimType) q.claimType = filters.claimType;
    if (filters.from || filters.to) {
      q.submittedAt = {};
      if (filters.from) q.submittedAt.$gte = new Date(filters.from);
      if (filters.to) q.submittedAt.$lte = new Date(filters.to);
    }
    return DDDClaim.find(q).sort({ createdAt: -1 }).lean();
  }

  async getClaim(id) { return this._getById(DDDClaim, id); }

  async createClaim(data) {
    data.claimNumber = data.claimNumber || (await this._nextClaimNumber());
    // Calculate totals from lines
    let totalCharged = 0;
    for (const line of data.lines || []) {
      line.totalCharge = line.quantity * line.unitPrice;
      totalCharged += line.totalCharge;
    }
    data.totalCharged = totalCharged;
    data.history = [{ action: 'created', date: new Date(), actor: 'system' }];
    return DDDClaim.create(data);
  }

  async updateClaim(id, data) { return this._update(DDDClaim, id, data, { runValidators: true }); }

  async validateClaim(id) {
    const claim = await DDDClaim.findById(id);
    if (!claim) throw new Error('Claim not found');
    const errors = [];
    if (!claim.diagnosis || claim.diagnosis.length === 0)
      errors.push('At least one diagnosis required');
    if (!claim.lines || claim.lines.length === 0) errors.push('At least one service line required');
    if (!claim.policyId) errors.push('Insurance policy required');
    if (errors.length > 0) return { valid: false, errors };
    claim.status = 'validated';
    claim.history.push({ action: 'validated', date: new Date(), actor: 'system' });
    await claim.save();
    return { valid: true, claim };
  }

  async submitClaim(id, userId) {
    const claim = await DDDClaim.findById(id);
    if (!claim) throw new Error('Claim not found');
    claim.status = 'submitted';
    claim.submittedAt = new Date();
    claim.submittedBy = userId;
    claim.history.push({ action: 'submitted', date: new Date(), actor: String(userId) });
    await claim.save();
    return claim;
  }

  async adjudicateClaim(id, adjudicationData) {
    const claim = await DDDClaim.findById(id);
    if (!claim) throw new Error('Claim not found');

    let totalApproved = 0,
      totalDenied = 0;
    for (const lineAdj of adjudicationData.lines || []) {
      const line = claim.lines.id(lineAdj.lineId);
      if (line) {
        line.adjudication = lineAdj.adjudication || [];
        line.approvedAmount = lineAdj.approvedAmount || 0;
        line.deniedAmount = lineAdj.deniedAmount || 0;
        totalApproved += line.approvedAmount;
        totalDenied += line.deniedAmount;
      }
    }

    claim.totalApproved = totalApproved;
    claim.totalDenied = totalDenied;
    claim.adjudicatedAt = new Date();
    claim.payerClaimRef = adjudicationData.payerClaimRef || claim.payerClaimRef;

    if (totalDenied > 0 && totalApproved === 0) {
      claim.status = 'denied';
      claim.deniedAt = new Date();
      claim.denialReasons = adjudicationData.denialReasons || [];
      claim.denialNotes = adjudicationData.denialNotes;
    } else if (totalDenied > 0) {
      claim.status = 'partially_approved';
    } else {
      claim.status = 'approved';
    }

    claim.history.push({
      action: 'adjudicated',
      date: new Date(),
      actor: 'payer',
      notes: `Approved: ${totalApproved}, Denied: ${totalDenied}`,
    });
    await claim.save();
    return claim;
  }

  async markClaimPaid(id, paymentData) {
    const claim = await DDDClaim.findById(id);
    if (!claim) throw new Error('Claim not found');
    claim.totalPaid = paymentData.amount || claim.totalApproved;
    claim.status = claim.totalPaid >= claim.totalApproved ? 'paid' : 'partially_paid';
    claim.paidAt = new Date();
    claim.history.push({
      action: 'paid',
      date: new Date(),
      actor: 'payer',
      notes: `Amount: ${claim.totalPaid}`,
    });
    await claim.save();
    return claim;
  }

  /* ── Batch Claims ── */
  async listBatches(filters = {}) {
    const q = {};
    if (filters.providerId) q.providerId = filters.providerId;
    if (filters.status) q.status = filters.status;
    return DDDClaimBatch.find(q).sort({ createdAt: -1 }).lean();
  }

  async getBatch(id) { return this._getById(DDDClaimBatch, id); }

  async createBatch(data) {
    data.batchNumber = data.batchNumber || (await this._nextBatchNumber());
    data.totalClaims = (data.claimIds || []).length;
    return DDDClaimBatch.create(data);
  }

  async submitBatch(id, userId) {
    const batch = await DDDClaimBatch.findById(id);
    if (!batch) throw new Error('Batch not found');
    batch.status = 'submitted';
    batch.submittedAt = new Date();
    batch.submittedBy = userId;
    // Update individual claims
    await DDDClaim.updateMany(
      { _id: { $in: batch.claimIds } },
      { status: 'submitted', submittedAt: new Date(), submittedBy: userId, batchId: batch._id }
    );
    await batch.save();
    return batch;
  }

  /* ── Appeals ── */
  async listAppeals(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.claimId) q.claimId = filters.claimId;
    if (filters.status) q.status = filters.status;
    if (filters.level) q.level = filters.level;
    return DDDClaimAppeal.find(q).sort({ createdAt: -1 }).lean();
  }
  async getAppeal(id) { return this._getById(DDDClaimAppeal, id); }

  async createAppeal(data) {
    data.appealNumber = data.appealNumber || (await this._nextAppealNumber());
    data.history = [{ action: 'created', date: new Date(), actor: 'system' }];
    // Update claim status
    await DDDClaim.findByIdAndUpdate(data.claimId, {
      status: 'appealed',
      $push: { history: { action: 'appeal_filed', date: new Date(), actor: 'system' } },
    });
    return DDDClaimAppeal.create(data);
  }

  async submitAppeal(id, userId) {
    return DDDClaimAppeal.findByIdAndUpdate(
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

  async resolveAppeal(id, resolution) {
    const update = {
      status: resolution.approved ? 'approved' : 'denied',
      reviewedAt: new Date(),
      reviewedBy: resolution.reviewer,
      resolvedAt: new Date(),
      $push: {
        history: {
          action: resolution.approved ? 'approved' : 'denied',
          date: new Date(),
          actor: resolution.reviewer,
        },
      },
    };
    if (resolution.approvedAmount) update.approvedAmount = resolution.approvedAmount;
    return DDDClaimAppeal.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  /* ── EOBs ── */
  async listEOBs(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.claimId) q.claimId = filters.claimId;
    if (filters.type) q.type = filters.type;
    return DDDEOB.find(q).sort({ processedDate: -1 }).lean();
  }
  async getEOB(id) { return this._getById(DDDEOB, id); }

  async createEOB(data) {
    data.eobNumber = data.eobNumber || (await this._nextEOBNumber());
    const eob = await DDDEOB.create(data);
    // Link EOB to claim
    if (data.claimId) {
      await DDDClaim.findByIdAndUpdate(data.claimId, { eobId: eob._id });
    }
    return eob;
  }

  /* ── Analytics ── */
  async getClaimsSummary(filters = {}) {
    const match = {};
    if (filters.from || filters.to) {
      match.createdAt = {};
      if (filters.from) match.createdAt.$gte = new Date(filters.from);
      if (filters.to) match.createdAt.$lte = new Date(filters.to);
    }
    const [statusBreakdown] = await DDDClaim.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCharged: { $sum: '$totalCharged' },
          totalApproved: { $sum: '$totalApproved' },
          totalDenied: { $sum: '$totalDenied' },
          totalPaid: { $sum: '$totalPaid' },
        },
      },
    ]).then(r => [r]);
    const deniedClaims = await DDDClaim.countDocuments({ ...match, status: 'denied' });
    const totalClaims = await DDDClaim.countDocuments(match);
    return {
      byStatus: statusBreakdown || [],
      denialRate: totalClaims > 0 ? Math.round((deniedClaims / totalClaims) * 10000) / 100 : 0,
      totalClaims,
    };
  }

  async getAgingReport() {
    const now = new Date();
    const ranges = [
      { label: '0-30 days', min: 0, max: 30 },
      { label: '31-60 days', min: 31, max: 60 },
      { label: '61-90 days', min: 61, max: 90 },
      { label: '91-120 days', min: 91, max: 120 },
      { label: '120+ days', min: 121, max: 9999 },
    ];
    const results = [];
    for (const range of ranges) {
      const from = new Date(now);
      from.setDate(from.getDate() - range.max);
      const to = new Date(now);
      to.setDate(to.getDate() - range.min);
      const claims = await DDDClaim.find({
        status: { $in: ['submitted', 'in_review', 'acknowledged'] },
        submittedAt: { $gte: from, $lte: to },
      }).lean();
      const totalAmount = claims.reduce((s, c) => s + (c.totalCharged || 0), 0);
      results.push({ ...range, count: claims.length, totalAmount });
    }
    return results;
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new ClaimsProcessor();

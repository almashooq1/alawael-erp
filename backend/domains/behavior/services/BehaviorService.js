/**
 * BehaviorService — خدمة إدارة السلوك
 *
 * تتبع الحوادث السلوكية، إدارة خطط السلوك،
 * تحليل الأنماط، لوحة المعلومات
 */

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class BehaviorService extends BaseService {
  constructor() {
    super({ serviceName: 'BehaviorService', cachePrefix: 'behavior' });
  }

  /* ═══════════════════════ RECORDS ═══════════════════════ */

  async createRecord(data) {
    const BehaviorRecord = mongoose.model('BehaviorRecord');
    const record = await BehaviorRecord.create(data);
    this.emit('behavior:record:created', {
      recordId: record._id,
      beneficiaryId: data.beneficiaryId,
      severity: data.behavior?.severity,
    });
    // Auto-notify for severe/crisis
    if (['severe', 'crisis'].includes(data.behavior?.severity)) {
      this.emit('behavior:alert:severe', {
        recordId: record._id,
        beneficiaryId: data.beneficiaryId,
        severity: data.behavior.severity,
      });
    }
    return record;
  }

  async listRecords({
    beneficiaryId,
    behaviorPlanId,
    topography,
    severity,
    from,
    to,
    page = 1,
    limit = 20,
  } = {}) {
    const BehaviorRecord = mongoose.model('BehaviorRecord');
    const q = { isDeleted: { $ne: true } };
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (behaviorPlanId) q.behaviorPlanId = behaviorPlanId;
    if (topography) q['behavior.topography'] = topography;
    if (severity) q['behavior.severity'] = severity;
    if (from || to) {
      q.occurredAt = {};
      if (from) q.occurredAt.$gte = new Date(from);
      if (to) q.occurredAt.$lte = new Date(to);
    }
    const total = await BehaviorRecord.countDocuments(q);
    const data = await BehaviorRecord.find(q)
      .sort({ occurredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('reportedBy', 'name email')
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  async getRecord(id) {
    const BehaviorRecord = mongoose.model('BehaviorRecord');
    return BehaviorRecord.findById(id)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('reportedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .lean();
  }

  async reviewRecord(id, reviewData) {
    const BehaviorRecord = mongoose.model('BehaviorRecord');
    return BehaviorRecord.findByIdAndUpdate(
      id,
      {
        status: 'reviewed',
        reviewedBy: reviewData.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reviewData.notes,
      },
      { new: true }
    );
  }

  /* ═══════════════════════ PLANS ═══════════════════════ */

  async createPlan(data) {
    const BehaviorPlan = mongoose.model('BehaviorPlan');
    const plan = await BehaviorPlan.create(data);
    this.emit('behavior:plan:created', { planId: plan._id, beneficiaryId: data.beneficiaryId });
    return plan;
  }

  async listPlans({ beneficiaryId, status, page = 1, limit = 20 } = {}) {
    const BehaviorPlan = mongoose.model('BehaviorPlan');
    const q = { isDeleted: { $ne: true } };
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (status) q.status = status;
    const total = await BehaviorPlan.countDocuments(q);
    const data = await BehaviorPlan.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('createdBy', 'name email')
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  async getPlan(id) {
    const BehaviorPlan = mongoose.model('BehaviorPlan');
    return BehaviorPlan.findById(id)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();
  }

  async updatePlan(id, data) {
    const BehaviorPlan = mongoose.model('BehaviorPlan');
    return BehaviorPlan.findByIdAndUpdate(id, { ...data, $inc: { version: 1 } }, { new: true });
  }

  async approvePlan(id, approverId) {
    const BehaviorPlan = mongoose.model('BehaviorPlan');
    return BehaviorPlan.findByIdAndUpdate(
      id,
      { status: 'active', approvedBy: approverId, approvedAt: new Date() },
      { new: true }
    );
  }

  async addReview(planId, review) {
    const BehaviorPlan = mongoose.model('BehaviorPlan');
    return BehaviorPlan.findByIdAndUpdate(
      planId,
      {
        $push: { reviews: { ...review, date: new Date() } },
        reviewDate: review.nextReviewDate,
      },
      { new: true }
    );
  }

  /* ═══════════════════════ ANALYTICS ═══════════════════════ */

  async getBeneficiaryAnalytics(beneficiaryId, days = 90) {
    const BehaviorRecord = mongoose.model('BehaviorRecord');
    const since = new Date(Date.now() - days * 86400000);
    const bid = new mongoose.Types.ObjectId(beneficiaryId);

    const [topographyDist, severityTrend, functionDist, weeklyFrequency] = await Promise.all([
      BehaviorRecord.aggregate([
        { $match: { beneficiaryId: bid, occurredAt: { $gte: since }, isDeleted: { $ne: true } } },
        { $group: { _id: '$behavior.topography', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      BehaviorRecord.aggregate([
        { $match: { beneficiaryId: bid, occurredAt: { $gte: since }, isDeleted: { $ne: true } } },
        {
          $group: {
            _id: {
              week: { $isoWeek: '$occurredAt' },
              year: { $isoWeekYear: '$occurredAt' },
              severity: '$behavior.severity',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]),
      BehaviorRecord.aggregate([
        { $match: { beneficiaryId: bid, occurredAt: { $gte: since }, isDeleted: { $ne: true } } },
        { $group: { _id: '$hypothesizedFunction', count: { $sum: 1 } } },
      ]),
      BehaviorRecord.aggregate([
        { $match: { beneficiaryId: bid, occurredAt: { $gte: since }, isDeleted: { $ne: true } } },
        {
          $group: {
            _id: { week: { $isoWeek: '$occurredAt' }, year: { $isoWeekYear: '$occurredAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]),
    ]);

    return {
      topographyDistribution: topographyDist,
      severityTrend,
      functionDistribution: functionDist,
      weeklyFrequency,
    };
  }

  /* ── Dashboard ── */
  async getDashboard(branchId) {
    const BehaviorRecord = mongoose.model('BehaviorRecord');
    const BehaviorPlan = mongoose.model('BehaviorPlan');
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [severityCounts, activePlans, recentCrisis, restraintUse] = await Promise.all([
      BehaviorRecord.aggregate([
        { $match: { ...match, occurredAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$behavior.severity', count: { $sum: 1 } } },
      ]),
      BehaviorPlan.countDocuments({ ...match, status: 'active' }),
      BehaviorRecord.countDocuments({
        ...match,
        'behavior.severity': { $in: ['severe', 'crisis'] },
        occurredAt: { $gte: thirtyDaysAgo },
      }),
      BehaviorRecord.countDocuments({
        ...match,
        'restraintLog.used': true,
        occurredAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    return {
      last30Days: Object.fromEntries(severityCounts.map(s => [s._id, s.count])),
      totalIncidents: severityCounts.reduce((s, r) => s + r.count, 0),
      activePlans,
      recentCrisis,
      restraintUse,
    };
  }
}

const behaviorService = new BehaviorService();
module.exports = { behaviorService };

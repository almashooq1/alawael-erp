'use strict';

/**
 * hrPerformanceService.js — خدمة تقييم الأداء الوظيفي
 *
 * Full CRUD + analytics over PerformanceEvaluation, SuccessionPlan,
 * and related models. All models are injected at construction time —
 * no module-level require — enabling clean unit testing.
 *
 * Rating scale: 1-5  →  ممتاز / جيد جداً / جيد / مقبول / ضعيف
 * Weighted average:  management 40%, peers 30%, recipients 20%, self 10%
 */

const RATING_LABELS = {
  5: 'ممتاز',
  4: 'جيد جداً',
  3: 'جيد',
  2: 'مقبول',
  1: 'ضعيف',
};

function scoreToRating(score) {
  if (score >= 4.5) return 'ممتاز';
  if (score >= 3.5) return 'جيد جداً';
  if (score >= 2.5) return 'جيد';
  if (score >= 1.5) return 'مقبول';
  return 'ضعيف';
}

class HrPerformanceService {
  /**
   * @param {object} opts
   * @param {object} opts.PerformanceEvaluation  — Mongoose model
   * @param {object} opts.SuccessionPlan         — Mongoose model
   * @param {object} opts.Employee               — Mongoose model (optional)
   * @param {object} opts.logger                 — pino / winston compatible
   */
  constructor({ PerformanceEvaluation, SuccessionPlan, Employee, logger }) {
    this.PE = PerformanceEvaluation;
    this.SP = SuccessionPlan;
    this.Emp = Employee || null;
    this.log = logger;
  }

  /* ─────────────────────────────────────────────────────────────
   * EVALUATION — LIST / GET / CREATE / UPDATE / DELETE / APPROVE
   * ───────────────────────────────────────────────────────────── */

  /**
   * List evaluations with optional filters + pagination.
   */
  async listEvaluations({ employeeId, status, period, page = 1, limit = 20, branchId } = {}) {
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (branchId) filter.branchId = branchId;
    if (period) {
      filter['evaluationPeriod.startDate'] = { $lte: new Date(period) };
      filter['evaluationPeriod.endDate'] = { $gte: new Date(period) };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [data, total] = await Promise.all([
      this.PE.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('employeeId', 'name nameAr position department avatar')
        .populate('approvedBy', 'name nameAr')
        .lean(),
      this.PE.countDocuments(filter),
    ]);

    return {
      data,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total },
    };
  }

  /**
   * Get a single evaluation by ID.
   */
  async getEvaluation(id) {
    const doc = await this.PE.findById(id)
      .populate('employeeId', 'name nameAr position department avatar employeeId')
      .populate('approvedBy', 'name nameAr')
      .lean();
    if (!doc) throw Object.assign(new Error('التقييم غير موجود'), { status: 404 });
    return doc;
  }

  /**
   * Create a new draft evaluation.
   */
  async createEvaluation(body, createdById) {
    const { employeeId, evaluationPeriod, hrNotes, branchId } = body;
    if (!employeeId) throw Object.assign(new Error('معرف الموظف مطلوب'), { status: 400 });
    if (!evaluationPeriod?.startDate || !evaluationPeriod?.endDate) {
      throw Object.assign(new Error('فترة التقييم مطلوبة'), { status: 400 });
    }

    const doc = await this.PE.create({
      employeeId,
      evaluationPeriod,
      hrNotes,
      branchId,
      status: 'draft',
      summary: { overallRating: 'مقبول' },
      createdBy: createdById,
    });

    this.log.info({ evalId: doc._id, employeeId }, '[HrPerf] evaluation created');
    return doc;
  }

  /**
   * Submit evaluator scores (management / peer / recipient / self).
   * Automatically recalculates weighted summary.
   */
  async submitEvaluation(
    id,
    { evaluatorId, evaluationType, scores, comments, strengths, areasForImprovement }
  ) {
    const doc = await this.PE.findById(id);
    if (!doc) throw Object.assign(new Error('التقييم غير موجود'), { status: 404 });
    if (doc.status === 'approved')
      throw Object.assign(new Error('لا يمكن تعديل تقييم معتمد'), { status: 409 });

    const rawScore =
      scores && scores.length ? scores.reduce((s, c) => s + (c.score || 0), 0) / scores.length : 0;

    const evalEntry = {
      evaluatedBy: evaluatorId,
      evaluationType,
      score: rawScore,
      scores: scores || [],
      comments,
      strengths: strengths || [],
      areasForImprovement: areasForImprovement || [],
    };

    if (evaluationType === 'management') {
      doc.evaluations.managementEvaluation = evalEntry;
    } else if (evaluationType === 'peer') {
      doc.evaluations.peerEvaluations = doc.evaluations.peerEvaluations || [];
      doc.evaluations.peerEvaluations.push(evalEntry);
    } else if (evaluationType === 'recipient') {
      doc.evaluations.recipientEvaluations = doc.evaluations.recipientEvaluations || [];
      doc.evaluations.recipientEvaluations.push(evalEntry);
    } else if (evaluationType === 'self') {
      doc.evaluations.selfEvaluation = evalEntry;
    }

    // Recalculate weighted overall score
    doc.summary = doc.summary || {};
    const mgmt = doc.evaluations.managementEvaluation?.score || 0;
    const peerArr = doc.evaluations.peerEvaluations || [];
    const peerAvg = peerArr.length
      ? peerArr.reduce((s, e) => s + (e.score || 0), 0) / peerArr.length
      : 0;
    const recArr = doc.evaluations.recipientEvaluations || [];
    const recAvg = recArr.length
      ? recArr.reduce((s, e) => s + (e.score || 0), 0) / recArr.length
      : 0;
    const self = doc.evaluations.selfEvaluation?.score || 0;

    const weights = { management: 0.4, peers: 0.3, recipients: 0.2, self: 0.1 };
    let weighted = 0;
    let totalW = 0;
    if (mgmt) {
      weighted += mgmt * weights.management;
      totalW += weights.management;
    }
    if (peerAvg) {
      weighted += peerAvg * weights.peers;
      totalW += weights.peers;
    }
    if (recAvg) {
      weighted += recAvg * weights.recipients;
      totalW += weights.recipients;
    }
    if (self) {
      weighted += self * weights.self;
      totalW += weights.self;
    }

    const overall = totalW > 0 ? weighted / totalW : 0;
    doc.summary.overallScore = Math.round(overall * 10) / 10;
    doc.summary.overallRating = scoreToRating(overall);
    doc.summary.weightedScores = {
      management: Math.round(mgmt * 10) / 10,
      peers: Math.round(peerAvg * 10) / 10,
      recipients: Math.round(recAvg * 10) / 10,
      self: Math.round(self * 10) / 10,
    };

    doc.status = 'in_progress';
    doc.updatedAt = new Date();
    await doc.save();

    this.log.info({ evalId: id, evaluationType, overall }, '[HrPerf] evaluation scores submitted');
    return doc;
  }

  /**
   * Approve an evaluation.
   */
  async approveEvaluation(id, approverId) {
    const doc = await this.PE.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: approverId,
        approvalDate: new Date(),
        updatedAt: new Date(),
      },
      { returnDocument: 'after' }
    );
    if (!doc) throw Object.assign(new Error('التقييم غير موجود'), { status: 404 });
    this.log.info({ evalId: id, approverId }, '[HrPerf] evaluation approved');
    return doc;
  }

  /**
   * Delete (archive) an evaluation.
   */
  async deleteEvaluation(id) {
    const doc = await this.PE.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { returnDocument: 'after' }
    );
    if (!doc) throw Object.assign(new Error('التقييم غير موجود'), { status: 404 });
    return { deleted: true };
  }

  /* ─────────────────────────────────────────────────────────────
   * SUCCESSION PLANS
   * ───────────────────────────────────────────────────────────── */

  async listSuccessionPlans({ status, department, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [data, total] = await Promise.all([
      this.SP.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      this.SP.countDocuments(filter),
    ]);
    return { data, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total } };
  }

  async createSuccessionPlan(body) {
    const doc = await this.SP.create({ ...body, status: body.status || 'active' });
    this.log.info({ planId: doc._id }, '[HrPerf] succession plan created');
    return doc;
  }

  async updateSuccessionPlan(id, body) {
    const doc = await this.SP.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    if (!doc) throw Object.assign(new Error('خطة التعاقب غير موجودة'), { status: 404 });
    return doc;
  }

  async deleteSuccessionPlan(id) {
    const doc = await this.SP.findByIdAndDelete(id);
    if (!doc) throw Object.assign(new Error('خطة التعاقب غير موجودة'), { status: 404 });
    return { deleted: true };
  }

  /* ─────────────────────────────────────────────────────────────
   * ANALYTICS — performance distribution + rating breakdown
   * ───────────────────────────────────────────────────────────── */

  /**
   * Aggregate performance stats for dashboard KPIs.
   */
  async getPerformanceStats({ branchId } = {}) {
    const filter = { status: 'approved' };
    if (branchId) filter.branchId = branchId;

    const [ratingDist, total, recentEvals] = await Promise.all([
      this.PE.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$summary.overallRating',
            count: { $sum: 1 },
            avgScore: { $avg: '$summary.overallScore' },
          },
        },
        { $sort: { avgScore: -1 } },
      ]),
      this.PE.countDocuments(filter),
      this.PE.find({ status: { $in: ['draft', 'in_progress', 'pending_review'] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('employeeId', 'name nameAr')
        .lean(),
    ]);

    const overallAvg =
      ratingDist.reduce((s, r) => s + (r.avgScore || 0) * r.count, 0) / (total || 1);
    const promotionCount = await this.PE.countDocuments({
      ...filter,
      'summary.promotionRecommended': true,
    });

    return {
      totalApproved: total,
      overallAverage: Math.round(overallAvg * 10) / 10,
      promotionRecommended: promotionCount,
      ratingDistribution: Object.fromEntries(
        Object.values(RATING_LABELS).map(label => {
          const found = ratingDist.find(r => r._id === label);
          return [label, found?.count || 0];
        })
      ),
      pendingReviews: recentEvals,
    };
  }

  /* ─────────────────────────────────────────────────────────────
   * SAFE WRAPPER — graceful degradation
   * ───────────────────────────────────────────────────────────── */
  async _safe(fn) {
    try {
      return await fn();
    } catch (err) {
      this.log.warn({ err: err.message }, '[HrPerf] non-critical error');
      return null;
    }
  }
}

module.exports = { HrPerformanceService };

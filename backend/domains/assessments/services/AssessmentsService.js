/**
 * AssessmentsService — خدمة التقييمات السريرية
 *
 * تدير دورة حياة التقييم السريري الكاملة:
 *  - إنشاء التقييمات وجدولتها
 *  - تحديث النتائج وتوثيق البيانات السريرية
 *  - استكمال التقييم وتسجيل الدرجات والتفسير
 *  - إحصاءات لوحة التحكم والتقارير
 *
 * @module domains/assessments/services/AssessmentsService
 */

'use strict';

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class AssessmentsService extends BaseService {
  constructor() {
    super({ serviceName: 'AssessmentsService', cachePrefix: 'assessments' });
  }

  /* ═══════════════════════ CREATE ═══════════════════════ */

  /**
   * إنشاء تقييم سريري جديد
   * @param {Object} data - بيانات التقييم
   * @returns {Promise<Object>} التقييم المنشأ
   */
  async createAssessment(data) {
    const ClinicalAssessment = mongoose.model('ClinicalAssessment');

    // Accept both DDD-style aliases and canonical field names
    const beneficiaryValue = data.beneficiary || data.beneficiaryId;
    const toolValue = data.tool || data.type;

    if (!beneficiaryValue) {
      const err = new Error('beneficiary مطلوب');
      err.statusCode = 400;
      throw err;
    }
    if (!toolValue) {
      const err = new Error('tool مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const payload = {
      beneficiary: beneficiaryValue,
      tool: toolValue,
      assessmentDate: data.assessmentDate || data.scheduledDate || new Date(),
      status: 'draft',
    };
    if (data.category) payload.category = data.category;
    if (data.therapist || data.assessorId) payload.therapist = data.therapist || data.assessorId;
    if (data.episodeId) payload.episodeId = data.episodeId;
    if (data.branchId) payload.branchId = data.branchId;
    if (data.toolVersion) payload.toolVersion = data.toolVersion;

    const assessment = await ClinicalAssessment.create(payload);

    this.emit('assessment:created', {
      assessmentId: assessment._id,
      beneficiaryId: String(assessment.beneficiary),
      tool: assessment.tool,
    });

    return assessment;
  }

  /* ═══════════════════════ QUERIES ═══════════════════════ */

  /**
   * قائمة التقييمات مع الفلترة والترقيم
   * @param {Object} filter - معايير الفلترة
   * @param {Object} pagination - { limit, skip }
   * @returns {Promise<{data: Object[], total: number}>}
   */
  async listAssessments(filter = {}, { limit = 20, skip = 0 } = {}) {
    const ClinicalAssessment = mongoose.model('ClinicalAssessment');

    const q = {};
    const beneficiaryValue = filter.beneficiary || filter.beneficiaryId;
    if (beneficiaryValue) q.beneficiary = beneficiaryValue;
    const categoryValue = filter.category || filter.type;
    if (categoryValue) q.category = categoryValue;
    if (filter.status) q.status = filter.status;
    if (filter.therapist) q.therapist = filter.therapist;
    if (filter.from || filter.to) {
      q.assessmentDate = {};
      if (filter.from) q.assessmentDate.$gte = new Date(filter.from);
      if (filter.to) q.assessmentDate.$lte = new Date(filter.to);
    }

    const [data, total] = await Promise.all([
      ClinicalAssessment.find(q)
        .sort({ assessmentDate: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      ClinicalAssessment.countDocuments(q),
    ]);

    return { data, total };
  }

  /**
   * جلب تقييم بمعرفه
   * @param {string} id - معرف التقييم
   * @returns {Promise<Object>} التقييم
   * @throws {Error} 404 إذا لم يوجد التقييم
   */
  async getAssessmentById(id) {
    const ClinicalAssessment = mongoose.model('ClinicalAssessment');
    const assessment = await ClinicalAssessment.findById(id).lean();
    if (!assessment) {
      const err = new Error('التقييم غير موجود');
      err.statusCode = 404;
      throw err;
    }
    return assessment;
  }

  /**
   * جلب تقييمات مستفيد محدد
   * @param {string} beneficiaryId
   * @param {Object} pagination - { limit, skip }
   * @returns {Promise<{data: Object[], total: number}>}
   */
  async getBeneficiaryAssessments(beneficiaryId, { limit = 50, skip = 0 } = {}) {
    const ClinicalAssessment = mongoose.model('ClinicalAssessment');
    const q = { beneficiary: beneficiaryId };

    const [data, total] = await Promise.all([
      ClinicalAssessment.find(q)
        .sort({ assessmentDate: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      ClinicalAssessment.countDocuments(q),
    ]);

    return { data, total };
  }

  /* ═══════════════════════ MUTATIONS ═══════════════════════ */

  /**
   * تحديث بيانات تقييم
   * @param {string} id
   * @param {Object} data - البيانات المراد تحديثها
   * @returns {Promise<Object>} التقييم المحدث
   */
  async updateAssessment(id, data) {
    const ClinicalAssessment = mongoose.model('ClinicalAssessment');
    const assessment = await ClinicalAssessment.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!assessment) {
      const err = new Error('التقييم غير موجود');
      err.statusCode = 404;
      throw err;
    }

    this.emit('assessment:updated', {
      assessmentId: assessment._id,
      beneficiaryId: String(assessment.beneficiary),
    });

    return assessment;
  }

  /**
   * استكمال تقييم وتسجيل النتائج
   * @param {string} id
   * @param {Object} completionData - { results, summary, score, recommendations, scoreBreakdown, interpretation, duration }
   * @returns {Promise<Object>} التقييم المكتمل
   */
  async completeAssessment(id, completionData) {
    const ClinicalAssessment = mongoose.model('ClinicalAssessment');
    const { results, summary, score, recommendations, scoreBreakdown, interpretation, duration } =
      completionData;

    const assessment = await ClinicalAssessment.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'completed',
          completedDate: new Date(),
          results: results || {},
          summary,
          score,
          recommendations: recommendations || [],
          scoreBreakdown: scoreBreakdown || [],
          interpretation,
          duration,
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!assessment) {
      const err = new Error('التقييم غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // W380: canonical contract event (was ad-hoc 'assessment:completed' pre-W380).
    // Envelope per ASSESSMENT_EVENTS.COMPLETED. `type` sourced from tool;
    // episodeId from the linked episode field if any.
    this.emit('assessment.completed', {
      assessmentId: assessment._id,
      beneficiaryId: String(assessment.beneficiary),
      episodeId: assessment.episodeId ? String(assessment.episodeId) : undefined,
      type: assessment.tool,
      overallScore: assessment.score,
    });

    return assessment;
  }

  /* ═══════════════════════ DASHBOARD ═══════════════════════ */

  /**
   * إحصاءات لوحة التحكم للتقييمات
   * @param {Object} dateRange - { from, to }
   * @returns {Promise<Object>} مجموعة الإحصاءات
   */
  async getDashboard({ from, to } = {}) {
    const ClinicalAssessment = mongoose.model('ClinicalAssessment');
    const dateFilter = {};
    if (from || to) {
      dateFilter.assessmentDate = {};
      if (from) dateFilter.assessmentDate.$gte = new Date(from);
      if (to) dateFilter.assessmentDate.$lte = new Date(to);
    }

    const [total, byStatus, overdue, byTool] = await Promise.all([
      ClinicalAssessment.countDocuments(dateFilter),
      ClinicalAssessment.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ClinicalAssessment.countDocuments({
        status: 'draft',
        assessmentDate: { $lt: new Date() },
      }),
      ClinicalAssessment.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$tool', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const statusMap = Object.fromEntries(byStatus.map(r => [r._id, r.count]));

    return { total, byStatus: statusMap, overdue, byTool };
  }
}

const assessmentsService = new AssessmentsService();

module.exports = { AssessmentsService, assessmentsService };

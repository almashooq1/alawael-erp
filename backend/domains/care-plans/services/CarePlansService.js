/**
 * CarePlansService — خدمة خطط الرعاية الموحدة
 *
 * تدير دورة حياة خطة الرعاية الكاملة:
 *  - إنشاء وتفعيل واستكمال الخطط
 *  - إضافة الأهداف والتدخلات
 *  - استعلامات حسب المستفيد والحلقة العلاجية
 *  - إحصاءات لوحة التحكم
 *
 * @module domains/care-plans/services/CarePlansService
 */

'use strict';

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class CarePlansService extends BaseService {
  constructor() {
    super({ serviceName: 'CarePlansService', cachePrefix: 'care-plans' });
  }

  /* ═══════════════════════ CREATE ═══════════════════════ */

  /**
   * إنشاء خطة رعاية جديدة
   * @param {Object} data - بيانات الخطة
   * @returns {Promise<Object>} الخطة المنشأة
   */
  async createPlan(data) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');

    if (!data.beneficiaryId) {
      const err = new Error('beneficiaryId مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const plan = await UnifiedCarePlan.create({
      beneficiaryId: data.beneficiaryId,
      episodeId: data.episodeId,
      type: data.type || 'rehabilitation',
      goals: data.goals || [],
      interventions: data.interventions || [],
      primaryTherapistId: data.primaryTherapistId,
      status: 'draft',
    });

    this.emit('care-plan:created', {
      planId: plan._id,
      beneficiaryId: plan.beneficiaryId,
      episodeId: plan.episodeId,
      type: plan.type,
    });

    return plan;
  }

  /* ═══════════════════════ QUERIES ═══════════════════════ */

  /**
   * قائمة خطط الرعاية مع الفلترة والترقيم
   * @param {Object} filter - معايير الفلترة
   * @param {Object} pagination - { limit, skip }
   * @returns {Promise<{data: Object[], total: number}>}
   */
  async listPlans(filter = {}, { limit = 20, skip = 0 } = {}) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');

    const q = {};
    if (filter.beneficiaryId) q.beneficiaryId = filter.beneficiaryId;
    if (filter.episodeId) q.episodeId = filter.episodeId;
    if (filter.status) q.status = filter.status;

    const [data, total] = await Promise.all([
      UnifiedCarePlan.find(q)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      UnifiedCarePlan.countDocuments(q),
    ]);

    return { data, total };
  }

  /**
   * جلب خطة رعاية بمعرفها
   * @param {string} id - معرف الخطة
   * @returns {Promise<Object>} الخطة
   * @throws {Error} 404 إذا لم توجد الخطة
   */
  async getPlanById(id) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');
    const plan = await UnifiedCarePlan.findById(id).lean();
    if (!plan) {
      const err = new Error('خطة الرعاية غير موجودة');
      err.statusCode = 404;
      throw err;
    }
    return plan;
  }

  /**
   * جلب خطط رعاية مستفيد محدد
   * @param {string} beneficiaryId
   * @returns {Promise<Object[]>}
   */
  async getBeneficiaryPlans(beneficiaryId) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');
    const data = await UnifiedCarePlan.find({ beneficiaryId }).sort({ createdAt: -1 }).lean();
    return { data, total: data.length };
  }

  /* ═══════════════════════ MUTATIONS ═══════════════════════ */

  /**
   * تحديث بيانات خطة رعاية
   * @param {string} id
   * @param {Object} data - البيانات المراد تحديثها
   * @returns {Promise<Object>} الخطة المحدثة
   */
  async updatePlan(id, data) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');
    const plan = await UnifiedCarePlan.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!plan) {
      const err = new Error('خطة الرعاية غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    this.emit('care-plan:updated', {
      planId: plan._id,
      beneficiaryId: plan.beneficiaryId,
    });

    return plan;
  }

  /**
   * تفعيل خطة رعاية (draft → active)
   * @param {string} id
   * @returns {Promise<Object>} الخطة المفعّلة
   */
  async activatePlan(id) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');
    const plan = await UnifiedCarePlan.findByIdAndUpdate(
      id,
      { $set: { status: 'active', activatedDate: new Date() } },
      { new: true }
    ).lean();

    if (!plan) {
      const err = new Error('خطة الرعاية غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    this.emit('care-plan:activated', {
      planId: plan._id,
      beneficiaryId: plan.beneficiaryId,
    });

    return plan;
  }

  /**
   * استكمال خطة رعاية
   * @param {string} id
   * @param {Object} completionData - { summary, outcomeRating }
   * @returns {Promise<Object>} الخطة المكتملة
   */
  async completePlan(id, { summary, outcomeRating } = {}) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');
    const plan = await UnifiedCarePlan.findByIdAndUpdate(
      id,
      { $set: { status: 'completed', completedDate: new Date(), summary, outcomeRating } },
      { new: true }
    ).lean();

    if (!plan) {
      const err = new Error('خطة الرعاية غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    this.emit('care-plan:completed', {
      planId: plan._id,
      beneficiaryId: plan.beneficiaryId,
      outcomeRating,
    });

    return plan;
  }

  /**
   * إضافة هدف إلى خطة رعاية
   * @param {string} id - معرف الخطة
   * @param {Object} goal - بيانات الهدف
   * @returns {Promise<Object>} الخطة بعد الإضافة
   */
  async addGoal(id, goal) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');
    const plan = await UnifiedCarePlan.findByIdAndUpdate(
      id,
      { $push: { goals: goal } },
      { new: true }
    ).lean();

    if (!plan) {
      const err = new Error('خطة الرعاية غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    return plan;
  }

  /* ═══════════════════════ DASHBOARD ═══════════════════════ */

  /**
   * إحصاءات لوحة التحكم لخطط الرعاية
   * @returns {Promise<Object>} مجموعة الإحصاءات
   */
  async getDashboard() {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');

    const [total, byStatus, active] = await Promise.all([
      UnifiedCarePlan.countDocuments({}),
      UnifiedCarePlan.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      UnifiedCarePlan.countDocuments({ status: 'active' }),
    ]);

    return {
      total,
      active,
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
    };
  }
}

const carePlansService = new CarePlansService();

module.exports = { CarePlansService, carePlansService };

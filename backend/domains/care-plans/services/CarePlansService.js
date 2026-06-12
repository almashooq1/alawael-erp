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

    // W1266 ROOT FIX (W1217-class): the previous payload wrote undeclared
    // keys (`goals`/`interventions` — silently dropped by strict mode),
    // passed `type:'rehabilitation'` (not in the enum → ValidationError),
    // and omitted the REQUIRED `startDate`. Mapped to the real schema, with
    // back-compat for callers still sending the old key names.
    const VALID_TYPES = [
      'comprehensive',
      'focused',
      'iep',
      'irp',
      'crisis',
      'maintenance',
      'transition',
    ];
    const plan = await UnifiedCarePlan.create({
      beneficiaryId: data.beneficiaryId,
      episodeId: data.episodeId,
      type: VALID_TYPES.includes(data.type) ? data.type : 'comprehensive',
      title_ar: data.title_ar || data.title || undefined,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      reviewCycle: data.reviewCycle || 'monthly',
      nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : undefined,
      globalGoals: data.globalGoals || data.goals || [],
      globalInterventions: data.globalInterventions || data.interventions || [],
      familyComponent: data.familyComponent || undefined,
      branchId: data.branchId || undefined,
      createdBy: data.createdBy || data.primaryTherapistId || undefined,
      status: 'draft',
    });

    this.emit('careplan.created', {
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
    // W1152 — branch isolation: routes pass effectiveBranchScope(req) here
    if (filter.branchId) q.branchId = filter.branchId;

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
      { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!plan) {
      const err = new Error('خطة الرعاية غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    // W945: canonical contract event (was ad-hoc 'care-plan:updated' pre-W945).
    // Carries episodeId so the unified CareTimeline can link the revision to the
    // beneficiary's episode of care, per doctrine "اربط كل خطة بالمستفيد والحلقة والزمن".
    this.emit('careplan.updated', {
      planId: plan._id,
      beneficiaryId: plan.beneficiaryId,
      episodeId: plan.episodeId,
    });

    return plan;
  }

  /**
   * تفعيل خطة رعاية (draft → active)
   * @param {string} id
   * @returns {Promise<Object>} الخطة المفعّلة
   */
  async activatePlan(id, { actor } = {}) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');
    const plan = await UnifiedCarePlan.findByIdAndUpdate(
      id,
      { $set: { status: 'active', activatedDate: new Date() } },
      { returnDocument: 'after' }
    ).lean();

    if (!plan) {
      const err = new Error('خطة الرعاية غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    // W1252 — integrity layer (ADR-040 (b) step 1): when the activating actor
    // is known, append an 'activate' signature to the hash chain + seal the
    // clinical body. FAIL-SAFE: integrity recording must never break the
    // activation itself (enforcement flips in a later wave once all callers
    // pass the actor).
    if (actor && actor.id) {
      try {
        const doc = await UnifiedCarePlan.findById(id);
        if (doc) {
          doc.appendSignature({
            userId: actor.id,
            role: actor.role || 'approver',
            action: 'activate',
          });
          doc.sealEvidence();

          // W1259 — generate the family-friendly version (W43 generator via
          // its unified adapter) so notify_family + the W45 retry worker can
          // serve UI plans. Stored ONLY when the deterministic safety floor
          // passes (readability + forbidden-term + section checks); a
          // requiresRewrite result is never sent to a family.
          try {
            const famGen = require('../../../intelligence/family-version-generator.service');
            const fam = famGen.generateForUnifiedPlan(doc);
            if (fam && fam.ok && famGen.isFamilyReady(fam)) {
              doc.familyVersion = {
                body: fam.markdown,
                readabilityGrade: fam.readability ? fam.readability.grade : null,
                generatedAt: new Date(),
              };
            }
          } catch (_e) {
            /* fail-safe — family version is best-effort at activation */
          }

          await doc.save();
        }
      } catch (e) {
        // non-fatal — surfaced via logs only

        console.warn(
          `[CarePlansService] W1252 integrity recording failed (non-fatal): ${e.message}`
        );
      }
    }

    // W380: canonical contract event (was ad-hoc 'care-plan:activated' pre-W380).
    // Envelope per CARE_PLAN_EVENTS.ACTIVATED. goalCount derived from plan.goals.
    this.emit('careplan.activated', {
      planId: plan._id,
      beneficiaryId: plan.beneficiaryId,
      episodeId: plan.episodeId,
      goalCount: Array.isArray(plan.goals) ? plan.goals.length : 0,
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
      { returnDocument: 'after' }
    ).lean();

    if (!plan) {
      const err = new Error('خطة الرعاية غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    // W380: canonical contract event (was ad-hoc 'care-plan:completed' pre-W380).
    // Envelope per CARE_PLAN_EVENTS.COMPLETED. achievementRate sourced from
    // outcomeRating (0-100 scale) when present, else null. W947 adds episodeId so
    // the unified CareTimeline links the completion to the beneficiary's episode.
    this.emit('careplan.completed', {
      planId: plan._id,
      beneficiaryId: plan.beneficiaryId,
      episodeId: plan.episodeId,
      achievementRate: typeof outcomeRating === 'number' ? outcomeRating : null,
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
      { returnDocument: 'after' }
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
   * @param {Object} [options] - { branchId } لتقييد الإحصاءات بفرع محدد
   * @returns {Promise<Object>} مجموعة الإحصاءات
   */
  async getDashboard({ branchId } = {}) {
    const UnifiedCarePlan = mongoose.model('UnifiedCarePlan');

    // W1152 — branch isolation: routes pass effectiveBranchScope(req) here
    const base = branchId ? { branchId } : {};

    const [total, byStatus, active] = await Promise.all([
      UnifiedCarePlan.countDocuments(base),
      UnifiedCarePlan.aggregate([
        ...(branchId ? [{ $match: base }] : []),
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      UnifiedCarePlan.countDocuments({ ...base, status: 'active' }),
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

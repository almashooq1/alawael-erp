/**
 * Beneficiary Repository — طبقة الوصول لبيانات المستفيد
 * @module domains/core/repositories/beneficiary.repository
 */

const { BaseRepository } = require('../../_base/BaseRepository');
const { Beneficiary } = require('../models/Beneficiary');

class BeneficiaryRepository extends BaseRepository {
  constructor() {
    super(Beneficiary, { softDelete: true, deletedField: 'isArchived' });
  }

  /**
   * W1563 — البحث بمعرف مع استبعاد المؤرشف افتراضياً.
   * BaseRepository.findById يتخطى _applyDeleteFilter (بخلاف find/findOne/count)، فكان
   * GET /:beneficiaryId (عبر service.getById) يُرجع مستفيداً مؤرشفاً/محذوفاً ناعماً —
   * تسريب PII. نمرّره عبر findOne الذي يطبّق فلتر الحذف الناعم. من يحتاج المؤرشف
   * صراحةً (مثل مسار إلغاء الأرشفة) يمرّر { includeDeleted: true }.
   */
  async findById(id, { select, populate, includeDeleted = false } = {}) {
    if (includeDeleted) {
      return super.findById(id, { select, populate });
    }
    return this.findOne({ _id: id }, { select, populate });
  }

  /**
   * بحث متقدم متعدد الحقول
   */
  async advancedSearch(filters) {
    return Beneficiary.advancedSearch(filters);
  }

  /**
   * إحصائيات المستفيدين
   */
  async getStatistics(branchId) {
    return Beneficiary.getStatistics(branchId);
  }

  /**
   * البحث بالرقم الطبي
   */
  async findByMRN(mrn) {
    return this.model.findOne({ mrn, isArchived: { $ne: true } }).lean();
  }

  /**
   * البحث بالهوية الوطنية
   */
  async findByNationalId(nationalId) {
    return this.model.findOne({ nationalId, isArchived: { $ne: true } }).lean();
  }

  /**
   * جلب المستفيد مع الحلقات العلاجية والخط الزمني
   */
  async findWithFullContext(id) {
    return this.model
      // W1563 — exclude soft-deleted (isArchived) from the 360 full-context read too.
      .findOne({ _id: id, isArchived: { $ne: true } })
      .populate('currentEpisodeId')
      .populate('episodes')
      .populate('timeline')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .lean({ virtuals: true });
  }

  /**
   * الحالات عالية المخاطر
   */
  async findHighRisk(branchId, limit = 20) {
    const filter = {
      isArchived: { $ne: true },
      overallRiskLevel: { $in: ['high', 'critical'] },
      status: { $in: ['active', 'on_hold'] },
    };
    if (branchId) filter.branchId = branchId;

    return this.model
      .find(filter)
      .sort({ overallRiskLevel: -1, updatedAt: -1 })
      .limit(limit)
      .lean({ virtuals: true });
  }

  /**
   * المستفيدون حسب الحالة
   */
  async findByStatus(status, branchId, { page = 1, limit = 20 } = {}) {
    const filter = { status, isArchived: { $ne: true } };
    if (branchId) filter.branchId = branchId;
    return this.findPaginated({ filter, page, limit });
  }

  /**
   * المستفيدون الذين يحتاجون متابعة (بدون حلقة نشطة)
   */
  async findWithoutActiveEpisode(branchId) {
    const filter = {
      isArchived: { $ne: true },
      status: 'active',
      currentEpisodeId: { $exists: false },
    };
    if (branchId) filter.branchId = branchId;
    return this.model.find(filter).lean({ virtuals: true });
  }
}

module.exports = { BeneficiaryRepository };

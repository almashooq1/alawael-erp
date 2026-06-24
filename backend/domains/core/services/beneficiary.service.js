/**
 * Beneficiary Service — خدمات المستفيد
 * @module domains/core/services/beneficiary.service
 */

const { BaseService } = require('../../_base/BaseService');
const logger = require('../../../utils/logger');
const legacyBeneficiaryCore = require('../../../services/beneficiaryCore.service');

class BeneficiaryService extends BaseService {
  constructor(repository) {
    super(repository, {
      name: 'BeneficiaryService',
      cache: { enabled: true, ttl: 120 },
    });
  }

  // ─── Lifecycle Hooks ────────────────────────────────────────────────

  async beforeCreate(data, context) {
    // Validate unique MRN
    if (data.mrn) {
      const existing = await this.repository.findByMRN(data.mrn);
      if (existing) {
        const error = new Error(`الرقم الطبي ${data.mrn} مسجل مسبقاً`);
        error.statusCode = 409;
        throw error;
      }
    }
    // Validate unique National ID
    if (data.nationalId) {
      const existing = await this.repository.findByNationalId(data.nationalId);
      if (existing) {
        const error = new Error(`رقم الهوية ${data.nationalId} مسجل مسبقاً`);
        error.statusCode = 409;
        throw error;
      }
    }
    // Set audit fields
    if (context.userId) {
      data.createdBy = context.userId;
      data.lastModifiedBy = context.userId;
    }
    if (context.branchId && !data.branchId) {
      data.branchId = context.branchId;
    }
  }

  async afterCreate(entity, _context) {
    logger.info(
      `[BeneficiaryService] New beneficiary created: ${entity._id} (${entity.fullNameArabic || entity.firstName})`
    );
    // W395: fire canonical contract event for the DDD registry.
    // Envelope per BENEFICIARY_DDD_EVENTS.REGISTERED in dddEventContracts:
    //   {beneficiaryId, mrn, name, disabilityType, disabilityLevel}.
    // The LIVE registry's `beneficiary.beneficiary.registered` is fired
    // separately by W394 modelEventBridge post-save hook. Subscribers in
    // dddCrossModuleSubscribers will receive this via W387 bridge.
    this.emit('beneficiary.registered', {
      beneficiaryId: entity._id,
      mrn: entity.mrn || '',
      name:
        entity.fullNameArabic ||
        entity.fullName ||
        `${entity.firstName || ''} ${entity.lastName || ''}`.trim() ||
        'Unknown',
      disabilityType: entity.disability?.primaryDiagnosis || '',
      disabilityLevel: entity.disability?.severity || '',
    });
  }

  async beforeUpdate(_id, data, _existing, context) {
    if (context.userId) {
      data.lastModifiedBy = context.userId;
    }
  }

  async afterUpdate(entity, previous, context) {
    // W380: canonical contract events (was ad-hoc 'statusChanged' pre-W380).
    // Two events fire on update:
    //   beneficiary.status_changed — when entity.status actually transitions
    //   beneficiary.profile_updated — for any other field change

    if (entity.status !== previous.status) {
      logger.info(
        `[BeneficiaryService] Status changed: ${previous.status} → ${entity.status} for ${entity._id}`
      );
      // Envelope per BENEFICIARY_DDD_EVENTS.STATUS_CHANGED.
      this.emit('beneficiary.status_changed', {
        beneficiaryId: entity._id,
        oldStatus: previous.status,
        newStatus: entity.status,
        reason: context?.reason || entity.statusReason || 'unspecified',
      });
    } else {
      // Status unchanged → fire profile-updated for the other-field-change path.
      // updatedFields list sourced from entity.modifiedPaths() when available;
      // falls back to ['unknown'] for lean docs.
      // Envelope per BENEFICIARY_DDD_EVENTS.PROFILE_UPDATED.
      const updatedFields =
        typeof entity.modifiedPaths === 'function'
          ? entity.modifiedPaths().filter(p => p !== 'updatedAt' && p !== 'lastModifiedBy')
          : ['unknown'];
      if (updatedFields.length > 0) {
        this.emit('beneficiary.profile_updated', {
          beneficiaryId: entity._id,
          updatedFields,
          updatedBy: context?.userId || entity.lastModifiedBy || 'system',
        });
      }
    }
  }

  // ─── Business Operations ────────────────────────────────────────────

  /**
   * بحث متقدم
   */
  async search(filters) {
    return this.repository.advancedSearch(filters);
  }

  /**
   * إحصائيات
   */
  async getStatistics(branchId) {
    return this.repository.getStatistics(branchId);
  }

  /**
   * جلب السياق الكامل للمستفيد (360°)
   */
  async getFullContext(id) {
    const beneficiary = await this.repository.findWithFullContext(id);
    if (!beneficiary) {
      const error = new Error(`المستفيد غير موجود: ${id}`);
      error.statusCode = 404;
      throw error;
    }
    return beneficiary;
  }

  /**
   * الحالات عالية المخاطر
   */
  async getHighRiskCases(branchId) {
    return this.repository.findHighRisk(branchId);
  }

  /**
   * أرشفة مستفيد
   */
  async archiveBeneficiary(id, reason, userId) {
    const beneficiary = await this.repository.model.findById(id);
    if (!beneficiary) {
      const error = new Error(`المستفيد غير موجود: ${id}`);
      error.statusCode = 404;
      throw error;
    }
    const result = await beneficiary.archive(reason, userId);
    this._invalidateCache();
    this.emit('archived', { beneficiaryId: id, reason });
    return result;
  }

  /**
   * إلغاء أرشفة مستفيد
   */
  async unarchiveBeneficiary(id, userId) {
    const beneficiary = await this.repository.model.findById(id);
    if (!beneficiary) {
      const error = new Error(`المستفيد غير موجود: ${id}`);
      error.statusCode = 404;
      throw error;
    }
    const result = await beneficiary.unarchive(userId);
    this._invalidateCache();
    this.emit('unarchived', { beneficiaryId: id });
    return result;
  }

  /**
   * إضافة علم مخاطر
   */
  async addRiskFlag(beneficiaryId, flag) {
    const beneficiary = await this.repository.model.findById(beneficiaryId);
    if (!beneficiary) {
      const error = new Error(`المستفيد غير موجود: ${beneficiaryId}`);
      error.statusCode = 404;
      throw error;
    }
    const result = await beneficiary.addRiskFlag(flag);
    this._invalidateCache();
    this.emit('riskFlagAdded', { beneficiaryId, flag });
    return result;
  }

  /**
   * حل علم مخاطر
   */
  async resolveRiskFlag(beneficiaryId, flagId, userId) {
    const beneficiary = await this.repository.model.findById(beneficiaryId);
    if (!beneficiary) {
      const error = new Error(`المستفيد غير موجود: ${beneficiaryId}`);
      error.statusCode = 404;
      throw error;
    }
    const result = await beneficiary.resolveRiskFlag(flagId, userId);
    this._invalidateCache();
    this.emit('riskFlagResolved', { beneficiaryId, flagId });
    return result;
  }

  /**
   * الحالات بدون حلقة علاجية نشطة (تحتاج متابعة)
   */
  async getCasesNeedingAttention(branchId) {
    return this.repository.findWithoutActiveEpisode(branchId);
  }

  /**
   * قائمة المستفيدين مع جميع الفلاتر المستخدمة في الواجهة الإدارية
   * (بحث، حالة، فئة، جنس، مدينة، عمر، فرع)
   */
  async listWithFilters({ page = 1, limit = 20, sort = { createdAt: -1 }, ...filters } = {}) {
    const Beneficiary = this.repository.model;
    const queryBuilder = Beneficiary.advancedSearch(filters);

    // advancedSearch does not apply branchId — add it here when present.
    const filter = queryBuilder.getFilter();
    if (filters.branchId) {
      filter.branchId = filters.branchId;
      queryBuilder.find(filter);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      queryBuilder.skip(skip).limit(limitNum).sort(sort).lean({ virtuals: true }),
      Beneficiary.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * تحديث حالة المستفيد
   */
  async updateStatus(id, status, context = {}) {
    return this.update(id, { status, statusReason: context.reason || '' }, context);
  }

  /**
   * تنفيذ عملية جماعية على مجموعة من المستفيدين
   */
  async bulkAction(action, ids, payload = {}, context = {}) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const error = new Error('يجب تحديد معرّفات المستفيدين');
      error.statusCode = 400;
      throw error;
    }

    const results = [];

    if (action === 'archive') {
      for (const id of ids) {
        const result = await this.archiveBeneficiary(
          id,
          payload.reason || 'أرشفة جماعية',
          context.userId
        );
        results.push({ id, status: 'archived', result });
      }
    } else if (action === 'update-status') {
      for (const id of ids) {
        const result = await this.updateStatus(id, payload.status, context);
        results.push({ id, status: payload.status, result });
      }
    } else if (action === 'delete') {
      for (const id of ids) {
        const result = await this.delete(id, context);
        results.push({ id, status: 'deleted', result });
      }
    } else {
      const error = new Error(`العملية الجماعية غير مدعومة: ${action}`);
      error.statusCode = 400;
      throw error;
    }

    this._invalidateCache();
    return { action, processed: results.length, results };
  }

  /**
   * أحدث المستفيدين المسجلين
   */
  async getRecent(limit = 5, branchId) {
    const filter = { isArchived: { $ne: true } };
    if (branchId) filter.branchId = branchId;

    return this.repository.find(filter, {
      sort: { createdAt: -1 },
      limit: parseInt(limit, 10),
    });
  }

  /**
   * بيانات جاهزة للتصدير (CSV/Excel)
   */
  async getExportData(filters = {}) {
    const Beneficiary = this.repository.model;
    const queryBuilder = Beneficiary.advancedSearch({ ...filters, limit: 10000 });

    const filter = queryBuilder.getFilter();
    if (filters.branchId) {
      filter.branchId = filters.branchId;
      queryBuilder.find(filter);
    }

    return queryBuilder.sort({ createdAt: -1 }).lean({ virtuals: true });
  }

  /**
   * الحالات عالية المخاطر (اسم بديل للواجهة الأمامية)
   */
  async getAtRisk(limit = 50, branchId) {
    return this.getHighRiskCases(branchId, limit);
  }

  /**
   * قائمة المدن المسجلة للمستفيدين
   */
  async getCities(branchId) {
    const filter = { isArchived: { $ne: true } };
    if (branchId) filter.branchId = branchId;

    const cities = await this.repository.model
      .distinct('address.city', filter)
      .then(list => list.filter(Boolean).sort());

    return cities.map(city => ({ _id: city, name: city, count: null }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // توافق واجهة المركز اليومي القديمة (facade /api/v1/beneficiary-core)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * لوحة مركز الحالات — توافق EpisodeCenterPage
   */
  async getDashboard(branchId) {
    return legacyBeneficiaryCore.getDashboard({ branchId });
  }

  /**
   * قائمة المستفيدين لمركز الحالات — توافق EpisodeCenterPage
   */
  async listEpisodeCenter(query = {}) {
    return legacyBeneficiaryCore.list(query);
  }

  /**
   * ملف المستفيد الشامل (360) لمركز الحالات — توافق EpisodeCenterPage
   */
  async getEpisodeCenterProfile(beneficiaryId) {
    return legacyBeneficiaryCore.get360Profile(beneficiaryId);
  }
}

module.exports = { BeneficiaryService };

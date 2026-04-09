/**
 * Beneficiary Service — خدمات المستفيد
 * @module domains/core/services/beneficiary.service
 */

const { BaseService } = require('../../_base/BaseService');
const logger = require('../../../utils/logger');

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
  }

  async beforeUpdate(_id, data, _existing, context) {
    if (context.userId) {
      data.lastModifiedBy = context.userId;
    }
  }

  async afterUpdate(entity, previous, _context) {
    // Track status changes
    if (entity.status !== previous.status) {
      logger.info(
        `[BeneficiaryService] Status changed: ${previous.status} → ${entity.status} for ${entity._id}`
      );
      this.emit('statusChanged', {
        beneficiaryId: entity._id,
        from: previous.status,
        to: entity.status,
      });
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
}

module.exports = { BeneficiaryService };

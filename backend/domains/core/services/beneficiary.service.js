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

    // W1568 — persistent PHI audit trail (durable, in addition to the in-process event).
    await this._writeAudit('data.created', {
      entityId: entity._id,
      userId: _context?.userId,
      message: `Beneficiary created (${entity.mrn || 'no-mrn'})`,
      custom: { mrn: entity.mrn || null },
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
      await this._writeAudit('data.updated', {
        entityId: entity._id,
        userId: context?.userId,
        message: `Beneficiary status changed: ${previous.status} → ${entity.status}`,
        changes: {
          before: { status: previous.status },
          after: { status: entity.status },
          fields: ['status'],
        },
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
        await this._writeAudit('data.updated', {
          entityId: entity._id,
          userId: context?.userId,
          message: 'Beneficiary profile updated',
          changes: { fields: updatedFields },
        });
      }
    }
  }

  // ─── Persistent PHI Audit ───────────────────────────────────────────

  /**
   * W1568 — write a durable audit record for a beneficiary PHI mutation.
   * Best-effort + never throws: an audit failure must not roll back the mutation.
   * Uses the canonical AuditLog model (models/auditLog.model.js).
   */
  async _writeAudit(eventType, { entityId, userId, message, changes, custom } = {}) {
    try {
      const mongoose = require('mongoose');
      let AuditLog = mongoose.models && mongoose.models.AuditLog;
      if (!AuditLog) {
        try {
          AuditLog = require('../../../models/auditLog.model').AuditLog;
        } catch {
          return;
        }
      }
      if (!AuditLog || typeof AuditLog.create !== 'function') return;
      await AuditLog.create({
        eventType,
        eventCategory: 'data',
        severity: 'info',
        status: 'success',
        userId: userId || undefined,
        resource: entityId ? `Beneficiary/${entityId}` : 'Beneficiary',
        message,
        changes: changes || undefined,
        metadata: {
          custom: {
            entityType: 'Beneficiary',
            entityId: entityId ? String(entityId) : null,
            ...(custom || {}),
          },
        },
      });
    } catch (err) {
      logger.warn(`[BeneficiaryService] audit write failed (${eventType}): ${err.message}`);
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
    await this._writeAudit('data.updated', {
      entityId: id,
      userId,
      message: 'Beneficiary archived',
      changes: { fields: ['isArchived'] },
      custom: { reason },
    });
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
    await this._writeAudit('data.updated', {
      entityId: id,
      userId,
      message: 'Beneficiary unarchived',
      changes: { fields: ['isArchived'] },
    });
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
    await this._writeAudit('data.updated', {
      entityId: beneficiaryId,
      userId: flag?.raisedBy,
      message: 'Risk flag added',
      custom: { flagType: flag?.type, severity: flag?.severity },
    });
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
    await this._writeAudit('data.updated', {
      entityId: beneficiaryId,
      userId,
      message: 'Risk flag resolved',
      custom: { flagId: String(flagId) },
    });
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
   * W1568 — soft-delete with a durable audit record. The route DELETE and
   * bulkAction 'delete' both route here.
   */
  async delete(id, context = {}) {
    const result = await super.delete(id, context);
    await this._writeAudit('data.deleted', {
      entityId: id,
      userId: context?.userId,
      message: 'Beneficiary deleted (soft)',
    });
    return result;
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

    // W1563 — validate every id is a real ObjectId (a bad id → CastError 500 mid-loop,
    // leaving a PARTIAL bulk mutation) and enforce per-id branch ownership. The URL
    // param-hook only guards :beneficiaryId and bodyScopedBeneficiaryGuard only checks
    // body.beneficiaryId — NEITHER covers body.ids[], so a branch-restricted caller could
    // archive/delete/re-status ANY branch's beneficiaries by id. Reject the whole batch.
    const mongoose = require('mongoose');
    const badIds = ids.filter(id => !mongoose.isValidObjectId(id));
    if (badIds.length) {
      const error = new Error(`معرّفات غير صالحة: ${badIds.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    if (context.branchScope) {
      const owned = await this.repository.model
        .find({ _id: { $in: ids } })
        .select('_id branchId')
        .lean();
      const foreign = owned.filter(
        d => d.branchId && String(d.branchId) !== String(context.branchScope)
      );
      if (foreign.length || owned.length !== ids.length) {
        const error = new Error('بعض المستفيدين خارج نطاق فرعك');
        error.statusCode = 403;
        throw error;
      }
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

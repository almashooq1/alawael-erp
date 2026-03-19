/**
 * Disability Card & Classification Service
 * خدمة بطاقة ذوي الإعاقة والتصنيف
 *
 * Business logic for:
 * - Card lifecycle management (issue, renew, suspend, revoke)
 * - Saudi classification standards
 * - MOHR integration (وزارة الموارد البشرية)
 * - Absher integration (أبشر)
 * - Social Security integration (الضمان الاجتماعي)
 * - Exemptions & facilitations management
 * - Auto-renewal processing
 */

const logger = require('../utils/logger');

// ── Lazy Model Loaders (avoid circular deps) ─────────────────────────────────
let DisabilityCard;
const getDisabilityCard = () => {
  if (!DisabilityCard) DisabilityCard = require('../models/DisabilityCard');
  return DisabilityCard;
};

let User;
const getUser = () => {
  if (!User) User = require('../models/User');
  return User;
};

class DisabilityCardService {
  // ═══════════════════════════════════════════════════════════════════════════
  //  CARD CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new disability card (إنشاء بطاقة إعاقة جديدة)
   */
  async createCard(data, userId) {
    const Card = getDisabilityCard();

    // Check duplicate national ID
    const existing = await Card.findOne({
      national_id: data.national_id,
      card_status: { $in: ['active', 'pending_review', 'renewal_pending'] },
    });
    if (existing) {
      throw new Error('يوجد بطاقة فعّالة أو قيد المراجعة لهذا الرقم الوطني');
    }

    const card = new Card({
      ...data,
      created_by: userId,
      audit_log: [
        {
          action: 'created',
          performed_by: userId,
          details: 'إنشاء بطاقة إعاقة جديدة',
          details_ar: 'تم إنشاء بطاقة إعاقة جديدة',
        },
      ],
    });

    await card.save();
    logger.info(`[DisabilityCard] Card created: ${card.card_number} for NID: ${data.national_id}`);
    return card;
  }

  /**
   * Get card by ID
   */
  async getCardById(cardId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId)
      .populate('beneficiary', 'name national_id')
      .populate('created_by', 'name email')
      .populate('updated_by', 'name email');

    if (!card) throw new Error('البطاقة غير موجودة');
    return card;
  }

  /**
   * Get card by national ID
   */
  async getCardByNationalId(nationalId) {
    const Card = getDisabilityCard();
    return Card.findOne({ national_id: nationalId, card_status: { $ne: 'revoked' } })
      .populate('beneficiary', 'name national_id')
      .sort({ createdAt: -1 });
  }

  /**
   * Get card by card number
   */
  async getCardByNumber(cardNumber) {
    const Card = getDisabilityCard();
    return Card.findOne({ card_number: cardNumber }).populate('beneficiary', 'name national_id');
  }

  /**
   * Update card (تحديث البطاقة)
   */
  async updateCard(cardId, data, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    const previousValues = card.toObject();

    // Apply updates
    Object.keys(data).forEach(key => {
      if (!['_id', 'audit_log', 'renewal_history', 'card_number'].includes(key)) {
        card[key] = data[key];
      }
    });

    card.updated_by = userId;
    card.audit_log.push({
      action: 'updated',
      performed_by: userId,
      details: 'تحديث بيانات البطاقة',
      details_ar: 'تم تحديث بيانات البطاقة',
      previous_values: { card_status: previousValues.card_status },
      new_values: { card_status: card.card_status },
    });

    await card.save();
    logger.info(`[DisabilityCard] Card updated: ${card.card_number}`);
    return card;
  }

  /**
   * Search & list cards with filters
   */
  async listCards(filters = {}) {
    const Card = getDisabilityCard();
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      search,
      status,
      disability_type,
      disability_degree,
      organization,
      branch,
      gender,
      auto_renewal,
      mohr_status,
    } = filters;

    const query = {};

    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { full_name_ar: { $regex: search, $options: 'i' } },
        { national_id: { $regex: search, $options: 'i' } },
        { card_number: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.card_status = status;
    if (disability_type) query['classification.disability_type'] = disability_type;
    if (disability_degree) query['classification.disability_degree'] = disability_degree;
    if (organization) query.organization = organization;
    if (branch) query.branch = branch;
    if (gender) query.gender = gender;
    if (auto_renewal !== undefined) query.auto_renewal_enabled = auto_renewal === 'true';
    if (mohr_status) query['mohr_integration.mohr_status'] = mohr_status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Card.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('beneficiary', 'name national_id')
        .populate('created_by', 'name email')
        .lean(),
      Card.countDocuments(query),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete card (soft — set to revoked)
   */
  async revokeCard(cardId, userId, reason) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    card.card_status = 'revoked';
    card.updated_by = userId;
    card.audit_log.push({
      action: 'revoked',
      performed_by: userId,
      details: `تم إلغاء البطاقة. السبب: ${reason || 'غير محدد'}`,
      details_ar: 'تم إلغاء البطاقة',
    });

    await card.save();
    logger.info(`[DisabilityCard] Card revoked: ${card.card_number}`);
    return card;
  }

  /**
   * Suspend card (إيقاف مؤقت)
   */
  async suspendCard(cardId, userId, reason) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    card.card_status = 'suspended';
    card.updated_by = userId;
    card.audit_log.push({
      action: 'suspended',
      performed_by: userId,
      details: `تم إيقاف البطاقة مؤقتاً. السبب: ${reason || 'غير محدد'}`,
      details_ar: 'تم إيقاف البطاقة مؤقتاً',
    });

    await card.save();
    logger.info(`[DisabilityCard] Card suspended: ${card.card_number}`);
    return card;
  }

  /**
   * Reactivate card (إعادة تفعيل)
   */
  async reactivateCard(cardId, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    if (!['suspended', 'expired'].includes(card.card_status)) {
      throw new Error('لا يمكن إعادة تفعيل بطاقة ليست موقوفة أو منتهية');
    }

    card.card_status = 'active';
    card.updated_by = userId;
    card.audit_log.push({
      action: 'reactivated',
      performed_by: userId,
      details: 'تم إعادة تفعيل البطاقة',
      details_ar: 'تم إعادة تفعيل البطاقة',
    });

    await card.save();
    logger.info(`[DisabilityCard] Card reactivated: ${card.card_number}`);
    return card;
  }

  /**
   * Approve pending card
   */
  async approveCard(cardId, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');
    if (card.card_status !== 'pending_review') {
      throw new Error('البطاقة ليست قيد المراجعة');
    }

    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + (card.card_validity_years || 5));

    card.card_status = 'active';
    card.issue_date = now;
    card.expiry_date = expiryDate;
    card.updated_by = userId;

    const renewDate = new Date(expiryDate);
    renewDate.setMonth(renewDate.getMonth() - 3);
    card.next_renewal_date = renewDate;

    card.audit_log.push({
      action: 'updated',
      performed_by: userId,
      details: 'تم اعتماد البطاقة وتفعيلها',
      details_ar: 'تم اعتماد البطاقة وتفعيلها',
      new_values: { card_status: 'active', issue_date: now, expiry_date: expiryDate },
    });

    await card.save();
    logger.info(`[DisabilityCard] Card approved: ${card.card_number}`);
    return card;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLASSIFICATION (تصنيف الإعاقة)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update classification (تحديث التصنيف)
   */
  async updateClassification(cardId, classificationData, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    const previousClassification = card.classification ? card.classification.toObject() : null;

    card.classification = classificationData;
    card.updated_by = userId;

    card.audit_log.push({
      action: 'classification_changed',
      performed_by: userId,
      details: `تغيير التصنيف: ${classificationData.disability_type} - ${classificationData.disability_degree}`,
      details_ar: 'تم تغيير التصنيف',
      previous_values: previousClassification,
      new_values: classificationData,
    });

    await card.save();
    logger.info(`[DisabilityCard] Classification updated for: ${card.card_number}`);
    return card;
  }

  /**
   * Get classification statistics
   */
  async getClassificationStats(filters = {}) {
    const Card = getDisabilityCard();
    return Card.getStatistics(filters);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENEWAL (تجديد البطاقات)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Manual renewal (تجديد يدوي)
   */
  async renewCard(cardId, renewalData, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    const previousExpiry = card.expiry_date;
    const newExpiry = new Date();
    newExpiry.setFullYear(
      newExpiry.getFullYear() + (renewalData.validity_years || card.card_validity_years || 5)
    );

    card.renewal_history.push({
      renewal_type: renewalData.requires_reassessment ? 'medical_reassessment' : 'manual',
      previous_expiry: previousExpiry,
      new_expiry: newExpiry,
      renewed_by: userId,
      renewal_reason: renewalData.reason || 'تجديد يدوي',
      medical_report_attached: renewalData.medical_report_attached || false,
      classification_changed: renewalData.classification_changed || false,
      previous_classification: renewalData.classification_changed
        ? {
            disability_type: card.classification?.disability_type,
            disability_degree: card.classification?.disability_degree,
          }
        : undefined,
      new_classification: renewalData.new_classification,
      approval_status: 'pending',
    });

    card.card_status = 'renewal_pending';
    card.updated_by = userId;

    card.audit_log.push({
      action: 'renewed',
      performed_by: userId,
      details: `طلب تجديد من ${previousExpiry?.toISOString()} إلى ${newExpiry.toISOString()}`,
      details_ar: 'تم تقديم طلب تجديد البطاقة',
    });

    await card.save();
    logger.info(`[DisabilityCard] Renewal requested for: ${card.card_number}`);
    return card;
  }

  /**
   * Approve renewal request (اعتماد طلب التجديد)
   */
  async approveRenewal(cardId, renewalId, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    const renewal = card.renewal_history.id(renewalId);
    if (!renewal) throw new Error('طلب التجديد غير موجود');

    renewal.approval_status = 'approved';
    renewal.approved_by = userId;
    renewal.approved_at = new Date();

    card.expiry_date = renewal.new_expiry;
    card.card_status = 'active';
    card.renewal_reminder_sent = false;

    const renewDate = new Date(renewal.new_expiry);
    renewDate.setMonth(renewDate.getMonth() - 3);
    card.next_renewal_date = renewDate;

    if (renewal.classification_changed && renewal.new_classification) {
      card.classification.disability_type = renewal.new_classification.disability_type;
      card.classification.disability_degree = renewal.new_classification.disability_degree;
    }

    card.updated_by = userId;
    await card.save();
    logger.info(`[DisabilityCard] Renewal approved for: ${card.card_number}`);
    return card;
  }

  /**
   * Process automatic renewals (batch) — Called by scheduler
   */
  async processAutoRenewals(systemUserId) {
    const Card = getDisabilityCard();
    const result = await Card.processAutoRenewals(systemUserId);
    logger.info(
      `[DisabilityCard] Auto-renewal processed: ${result.renewed} renewed, ${result.failed} failed`
    );
    return result;
  }

  /**
   * Get cards due for renewal
   */
  async getCardsDueForRenewal(daysAhead = 90) {
    const Card = getDisabilityCard();
    return Card.findDueForRenewal(daysAhead);
  }

  /**
   * Send renewal reminders (إرسال تنبيهات التجديد)
   */
  async sendRenewalReminders() {
    const Card = getDisabilityCard();
    const cards = await Card.find({
      card_status: 'active',
      auto_renewal_enabled: true,
      renewal_reminder_sent: false,
      next_renewal_date: { $lte: new Date() },
    });

    const results = { sent: 0, failed: 0 };

    for (const card of cards) {
      try {
        // In production, integrate with notification service
        card.renewal_reminder_sent = true;
        card.renewal_reminder_date = new Date();
        await card.save();
        results.sent++;
        logger.info(`[DisabilityCard] Renewal reminder sent for: ${card.card_number}`);
      } catch (err) {
        results.failed++;
        logger.error(`[DisabilityCard] Failed to send reminder for: ${card.card_number}`, err);
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  EXEMPTIONS (الإعفاءات والتسهيلات)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add exemption (إضافة إعفاء)
   */
  async addExemption(cardId, exemptionData, userId) {
    const card = await this.getCardById(cardId);
    return card.addExemption(exemptionData, userId);
  }

  /**
   * Update exemption (تحديث إعفاء)
   */
  async updateExemption(cardId, exemptionId, updateData, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    const exemption = card.exemptions.id(exemptionId);
    if (!exemption) throw new Error('الإعفاء غير موجود');

    Object.keys(updateData).forEach(key => {
      exemption[key] = updateData[key];
    });

    card.updated_by = userId;
    await card.save();
    logger.info(`[DisabilityCard] Exemption updated on card: ${card.card_number}`);
    return card;
  }

  /**
   * Remove exemption (إلغاء إعفاء)
   */
  async removeExemption(cardId, exemptionId, userId, reason) {
    const card = await this.getCardById(cardId);
    return card.removeExemption(exemptionId, userId, reason);
  }

  /**
   * Get all exemptions for a card
   */
  async getExemptions(cardId) {
    const card = await this.getCardById(cardId);
    return {
      all: card.exemptions,
      active: card.active_exemptions,
      total_count: card.exemptions.length,
      active_count: card.active_exemptions.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MOHR INTEGRATION (ربط وزارة الموارد البشرية)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register with MOHR (تسجيل في وزارة الموارد البشرية)
   */
  async registerWithMOHR(cardId, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    try {
      // Simulate MOHR API call
      const mohrResponse = await this._callMOHRApi('register', {
        national_id: card.national_id,
        full_name: card.full_name,
        full_name_ar: card.full_name_ar,
        date_of_birth: card.date_of_birth,
        gender: card.gender,
        disability_type: card.classification?.disability_type,
        disability_degree: card.classification?.disability_degree,
        medical_report: card.documents?.find(d => d.type === 'medical_report')?.url,
      });

      card.mohr_integration = {
        ...card.mohr_integration?.toObject(),
        national_card_number: mohrResponse.card_number,
        mohr_registration_id: mohrResponse.registration_id,
        mohr_status: 'pending_verification',
        mohr_registration_date: new Date(),
        mohr_last_sync: new Date(),
        mohr_response_data: mohrResponse,
      };

      card.audit_log.push({
        action: 'synced_mohr',
        performed_by: userId,
        details: `تسجيل في نظام بطاقة الإعاقة الوطنية — رقم التسجيل: ${mohrResponse.registration_id}`,
        details_ar: 'تم التسجيل في نظام وزارة الموارد البشرية',
      });

      await card.save();
      logger.info(`[DisabilityCard] MOHR registration for: ${card.card_number}`);
      return { success: true, card, mohr_data: mohrResponse };
    } catch (err) {
      logger.error(`[DisabilityCard] MOHR registration failed for: ${card.card_number}`, err);
      throw new Error(`فشل التسجيل في وزارة الموارد البشرية: ${err.message}`);
    }
  }

  /**
   * Verify MOHR status (التحقق من حالة وزارة الموارد البشرية)
   */
  async verifyMOHRStatus(cardId, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    if (!card.mohr_integration?.mohr_registration_id) {
      throw new Error('البطاقة غير مسجلة في وزارة الموارد البشرية');
    }

    try {
      const verifyResponse = await this._callMOHRApi('verify', {
        registration_id: card.mohr_integration.mohr_registration_id,
        national_id: card.national_id,
      });

      card.mohr_integration.mohr_status = verifyResponse.verified ? 'verified' : 'rejected';
      card.mohr_integration.mohr_last_sync = new Date();
      card.mohr_integration.mohr_verification_code = verifyResponse.verification_code;
      card.mohr_integration.mohr_card_serial = verifyResponse.card_serial;
      card.mohr_integration.mohr_disability_code = verifyResponse.disability_code;
      card.mohr_integration.mohr_response_data = verifyResponse;

      card.audit_log.push({
        action: 'synced_mohr',
        performed_by: userId,
        details: `التحقق من حالة الوزارة: ${verifyResponse.verified ? 'تم التحقق' : 'مرفوض'}`,
        details_ar: 'تم التحقق من حالة التسجيل',
      });

      await card.save();
      return { success: true, verified: verifyResponse.verified, card };
    } catch (err) {
      logger.error(`[DisabilityCard] MOHR verify failed for: ${card.card_number}`, err);
      throw new Error(`فشل التحقق: ${err.message}`);
    }
  }

  /**
   * Sync with MOHR (مزامنة بيانات وزارة الموارد البشرية)
   */
  async syncWithMOHR(cardId, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    try {
      const syncResponse = await this._callMOHRApi('sync', {
        national_id: card.national_id,
        registration_id: card.mohr_integration?.mohr_registration_id,
      });

      card.mohr_integration.mohr_last_sync = new Date();
      card.mohr_integration.mohr_status = syncResponse.status || card.mohr_integration.mohr_status;
      card.mohr_integration.mohr_response_data = syncResponse;

      card.audit_log.push({
        action: 'synced_mohr',
        performed_by: userId,
        details: 'مزامنة بيانات وزارة الموارد البشرية',
        details_ar: 'تم مزامنة البيانات',
      });

      await card.save();
      return { success: true, card, sync_data: syncResponse };
    } catch (err) {
      logger.error(`[DisabilityCard] MOHR sync failed for: ${card.card_number}`, err);
      throw new Error(`فشل المزامنة: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ABSHER INTEGRATION (ربط منصة أبشر)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Link with Absher (ربط مع أبشر)
   */
  async linkWithAbsher(cardId, absherData, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    try {
      const absherResponse = await this._callAbsherApi('link', {
        national_id: card.national_id,
        absher_id: absherData.absher_id,
        disability_card_number: card.card_number,
      });

      card.absher_integration = {
        absher_id: absherData.absher_id,
        absher_verified: absherResponse.verified,
        absher_verification_date: absherResponse.verified ? new Date() : undefined,
        absher_last_sync: new Date(),
        absher_services_linked: absherResponse.available_services || [],
        absher_response_data: absherResponse,
      };

      card.audit_log.push({
        action: 'synced_absher',
        performed_by: userId,
        details: `ربط مع أبشر — الحالة: ${absherResponse.verified ? 'تم التحقق' : 'قيد المراجعة'}`,
        details_ar: 'تم الربط مع منصة أبشر',
      });

      await card.save();
      logger.info(`[DisabilityCard] Absher linked for: ${card.card_number}`);
      return { success: true, card, absher_data: absherResponse };
    } catch (err) {
      logger.error(`[DisabilityCard] Absher link failed for: ${card.card_number}`, err);
      throw new Error(`فشل الربط مع أبشر: ${err.message}`);
    }
  }

  /**
   * Verify Absher status (التحقق من أبشر)
   */
  async verifyAbsherStatus(cardId, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    if (!card.absher_integration?.absher_id) {
      throw new Error('البطاقة غير مربوطة بمنصة أبشر');
    }

    try {
      const verifyResponse = await this._callAbsherApi('verify', {
        absher_id: card.absher_integration.absher_id,
        national_id: card.national_id,
      });

      card.absher_integration.absher_verified = verifyResponse.verified;
      card.absher_integration.absher_verification_date = verifyResponse.verified
        ? new Date()
        : card.absher_integration.absher_verification_date;
      card.absher_integration.absher_last_sync = new Date();
      card.absher_integration.absher_response_data = verifyResponse;

      await card.save();
      return { success: true, verified: verifyResponse.verified, card };
    } catch (err) {
      logger.error(`[DisabilityCard] Absher verify failed: ${card.card_number}`, err);
      throw new Error(`فشل التحقق من أبشر: ${err.message}`);
    }
  }

  /**
   * Sync Absher services (مزامنة خدمات أبشر)
   */
  async syncAbsherServices(cardId, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    try {
      const syncResponse = await this._callAbsherApi('sync-services', {
        absher_id: card.absher_integration?.absher_id,
        national_id: card.national_id,
      });

      card.absher_integration.absher_services_linked = syncResponse.services || [];
      card.absher_integration.absher_last_sync = new Date();

      card.audit_log.push({
        action: 'synced_absher',
        performed_by: userId,
        details: `مزامنة خدمات أبشر: ${(syncResponse.services || []).length} خدمة`,
        details_ar: 'تم مزامنة خدمات أبشر',
      });

      await card.save();
      return { success: true, card, services: syncResponse.services };
    } catch (err) {
      logger.error(`[DisabilityCard] Absher sync failed: ${card.card_number}`, err);
      throw new Error(`فشل مزامنة خدمات أبشر: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SOCIAL SECURITY (الضمان الاجتماعي)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register with Social Security (تسجيل في الضمان الاجتماعي)
   */
  async registerSocialSecurity(cardId, ssData, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    try {
      const ssResponse = await this._callSocialSecurityApi('register', {
        national_id: card.national_id,
        disability_type: card.classification?.disability_type,
        disability_degree: card.classification?.disability_degree,
        mohr_card_number: card.mohr_integration?.national_card_number,
        ...ssData,
      });

      card.social_security = {
        social_security_number: ssResponse.ss_number,
        ss_registration_status: 'pending',
        ss_monthly_benefit: ssResponse.estimated_benefit || 0,
        ss_benefit_currency: 'SAR',
        ss_category: ssResponse.category,
        ss_last_sync: new Date(),
        ss_response_data: ssResponse,
      };

      card.audit_log.push({
        action: 'synced_social_security',
        performed_by: userId,
        details: `تسجيل في الضمان الاجتماعي — رقم: ${ssResponse.ss_number}`,
        details_ar: 'تم التسجيل في الضمان الاجتماعي',
      });

      await card.save();
      logger.info(`[DisabilityCard] Social Security registered for: ${card.card_number}`);
      return { success: true, card, ss_data: ssResponse };
    } catch (err) {
      logger.error(`[DisabilityCard] SS registration failed: ${card.card_number}`, err);
      throw new Error(`فشل التسجيل في الضمان الاجتماعي: ${err.message}`);
    }
  }

  /**
   * Sync social security data (مزامنة بيانات الضمان)
   */
  async syncSocialSecurity(cardId, userId) {
    const Card = getDisabilityCard();
    const card = await Card.findById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');

    try {
      const syncResponse = await this._callSocialSecurityApi('sync', {
        ss_number: card.social_security?.social_security_number,
        national_id: card.national_id,
      });

      card.social_security.ss_registration_status =
        syncResponse.status || card.social_security.ss_registration_status;
      card.social_security.ss_monthly_benefit =
        syncResponse.monthly_benefit || card.social_security.ss_monthly_benefit;
      card.social_security.ss_last_payment_date = syncResponse.last_payment_date;
      card.social_security.ss_total_received =
        syncResponse.total_received || card.social_security.ss_total_received;
      card.social_security.ss_last_sync = new Date();
      card.social_security.ss_response_data = syncResponse;

      card.audit_log.push({
        action: 'synced_social_security',
        performed_by: userId,
        details: 'مزامنة بيانات الضمان الاجتماعي',
        details_ar: 'تم مزامنة بيانات الضمان الاجتماعي',
      });

      await card.save();
      return { success: true, card, sync_data: syncResponse };
    } catch (err) {
      logger.error(`[DisabilityCard] SS sync failed: ${card.card_number}`, err);
      throw new Error(`فشل مزامنة الضمان الاجتماعي: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  STATISTICS & DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get dashboard statistics (لوحة المعلومات)
   */
  async getDashboard(filters = {}) {
    const Card = getDisabilityCard();
    const stats = await Card.getStatistics(filters);

    // Get renewal info
    const dueForRenewal = await Card.findDueForRenewal(90);
    const pendingCards = await Card.countDocuments({ card_status: 'pending_review' });

    return {
      ...stats,
      due_for_renewal: dueForRenewal.length,
      pending_approval: pendingCards,
    };
  }

  /**
   * Get audit log for a card
   */
  async getAuditLog(cardId) {
    const card = await this.getCardById(cardId);
    return card.audit_log.sort((a, b) => b.performed_at - a.performed_at);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PRIVATE — External API Simulators
  //  In production, replace with actual REST/SOAP calls
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * MOHR API simulation (وزارة الموارد البشرية)
   */
  async _callMOHRApi(action, data) {
    logger.info(`[MOHR API] ${action} called with NID: ${data.national_id}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    switch (action) {
      case 'register':
        return {
          success: true,
          registration_id: `MOHR-${Date.now()}`,
          card_number: `NDC-${data.national_id?.slice(-6) || '000000'}`,
          status: 'pending_verification',
          message: 'تم التسجيل بنجاح في نظام بطاقة الإعاقة الوطنية',
        };
      case 'verify':
        return {
          success: true,
          verified: true,
          verification_code: `VC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          card_serial: `CS-${Date.now()}`,
          disability_code: `DC-${data.national_id?.slice(-4) || '0000'}`,
          message: 'تم التحقق بنجاح',
        };
      case 'sync':
        return {
          success: true,
          status: 'verified',
          last_update: new Date().toISOString(),
          disability_classification: data.disability_type,
          services_eligible: [
            'transportation_exemption',
            'parking_permit',
            'customs_exemption',
            'healthcare_priority',
          ],
        };
      default:
        throw new Error(`Unknown MOHR API action: ${action}`);
    }
  }

  /**
   * Absher API simulation (أبشر)
   */
  async _callAbsherApi(action, data) {
    logger.info(`[Absher API] ${action} called with NID: ${data.national_id}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    switch (action) {
      case 'link':
        return {
          success: true,
          verified: true,
          absher_id: data.absher_id,
          available_services: [
            {
              service_name: 'Traffic Services',
              service_name_ar: 'خدمات المرور',
              service_code: 'TRAF-001',
              linked_date: new Date(),
              status: 'active',
            },
            {
              service_name: 'Passport Services',
              service_name_ar: 'خدمات الجوازات',
              service_code: 'PASS-001',
              linked_date: new Date(),
              status: 'active',
            },
            {
              service_name: 'Civil Affairs',
              service_name_ar: 'الأحوال المدنية',
              service_code: 'CIVIL-001',
              linked_date: new Date(),
              status: 'active',
            },
          ],
          message: 'تم الربط مع أبشر بنجاح',
        };
      case 'verify':
        return {
          success: true,
          verified: true,
          last_verification: new Date().toISOString(),
        };
      case 'sync-services':
        return {
          success: true,
          services: [
            {
              service_name: 'Traffic Services',
              service_name_ar: 'خدمات المرور',
              service_code: 'TRAF-001',
              linked_date: new Date(),
              status: 'active',
            },
            {
              service_name: 'Passport Services',
              service_name_ar: 'خدمات الجوازات',
              service_code: 'PASS-001',
              linked_date: new Date(),
              status: 'active',
            },
            {
              service_name: 'Civil Affairs',
              service_name_ar: 'الأحوال المدنية',
              service_code: 'CIVIL-001',
              linked_date: new Date(),
              status: 'active',
            },
            {
              service_name: 'Labor Services',
              service_name_ar: 'خدمات العمل',
              service_code: 'LAB-001',
              linked_date: new Date(),
              status: 'active',
            },
          ],
        };
      default:
        throw new Error(`Unknown Absher API action: ${action}`);
    }
  }

  /**
   * Social Security API simulation (الضمان الاجتماعي)
   */
  async _callSocialSecurityApi(action, data) {
    logger.info(`[Social Security API] ${action} called for NID: ${data.national_id}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    switch (action) {
      case 'register':
        return {
          success: true,
          ss_number: `SS-${data.national_id?.slice(-6) || '000000'}`,
          category: this._determineSsCategory(data.disability_degree),
          estimated_benefit: this._estimateMonthlyBenefit(data.disability_degree),
          message: 'تم التسجيل في الضمان الاجتماعي',
        };
      case 'sync':
        return {
          success: true,
          status: 'registered',
          monthly_benefit: 3000,
          last_payment_date: new Date(),
          total_received: 36000,
          next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };
      default:
        throw new Error(`Unknown Social Security API action: ${action}`);
    }
  }

  /**
   * Determine social security category based on disability degree
   */
  _determineSsCategory(degree) {
    const categoryMap = {
      mild: 'category_c',
      moderate: 'category_b',
      severe: 'category_a',
      profound: 'special',
    };
    return categoryMap[degree] || 'category_c';
  }

  /**
   * Estimate monthly benefit based on disability degree
   */
  _estimateMonthlyBenefit(degree) {
    const benefitMap = {
      mild: 1500,
      moderate: 2500,
      severe: 3500,
      profound: 5000,
    };
    return benefitMap[degree] || 1500;
  }
}

module.exports = new DisabilityCardService();

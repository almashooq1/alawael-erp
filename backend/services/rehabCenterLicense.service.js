/**
 * Rehab Center License Service - خدمة إدارة تراخيص مراكز ذوي الإعاقة
 * شامل: CRUD + تنبيهات + تجديد + إحصائيات + تقارير + تدقيق
 */

const RehabCenterLicense = require('../models/RehabCenterLicense');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');
const { escapeRegex } = require('../utils/sanitize');

class RehabCenterLicenseService {
  // ==================== CRUD ====================

  /** إنشاء ترخيص جديد */
  async create(data, userId) {
    try {
      const license = new RehabCenterLicense({
        ...data,
        createdBy: userId,
      });

      license.addAuditEntry('created', userId, 'تم إنشاء ترخيص جديد');
      await license.save();

      // إنشاء تنبيهات تلقائية
      await this.generateAlerts(license);

      logger.info(`[RehabLicense] Created: ${license.licenseNumber} (${license.licenseType})`);
      return license;
    } catch (error) {
      logger.error('[RehabLicense] Create error:', error);
      throw error;
    }
  }

  /** الحصول على ترخيص بالمعرف */
  async getById(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name')
      .lean();
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license;
  }

  /** البحث والفلترة مع صفحات */
  async search(filters = {}, options = {}) {
    const {
      search,
      status,
      category,
      licenseType,
      priority,
      expiringWithinDays,
      issuingAuthority,
      city,
      assignedTo,
      tags,
    } = filters;

    const { page = 1, limit = 20, sortBy = 'dates.expiry', sortOrder = 'asc' } = options;

    const query = { isActive: true, isDeleted: false };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { licenseNumber: { $regex: escaped, $options: 'i' } },
        { 'center.name': { $regex: escaped, $options: 'i' } },
        { 'issuingAuthority.name': { $regex: escaped, $options: 'i' } },
        { referenceNumber: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (category) query.category = category;
    if (licenseType) query.licenseType = licenseType;
    if (priority) query.priority = priority;
    if (issuingAuthority)
      query['issuingAuthority.name'] = { $regex: escapeRegex(issuingAuthority), $options: 'i' };
    if (city) query['center.city'] = { $regex: escapeRegex(city), $options: 'i' };
    if (assignedTo) query.assignedTo = assignedTo;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };

    if (expiringWithinDays) {
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + parseInt(expiringWithinDays));
      query['dates.expiry'] = { $gte: now, $lte: future };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [data, total] = await Promise.all([
      RehabCenterLicense.find(query)
        .populate('assignedTo', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RehabCenterLicense.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /** تحديث ترخيص */
  async update(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const oldData = license.toObject();
    Object.assign(license, data);
    license.updatedBy = userId;
    license.addAuditEntry('updated', userId, 'تم تحديث بيانات الترخيص', {
      before: oldData,
      after: data,
    });

    await license.save();
    logger.info(`[RehabLicense] Updated: ${license.licenseNumber}`);
    return license;
  }

  /** حذف (soft delete) */
  async delete(id, userId, reason) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.isDeleted = true;
    license.isActive = false;
    license.deletedAt = new Date();
    license.deletedBy = userId;
    license.addAuditEntry('deleted', userId, `تم حذف الترخيص - السبب: ${reason || 'غير محدد'}`);
    await license.save();

    logger.info(`[RehabLicense] Deleted: ${license.licenseNumber}`);
    return { message: 'تم حذف الترخيص بنجاح' };
  }

  // ==================== التجديد ====================

  /** تجديد ترخيص */
  async renew(id, renewalData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    if (!renewalData.newExpiryDate) {
      throw new AppError('تاريخ الانتهاء الجديد مطلوب', 400);
    }

    license.renew(new Date(renewalData.newExpiryDate), {
      ...renewalData,
      userId,
    });

    license.addAuditEntry('renewed', userId, `تم تجديد الترخيص حتى ${renewalData.newExpiryDate}`);
    await license.save();

    // تحديث التنبيهات
    await this.generateAlerts(license);

    logger.info(`[RehabLicense] Renewed: ${license.licenseNumber}`);
    return license;
  }

  /** الحصول على سجل التجديدات */
  async getRenewalHistory(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false })
      .select('licenseNumber licenseType renewalHistory')
      .populate('renewalHistory.processedBy', 'name')
      .lean();
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.renewalHistory || [];
  }

  // ==================== التنبيهات ====================

  /** إنشاء تنبيهات تلقائية لترخيص */
  async generateAlerts(license) {
    if (!license.dates?.expiry) return;

    const days = license.daysUntilExpiry;
    if (days === null) return;

    const alertDays = license.renewalSettings?.alertBeforeDays || [90, 60, 30, 15, 7, 3, 1];
    const matchingAlert = alertDays.find(d => days <= d);

    if (matchingAlert !== undefined) {
      let type, priority, title;
      if (days < 0) {
        type = 'expired';
        priority = 'critical';
        title = `⚠️ الترخيص منتهي: ${license.licenseNumber}`;
      } else if (days <= 3) {
        type = 'expiry_3_days';
        priority = 'critical';
        title = `🔴 ينتهي خلال ${days} أيام: ${license.licenseNumber}`;
      } else if (days <= 7) {
        type = 'expiry_7_days';
        priority = 'high';
        title = `🟠 ينتهي خلال أسبوع: ${license.licenseNumber}`;
      } else if (days <= 15) {
        type = 'expiry_15_days';
        priority = 'high';
        title = `🟡 ينتهي خلال 15 يوم: ${license.licenseNumber}`;
      } else if (days <= 30) {
        type = 'expiry_30_days';
        priority = 'medium';
        title = `ينتهي خلال شهر: ${license.licenseNumber}`;
      } else if (days <= 60) {
        type = 'expiry_60_days';
        priority = 'medium';
        title = `ينتهي خلال شهرين: ${license.licenseNumber}`;
      } else {
        type = 'expiry_90_days';
        priority = 'low';
        title = `ينتهي خلال 3 أشهر: ${license.licenseNumber}`;
      }

      // تجنب التكرار
      const existing = license.alerts.find(a => a.type === type && !a.isDismissed);
      if (!existing) {
        license.alerts.push({
          type,
          title,
          message: `الترخيص رقم ${license.licenseNumber} (${license.licenseTypeLabel || license.licenseType}) - ${license.center?.name || ''} - متبقي ${days} يوم`,
          priority,
          sentVia: ['system'],
        });
        await license.save();
      }
    }
  }

  /** تشغيل فحص التنبيهات لجميع التراخيص */
  async runAlertScan() {
    const licenses = await RehabCenterLicense.find({
      isActive: true,
      isDeleted: false,
      status: { $nin: ['revoked', 'suspended'] },
    });

    let alertCount = 0;
    for (const license of licenses) {
      const beforeCount = license.alerts.length;
      await this.generateAlerts(license);
      if (license.alerts.length > beforeCount) alertCount++;
    }

    // تحديث الحالات المنتهية
    await RehabCenterLicense.updateMany(
      {
        'dates.expiry': { $lt: new Date() },
        status: { $nin: ['expired', 'revoked', 'suspended'] },
        isActive: true,
        isDeleted: false,
      },
      { $set: { status: 'expired' } }
    );

    logger.info(
      `[RehabLicense] Alert scan: ${alertCount} new alerts for ${licenses.length} licenses`
    );
    return { scanned: licenses.length, newAlerts: alertCount };
  }

  /** الحصول على التنبيهات النشطة */
  async getActiveAlerts(filters = {}) {
    const query = { isActive: true, isDeleted: false };

    if (filters.priority) {
      query['alerts.priority'] = filters.priority;
    }

    const licenses = await RehabCenterLicense.find({
      ...query,
      'alerts.0': { $exists: true },
    })
      .select('licenseNumber licenseType category center.name dates status alerts priority')
      .sort({ 'dates.expiry': 1 })
      .lean();

    const allAlerts = [];
    for (const lic of licenses) {
      for (const alert of lic.alerts) {
        if (!alert.isDismissed) {
          allAlerts.push({
            ...alert,
            licenseId: lic._id,
            licenseNumber: lic.licenseNumber,
            licenseType: lic.licenseType,
            centerName: lic.center?.name,
            expiryDate: lic.dates?.expiry,
            licenseStatus: lic.status,
          });
        }
      }
    }

    // ترتيب حسب الأولوية
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allAlerts.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    return allAlerts;
  }

  /** تجاهل تنبيه */
  async dismissAlert(licenseId, alertId, _userId) {
    const license = await RehabCenterLicense.findOne({ _id: licenseId, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const alert = license.alerts.id(alertId);
    if (!alert) throw new AppError('التنبيه غير موجود', 404);

    alert.isDismissed = true;
    alert.readAt = new Date();
    await license.save();

    return { message: 'تم تجاهل التنبيه' };
  }

  /** تعليم تنبيه كمقروء */
  async markAlertRead(licenseId, alertId) {
    const license = await RehabCenterLicense.findOne({ _id: licenseId, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const alert = license.alerts.id(alertId);
    if (!alert) throw new AppError('التنبيه غير موجود', 404);

    alert.isRead = true;
    alert.readAt = new Date();
    await license.save();
    return { message: 'تم تعليم التنبيه كمقروء' };
  }

  // ==================== الإحصائيات ====================

  /** إحصائيات شاملة */
  async getStatistics() {
    return await RehabCenterLicense.getStatistics();
  }

  /** إحصائيات لوحة المعلومات */
  async getDashboard() {
    const stats = await this.getStatistics();
    const alerts = await this.getActiveAlerts();
    const criticalAlerts = alerts.filter(a => a.priority === 'critical');
    const highAlerts = alerts.filter(a => a.priority === 'high');

    const upcomingExpirations = await RehabCenterLicense.find({
      isActive: true,
      isDeleted: false,
      'dates.expiry': {
        $gte: new Date(),
        $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    })
      .select('licenseNumber licenseType category center.name dates status priority')
      .sort({ 'dates.expiry': 1 })
      .limit(20)
      .lean();

    const recentRenewals = await RehabCenterLicense.find({
      isActive: true,
      isDeleted: false,
      'dates.lastRenewal': { $exists: true },
    })
      .select('licenseNumber licenseType center.name dates.lastRenewal')
      .sort({ 'dates.lastRenewal': -1 })
      .limit(10)
      .lean();

    return {
      statistics: stats,
      alertsSummary: {
        total: alerts.length,
        critical: criticalAlerts.length,
        high: highAlerts.length,
      },
      criticalAlerts: criticalAlerts.slice(0, 10),
      upcomingExpirations,
      recentRenewals,
    };
  }

  /** التقرير الشهري */
  async getMonthlyReport(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [expiredInMonth, renewedInMonth, createdInMonth] = await Promise.all([
      RehabCenterLicense.countDocuments({
        isActive: true,
        isDeleted: false,
        'dates.expiry': { $gte: startDate, $lte: endDate },
      }),
      RehabCenterLicense.countDocuments({
        isActive: true,
        isDeleted: false,
        'dates.lastRenewal': { $gte: startDate, $lte: endDate },
      }),
      RehabCenterLicense.countDocuments({
        isDeleted: false,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      expired: expiredInMonth,
      renewed: renewedInMonth,
      created: createdInMonth,
    };
  }

  /** تقرير التكاليف */
  async getCostReport(filters = {}) {
    const query = { isActive: true, isDeleted: false };
    if (filters.category) query.category = filters.category;
    if (filters.year) {
      const start = new Date(filters.year, 0, 1);
      const end = new Date(filters.year, 11, 31, 23, 59, 59);
      query.createdAt = { $gte: start, $lte: end };
    }

    const result = await RehabCenterLicense.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalIssueFees: { $sum: '$costs.issueFee' },
          totalRenewalFees: { $sum: '$costs.renewalFee' },
          totalAnnualFees: { $sum: '$costs.annualFee' },
          totalPaid: { $sum: '$costs.totalPaid' },
        },
      },
      { $sort: { totalPaid: -1 } },
    ]);

    const grand = result.reduce(
      (acc, r) => ({
        totalIssueFees: acc.totalIssueFees + r.totalIssueFees,
        totalRenewalFees: acc.totalRenewalFees + r.totalRenewalFees,
        totalAnnualFees: acc.totalAnnualFees + r.totalAnnualFees,
        totalPaid: acc.totalPaid + r.totalPaid,
      }),
      { totalIssueFees: 0, totalRenewalFees: 0, totalAnnualFees: 0, totalPaid: 0 }
    );

    return { byCategory: result, grandTotal: grand };
  }

  // ==================== إضافة ملاحظة ====================

  async addNote(id, content, category, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.notes.push({ content, category: category || 'general', createdBy: userId });
    license.addAuditEntry('note_added', userId, 'تم إضافة ملاحظة');
    await license.save();

    return license.notes[license.notes.length - 1];
  }

  // ==================== رفع مستند ====================

  async addAttachment(id, fileData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.attachments.push({
      ...fileData,
      uploadedBy: userId,
      uploadedAt: new Date(),
    });
    license.addAuditEntry('document_uploaded', userId, `تم رفع مستند: ${fileData.name}`);
    await license.save();

    return license.attachments[license.attachments.length - 1];
  }

  // ==================== العمليات المجمعة ====================

  /** التجديد المجمع */
  async bulkRenew(licenseIds, renewalData, userId) {
    const results = [];
    for (const id of licenseIds) {
      try {
        const license = await this.renew(id, renewalData, userId);
        results.push({ id, success: true, licenseNumber: license.licenseNumber });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return results;
  }

  /** تحديث حالة مجمع */
  async bulkUpdateStatus(licenseIds, newStatus, userId) {
    const results = [];
    for (const id of licenseIds) {
      try {
        const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
        if (!license) {
          results.push({ id, success: false, error: 'غير موجود' });
          continue;
        }
        license.status = newStatus;
        license.addAuditEntry('updated', userId, `تم تغيير الحالة إلى ${newStatus}`);
        await license.save();
        results.push({ id, success: true, licenseNumber: license.licenseNumber });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return results;
  }

  // ==================== الامتثال ====================

  /** تسجيل نتيجة تفتيش */
  async recordInspection(id, inspectionData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.compliance.lastInspectionDate = new Date();
    license.compliance.inspectionResult = inspectionData.result;
    license.compliance.inspectorName = inspectionData.inspectorName;
    license.compliance.inspectorNotes = inspectionData.notes;

    if (inspectionData.nextInspectionDate) {
      license.compliance.nextInspectionDate = new Date(inspectionData.nextInspectionDate);
    }

    if (inspectionData.result === 'failed') {
      license.compliance.status = 'non_compliant';
    } else if (inspectionData.result === 'conditional') {
      license.compliance.status = 'partially_compliant';
    } else if (inspectionData.result === 'passed') {
      license.compliance.status = 'compliant';
    }

    license.addAuditEntry('compliance_check', userId, `نتيجة التفتيش: ${inspectionData.result}`);
    await license.save();

    return license.compliance;
  }

  /** تسجيل مخالفة */
  async recordViolation(id, violationData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.compliance.violations.push({
      ...violationData,
      date: new Date(),
      status: 'open',
    });

    if (violationData.severity === 'critical') {
      license.compliance.status = 'non_compliant';
    }

    license.addAuditEntry('updated', userId, `تم تسجيل مخالفة: ${violationData.description}`);
    await license.save();

    return license.compliance.violations[license.compliance.violations.length - 1];
  }

  // ==================== التصدير ====================

  /** تصدير البيانات كـ JSON */
  async exportData(filters = {}) {
    const { data } = await this.search(filters, { limit: 10000 });
    return data;
  }

  // ==================== التفويضات ====================

  /** إضافة/تحديث تفويض */
  async setDelegation(id, delegationData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.delegation = { ...delegationData, hasDelegation: true, isActive: true };
    license.addAuditEntry('updated', userId, `تم إضافة تفويض لـ ${delegationData.delegateName}`);
    await license.save();

    logger.info(`[RehabLicense] Delegation set for ${license.licenseNumber}`);
    return license.delegation;
  }

  /** إلغاء تفويض */
  async revokeDelegation(id, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.delegation.isActive = false;
    license.addAuditEntry('updated', userId, 'تم إلغاء التفويض');
    await license.save();

    return { message: 'تم إلغاء التفويض بنجاح' };
  }

  /** الحصول على التفويضات النشطة */
  async getActiveDelegations() {
    const licenses = await RehabCenterLicense.find({
      isActive: true,
      isDeleted: false,
      'delegation.hasDelegation': true,
      'delegation.isActive': true,
    })
      .select('licenseNumber licenseType center.name delegation')
      .lean();
    return licenses;
  }

  // ==================== التراخيص المرتبطة ====================

  /** ربط ترخيصين */
  async linkLicenses(id, targetId, relationship, description, userId) {
    const [license, target] = await Promise.all([
      RehabCenterLicense.findOne({ _id: id, isDeleted: false }),
      RehabCenterLicense.findOne({ _id: targetId, isDeleted: false }),
    ]);
    if (!license || !target) throw new AppError('أحد التراخيص غير موجود', 404);

    // إضافة الرابط في الاتجاهين
    const reverseMap = {
      prerequisite: 'dependent',
      dependent: 'prerequisite',
      replaces: 'replaced_by',
      replaced_by: 'replaces',
      companion: 'companion',
      amendment: 'amendment',
    };
    license.linkedLicenses.push({ licenseId: targetId, relationship, description });
    target.linkedLicenses.push({
      licenseId: id,
      relationship: reverseMap[relationship] || relationship,
      description,
    });

    license.addAuditEntry('updated', userId, `تم ربط الترخيص مع ${target.licenseNumber}`);
    target.addAuditEntry('updated', userId, `تم ربط الترخيص مع ${license.licenseNumber}`);

    await Promise.all([license.save(), target.save()]);

    return { message: 'تم ربط التراخيص بنجاح' };
  }

  /** الحصول على التراخيص المرتبطة */
  async getLinkedLicenses(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false })
      .populate(
        'linkedLicenses.licenseId',
        'licenseNumber licenseType category center.name status dates.expiry'
      )
      .lean();
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.linkedLicenses || [];
  }

  // ==================== المتطلبات ====================

  /** إضافة متطلب */
  async addRequirement(id, requirementData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.requirementsChecklist.push(requirementData);
    license.addAuditEntry('updated', userId, `تم إضافة متطلب: ${requirementData.requirement}`);
    await license.save();

    return license.requirementsChecklist[license.requirementsChecklist.length - 1];
  }

  /** تحديث حالة متطلب */
  async updateRequirement(id, requirementId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const req = license.requirementsChecklist.id(requirementId);
    if (!req) throw new AppError('المتطلب غير موجود', 404);

    Object.assign(req, data);
    if (data.isCompleted && !req.completedDate) {
      req.completedDate = new Date();
      req.completedBy = userId;
    }
    await license.save();

    return req;
  }

  /** الحصول على حالة المتطلبات */
  async getRequirementsStatus(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    return {
      summary: license.checkRequirementsComplete(),
      checklist: license.requirementsChecklist,
    };
  }

  // ==================== الشروط ====================

  /** إضافة شرط */
  async addCondition(id, conditionData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.conditions.push(conditionData);
    license.addAuditEntry('updated', userId, `تم إضافة شرط: ${conditionData.condition}`);
    await license.save();

    return license.conditions[license.conditions.length - 1];
  }

  /** تحديث حالة شرط */
  async updateCondition(id, conditionId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const cond = license.conditions.id(conditionId);
    if (!cond) throw new AppError('الشرط غير موجود', 404);

    Object.assign(cond, data);
    if (data.isMet) {
      cond.verifiedDate = new Date();
      cond.verifiedBy = userId;
    }
    await license.save();

    return cond;
  }

  // ==================== الغرامات والعقوبات ====================

  /** إضافة غرامة */
  async addPenalty(id, penaltyData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.penalties.push({ ...penaltyData, status: 'pending' });
    license.addAuditEntry('updated', userId, `تم تسجيل غرامة: ${penaltyData.reason}`);
    await license.save();

    logger.info(`[RehabLicense] Penalty added to ${license.licenseNumber}`);
    return license.penalties[license.penalties.length - 1];
  }

  /** تحديث حالة غرامة */
  async updatePenalty(id, penaltyId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const penalty = license.penalties.id(penaltyId);
    if (!penalty) throw new AppError('الغرامة غير موجودة', 404);

    Object.assign(penalty, data);
    if (data.isPaid && !penalty.paidDate) {
      penalty.paidDate = new Date();
      penalty.status = 'paid';
    }
    license.addAuditEntry('updated', userId, `تم تحديث حالة الغرامة: ${penalty.status}`);
    await license.save();

    return penalty;
  }

  /** الحصول على الغرامات المعلقة */
  async getPendingPenalties() {
    const licenses = await RehabCenterLicense.find({
      isActive: true,
      isDeleted: false,
      'penalties.status': 'pending',
    })
      .select('licenseNumber licenseType center.name penalties')
      .lean();

    const allPenalties = [];
    for (const lic of licenses) {
      for (const pen of lic.penalties) {
        if (pen.status === 'pending') {
          allPenalties.push({
            ...pen,
            licenseId: lic._id,
            licenseNumber: lic.licenseNumber,
            centerName: lic.center?.name,
          });
        }
      }
    }
    return allPenalties;
  }

  /** إحصائيات الغرامات */
  async getPenaltyStatistics() {
    return RehabCenterLicense.getPenaltyStatistics();
  }

  // ==================== درجة المخاطرة ====================

  /** حساب المخاطرة لترخيص */
  async calculateRisk(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const riskScore = license.calculateRiskScore();
    await license.save();

    return riskScore;
  }

  /** حساب المخاطرة لجميع التراخيص */
  async calculateAllRisks() {
    const licenses = await RehabCenterLicense.find({ isActive: true, isDeleted: false });
    let updated = 0;
    for (const lic of licenses) {
      lic.calculateRiskScore();
      await lic.save();
      updated++;
    }
    return { updated, total: licenses.length };
  }

  /** الحصول على التراخيص عالية المخاطرة */
  async getHighRiskLicenses(minScore = 50) {
    return RehabCenterLicense.findHighRisk(minScore)
      .select('licenseNumber licenseType category center.name status dates riskScore priority')
      .lean();
  }

  // ==================== سير عمل الموافقات ====================

  /** إعداد سير عمل موافقة */
  async setupApprovalWorkflow(id, steps, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.approvalWorkflow = {
      currentStep: 1,
      totalSteps: steps.length,
      status: 'in_progress',
      steps: steps.map((s, i) => ({
        stepNumber: i + 1,
        title: s.title,
        approverRole: s.approverRole,
        status: 'pending',
      })),
    };
    license.addAuditEntry('updated', userId, 'تم إعداد سير عمل الموافقات');
    await license.save();

    return license.approvalWorkflow;
  }

  /** معالجة خطوة موافقة */
  async processApprovalStep(id, stepNumber, action, comments, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const step = license.approvalWorkflow.steps.find(s => s.stepNumber === stepNumber);
    if (!step) throw new AppError('خطوة الموافقة غير موجودة', 404);

    step.status = action; // 'approved' or 'rejected'
    step.approvedBy = userId;
    step.approvedAt = new Date();
    step.comments = comments;

    if (action === 'approved') {
      const nextStep = license.approvalWorkflow.steps.find(s => s.status === 'pending');
      if (nextStep) {
        license.approvalWorkflow.currentStep = nextStep.stepNumber;
      } else {
        license.approvalWorkflow.status = 'approved';
      }
    } else if (action === 'rejected') {
      license.approvalWorkflow.status = 'rejected';
    }

    license.addAuditEntry('updated', userId, `خطوة الموافقة ${stepNumber}: ${action}`);
    await license.save();

    return license.approvalWorkflow;
  }

  // ==================== الأرشفة ====================

  /** أرشفة ترخيص */
  async archive(id, reason, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.isArchived = true;
    license.archivedAt = new Date();
    license.archivedBy = userId;
    license.archiveReason = reason;
    license.addAuditEntry('updated', userId, `تم أرشفة الترخيص: ${reason || ''}`);
    await license.save();

    return { message: 'تم أرشفة الترخيص بنجاح' };
  }

  /** استعادة من الأرشيف */
  async unarchive(id, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.isArchived = false;
    license.archivedAt = null;
    license.archivedBy = null;
    license.archiveReason = null;
    license.addAuditEntry('updated', userId, 'تم استعادة الترخيص من الأرشيف');
    await license.save();

    return { message: 'تم استعادة الترخيص من الأرشيف بنجاح' };
  }

  /** الحصول على التراخيص المؤرشفة */
  async getArchived(options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      RehabCenterLicense.find({ isArchived: true, isDeleted: false })
        .select('licenseNumber licenseType center.name status dates archivedAt archiveReason')
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RehabCenterLicense.countDocuments({ isArchived: true, isDeleted: false }),
    ]);

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  // ==================== كشف التكرار ====================

  /** البحث عن تراخيص مكررة */
  async findDuplicates() {
    const duplicates = await RehabCenterLicense.aggregate([
      { $match: { isActive: true, isDeleted: false } },
      {
        $group: {
          _id: { licenseType: '$licenseType', center: '$center.name' },
          count: { $sum: 1 },
          licenses: {
            $push: {
              id: '$_id',
              licenseNumber: '$licenseNumber',
              status: '$status',
              expiry: '$dates.expiry',
            },
          },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return duplicates;
  }

  // ==================== توقعات التجديد ====================

  /** توقعات التجديدات القادمة */
  async getRenewalForecast(months = 12) {
    const forecast = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59);

      const count = await RehabCenterLicense.countDocuments({
        isActive: true,
        isDeleted: false,
        'dates.expiry': { $gte: monthStart, $lte: monthEnd },
      });

      const costEstimate = await RehabCenterLicense.aggregate([
        {
          $match: {
            isActive: true,
            isDeleted: false,
            'dates.expiry': { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$costs.renewalFee' } } },
      ]);

      forecast.push({
        month: monthStart.toISOString().slice(0, 7),
        monthLabel: monthStart.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }),
        count,
        estimatedCost: costEstimate[0]?.total || 0,
      });
    }

    return forecast;
  }

  // ==================== إحصائيات المناطق ====================

  /** إحصائيات حسب المنطقة/المدينة */
  async getRegionStatistics() {
    return RehabCenterLicense.getRegionStatistics();
  }

  // ==================== إحصائيات التجديدات ====================

  /** إحصائيات التجديدات السنوية */
  async getRenewalStatistics(year) {
    const currentYear = year || new Date().getFullYear();
    return RehabCenterLicense.getRenewalStatistics(currentYear);
  }

  // ==================== تقييم الجهة ====================

  /** تقييم الترخيص من قبل الجهة المانحة */
  async setAuthorityRating(id, ratingData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.authorityRating = {
      lastRating: ratingData.rating,
      ratingDate: new Date(),
      ratingNotes: ratingData.notes,
      compliancePercentage: ratingData.compliancePercentage,
    };
    license.addAuditEntry('updated', userId, `تم تقييم الترخيص: ${ratingData.rating}/5`);
    await license.save();

    return license.authorityRating;
  }

  // ==================== إشعارات مخصصة ====================

  /** تحديث تفضيلات الإشعارات */
  async updateNotificationPreferences(id, preferences, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.notificationPreferences = {
      ...(license.notificationPreferences?.toObject?.() || {}),
      ...preferences,
    };
    license.addAuditEntry('updated', userId, 'تم تحديث تفضيلات الإشعارات');
    await license.save();

    return license.notificationPreferences;
  }

  // ==================== الفروع ====================

  /** إضافة فرع */
  async addBranch(id, branchData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.branches.push(branchData);
    license.addAuditEntry('updated', userId, `تم إضافة فرع: ${branchData.branchName}`);
    await license.save();

    return license.branches[license.branches.length - 1];
  }

  /** حذف فرع */
  async removeBranch(id, branchId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.branches.pull(branchId);
    license.addAuditEntry('updated', userId, 'تم حذف فرع');
    await license.save();

    return { message: 'تم حذف الفرع' };
  }

  // ==================== سجل التدقيق ====================

  /** الحصول على سجل التدقيق */
  async getAuditTrail(id, options = {}) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false })
      .select('licenseNumber auditTrail')
      .populate('auditTrail.performedBy', 'name email')
      .lean();
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    let trail = license.auditTrail || [];
    // ترتيب من الأحدث
    trail.sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));
    if (options.limit) trail = trail.slice(0, options.limit);

    return { licenseNumber: license.licenseNumber, auditTrail: trail };
  }

  // ==================== الإحصائيات الموسعة ====================

  /** لوحة التحكم الموسعة */
  async getEnhancedDashboard() {
    const basic = await this.getDashboard();
    const [highRisk, pendingPenalties, duplicates, regionStats, renewalForecast] =
      await Promise.all([
        this.getHighRiskLicenses(65),
        this.getPendingPenalties(),
        this.findDuplicates(),
        this.getRegionStatistics(),
        this.getRenewalForecast(6),
      ]);

    return {
      ...basic,
      riskSummary: {
        highRiskCount: highRisk.length,
        highRiskLicenses: highRisk.slice(0, 10),
      },
      penaltiesSummary: {
        pendingCount: pendingPenalties.length,
        totalPendingAmount: pendingPenalties.reduce((s, p) => s + (p.amount || 0), 0),
        recent: pendingPenalties.slice(0, 5),
      },
      duplicatesSummary: {
        groupsCount: duplicates.length,
        duplicates: duplicates.slice(0, 5),
      },
      regionStats,
      renewalForecast,
    };
  }

  // ==================== تقرير الامتثال الشامل ====================

  /** تقرير الامتثال */
  async getComplianceReport() {
    const complianceStats = await RehabCenterLicense.aggregate([
      { $match: { isActive: true, isDeleted: false } },
      {
        $group: {
          _id: '$compliance.status',
          count: { $sum: 1 },
        },
      },
    ]);

    const violationStats = await RehabCenterLicense.aggregate([
      {
        $match: { isActive: true, isDeleted: false, 'compliance.violations.0': { $exists: true } },
      },
      { $unwind: '$compliance.violations' },
      {
        $group: {
          _id: '$compliance.violations.status',
          count: { $sum: 1 },
        },
      },
    ]);

    const upcomingInspections = await RehabCenterLicense.find({
      isActive: true,
      isDeleted: false,
      'compliance.nextInspectionDate': {
        $gte: new Date(),
        $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    })
      .select(
        'licenseNumber licenseType center.name compliance.nextInspectionDate compliance.status'
      )
      .sort({ 'compliance.nextInspectionDate': 1 })
      .limit(20)
      .lean();

    return { complianceStats, violationStats, upcomingInspections };
  }

  // ==================== التقرير السنوي الشامل ====================

  /** تقرير سنوي شامل */
  async getAnnualReport(year) {
    const y = year || new Date().getFullYear();
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31, 23, 59, 59);

    const [created, renewed, expired, totalCosts, renewalStats, penaltyStats] = await Promise.all([
      RehabCenterLicense.countDocuments({
        isDeleted: false,
        createdAt: { $gte: start, $lte: end },
      }),
      RehabCenterLicense.countDocuments({
        isActive: true,
        isDeleted: false,
        'dates.lastRenewal': { $gte: start, $lte: end },
      }),
      RehabCenterLicense.countDocuments({
        isActive: true,
        isDeleted: false,
        'dates.expiry': { $gte: start, $lte: end },
        status: 'expired',
      }),
      RehabCenterLicense.aggregate([
        { $match: { isActive: true, isDeleted: false } },
        { $unwind: { path: '$renewalHistory', preserveNullAndEmptyArrays: false } },
        { $match: { 'renewalHistory.renewalDate': { $gte: start, $lte: end } } },
        { $group: { _id: null, totalCost: { $sum: '$renewalHistory.renewalCost' } } },
      ]),
      this.getRenewalStatistics(y),
      this.getPenaltyStatistics(),
    ]);

    return {
      year: y,
      overview: { created, renewed, expired },
      financials: {
        totalRenewalCost: totalCosts[0]?.totalCost || 0,
        penaltyStats,
      },
      monthlyRenewals: renewalStats,
    };
  }

  // ==================== المهام والتذكيرات ====================

  /** إضافة مهمة */
  async addTask(id, taskData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.tasks.push({ ...taskData, createdBy: userId });
    license.addAuditEntry('updated', userId, `تم إضافة مهمة: ${taskData.title}`);
    await license.save();

    logger.info(`[RehabLicense] Task added to ${license.licenseNumber}`);
    return license.tasks[license.tasks.length - 1];
  }

  /** تحديث حالة مهمة */
  async updateTask(id, taskId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const task = license.tasks.id(taskId);
    if (!task) throw new AppError('المهمة غير موجودة', 404);

    Object.assign(task, data);
    if (data.status === 'completed' && !task.completedDate) {
      task.completedDate = new Date();
      task.completedBy = userId;
    }
    license.addAuditEntry(
      'updated',
      userId,
      `تم تحديث المهمة: ${task.title} - ${data.status || ''}`
    );
    await license.save();

    return task;
  }

  /** حذف مهمة */
  async removeTask(id, taskId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.tasks.pull(taskId);
    license.addAuditEntry('updated', userId, 'تم حذف مهمة');
    await license.save();

    return { message: 'تم حذف المهمة بنجاح' };
  }

  /** الحصول على جميع المهام المتأخرة */
  async getOverdueTasks() {
    return RehabCenterLicense.getOverdueTasks();
  }

  /** إحصائيات المهام */
  async getTaskStatistics() {
    return RehabCenterLicense.getTaskStatistics();
  }

  // ==================== سجل المراسلات ====================

  /** إضافة مراسلة */
  async addCommunication(id, commData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.communications.push({ ...commData, createdBy: userId });
    license.addAuditEntry('updated', userId, `تم إضافة مراسلة: ${commData.subject}`);
    await license.save();

    logger.info(`[RehabLicense] Communication added to ${license.licenseNumber}`);
    return license.communications[license.communications.length - 1];
  }

  /** تحديث مراسلة (مثلاً تسجيل الرد) */
  async updateCommunication(id, commId, data, _userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const comm = license.communications.id(commId);
    if (!comm) throw new AppError('المراسلة غير موجودة', 404);

    Object.assign(comm, data);
    if (data.responseReceived && !comm.responseDate) {
      comm.responseDate = new Date();
      comm.status = 'responded';
    }
    await license.save();

    return comm;
  }

  /** الحصول على المراسلات المعلقة (بانتظار رد) */
  async getPendingCommunications() {
    const licenses = await RehabCenterLicense.find({
      isActive: true,
      isDeleted: false,
      'communications.responseRequired': true,
      'communications.responseReceived': false,
    })
      .select('licenseNumber licenseType center.name communications')
      .lean();

    const pending = [];
    for (const lic of licenses) {
      for (const comm of lic.communications) {
        if (comm.responseRequired && !comm.responseReceived) {
          pending.push({
            ...comm,
            licenseId: lic._id,
            licenseNumber: lic.licenseNumber,
            centerName: lic.center?.name,
          });
        }
      }
    }
    return pending.sort(
      (a, b) => new Date(a.responseDeadline || 0) - new Date(b.responseDeadline || 0)
    );
  }

  // ==================== نسخ/استنساخ الترخيص ====================

  /** نسخ ترخيص (استنساخ) */
  async cloneLicense(id, overrides = {}, userId) {
    const source = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).lean();
    if (!source) throw new AppError('الترخيص غير موجود', 404);

    const excludeFields = [
      '_id',
      '__v',
      'createdAt',
      'updatedAt',
      'isDeleted',
      'deletedAt',
      'deletedBy',
      'auditTrail',
      'renewalHistory',
      'alerts',
      'isArchived',
      'archivedAt',
      'archivedBy',
      'archiveReason',
      'approvalWorkflow',
      'eSignature',
      'comments',
      'kpiData',
    ];
    for (const field of excludeFields) {
      delete source[field];
    }

    const newData = {
      ...source,
      ...overrides,
      licenseNumber: overrides.licenseNumber || `${source.licenseNumber}-COPY`,
      status: 'draft',
      createdBy: userId,
      updatedBy: userId,
    };

    const newLicense = new RehabCenterLicense(newData);
    newLicense.addAuditEntry('created', userId, `تم استنساخ الترخيص من ${source.licenseNumber}`);
    await newLicense.save();

    logger.info(`[RehabLicense] Cloned: ${source.licenseNumber} -> ${newLicense.licenseNumber}`);
    return newLicense;
  }

  // ==================== حاسبة الرسوم ====================

  /** حساب تقدير الرسوم لترخيص */
  async calculateFees(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const costs = license.costs || {};
    const pendingPenalties = (license.penalties || [])
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const budgetSpent = license.budget?.spentAmount || 0;
    const budgetAllocated = license.budget?.allocatedBudget || 0;

    return {
      licenseFees: {
        issueFee: costs.issueFee || 0,
        renewalFee: costs.renewalFee || 0,
        annualFee: costs.annualFee || 0,
        lateFee: costs.lateFee || 0,
      },
      penalties: {
        pendingAmount: pendingPenalties,
        pendingCount: (license.penalties || []).filter(p => p.status === 'pending').length,
      },
      totalPaid: costs.totalPaid || 0,
      budget: {
        allocated: budgetAllocated,
        spent: budgetSpent,
        remaining: budgetAllocated - budgetSpent,
        usagePercentage:
          budgetAllocated > 0 ? Math.round((budgetSpent / budgetAllocated) * 100) : 0,
      },
      estimatedRenewalCost: (costs.renewalFee || 0) + pendingPenalties + (costs.lateFee || 0),
      grandTotal: (costs.totalPaid || 0) + pendingPenalties,
    };
  }

  /** حاسبة الرسوم الإجمالية */
  async calculateTotalFees(filters = {}) {
    const query = { isActive: true, isDeleted: false };
    if (filters.category) query.category = filters.category;

    const result = await RehabCenterLicense.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalIssueFees: { $sum: '$costs.issueFee' },
          totalRenewalFees: { $sum: '$costs.renewalFee' },
          totalAnnualFees: { $sum: '$costs.annualFee' },
          totalLateFees: { $sum: '$costs.lateFee' },
          totalPaid: { $sum: '$costs.totalPaid' },
          totalBudgetAllocated: { $sum: '$budget.allocatedBudget' },
          totalBudgetSpent: { $sum: '$budget.spentAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return (
      result[0] || {
        totalIssueFees: 0,
        totalRenewalFees: 0,
        totalAnnualFees: 0,
        totalLateFees: 0,
        totalPaid: 0,
        totalBudgetAllocated: 0,
        totalBudgetSpent: 0,
        count: 0,
      }
    );
  }

  // ==================== تقويم المواعيد ====================

  /** إضافة حدث للتقويم */
  async addCalendarEvent(id, eventData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.calendarEvents.push({ ...eventData, createdBy: userId });
    license.addAuditEntry('updated', userId, `تم إضافة حدث: ${eventData.title}`);
    await license.save();

    return license.calendarEvents[license.calendarEvents.length - 1];
  }

  /** تحديث حدث */
  async updateCalendarEvent(id, eventId, data, _userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const event = license.calendarEvents.id(eventId);
    if (!event) throw new AppError('الحدث غير موجود', 404);

    Object.assign(event, data);
    await license.save();
    return event;
  }

  /** حذف حدث */
  async removeCalendarEvent(id, eventId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.calendarEvents.pull(eventId);
    license.addAuditEntry('updated', userId, 'تم حذف حدث من التقويم');
    await license.save();
    return { message: 'تم حذف الحدث بنجاح' };
  }

  /** الحصول على الأحداث القادمة */
  async getUpcomingEvents(days = 30) {
    return RehabCenterLicense.getUpcomingEvents(days);
  }

  // ==================== جهات الاتصال ====================

  /** إضافة جهة اتصال */
  async addAuthorityContact(id, contactData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.authorityContacts.push(contactData);
    license.addAuditEntry('updated', userId, `تم إضافة جهة اتصال: ${contactData.authorityName}`);
    await license.save();

    return license.authorityContacts[license.authorityContacts.length - 1];
  }

  /** تحديث جهة اتصال */
  async updateAuthorityContact(id, contactId, data, _userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const contact = license.authorityContacts.id(contactId);
    if (!contact) throw new AppError('جهة الاتصال غير موجودة', 404);

    Object.assign(contact, data);
    await license.save();
    return contact;
  }

  /** حذف جهة اتصال */
  async removeAuthorityContact(id, contactId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.authorityContacts.pull(contactId);
    license.addAuditEntry('updated', userId, 'تم حذف جهة اتصال');
    await license.save();
    return { message: 'تم حذف جهة الاتصال بنجاح' };
  }

  // ==================== قائمة الوثائق المطلوبة ====================

  /** إضافة وثيقة للقائمة */
  async addDocumentChecklistItem(id, docData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.documentChecklist.push(docData);
    license.addAuditEntry('updated', userId, `تم إضافة وثيقة: ${docData.documentName}`);
    await license.save();

    return license.documentChecklist[license.documentChecklist.length - 1];
  }

  /** تحديث حالة وثيقة */
  async updateDocumentChecklistItem(id, docId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const doc = license.documentChecklist.id(docId);
    if (!doc) throw new AppError('الوثيقة غير موجودة', 404);

    Object.assign(doc, data);
    if (data.isProvided && !doc.providedDate) {
      doc.providedDate = new Date();
      doc.providedBy = userId;
      doc.status = 'provided';
    }
    if (data.status === 'verified') {
      doc.verifiedBy = userId;
      doc.verifiedDate = new Date();
    }
    await license.save();
    return doc;
  }

  /** حالة قائمة الوثائق */
  async getDocumentChecklistStatus(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const checklist = license.documentChecklist || [];
    const total = checklist.length;
    const verified = checklist.filter(d => d.status === 'verified').length;
    const provided = checklist.filter(d => d.status === 'provided').length;
    const pending = checklist.filter(d => d.status === 'pending').length;
    const rejected = checklist.filter(d => d.status === 'rejected').length;

    return {
      total,
      verified,
      provided,
      pending,
      rejected,
      completionRate: total > 0 ? Math.round((verified / total) * 100) : 0,
      checklist,
    };
  }

  /** إحصائيات الوثائق */
  async getDocumentStatistics() {
    return RehabCenterLicense.getDocumentStatistics();
  }

  // ==================== التعليقات والنقاشات ====================

  /** إضافة تعليق */
  async addComment(id, commentData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.comments.push({ ...commentData, createdBy: userId });
    await license.save();

    return license.comments[license.comments.length - 1];
  }

  /** تحديث تعليق */
  async updateComment(id, commentId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const comment = license.comments.id(commentId);
    if (!comment) throw new AppError('التعليق غير موجود', 404);
    if (comment.createdBy?.toString() !== userId?.toString()) {
      throw new AppError('لا يمكنك تعديل تعليق شخص آخر', 403);
    }

    comment.content = data.content;
    comment.editedAt = new Date();
    await license.save();
    return comment;
  }

  /** حذف تعليق (soft) */
  async deleteComment(id, commentId, _userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const comment = license.comments.id(commentId);
    if (!comment) throw new AppError('التعليق غير موجود', 404);

    comment.isDeleted = true;
    await license.save();
    return { message: 'تم حذف التعليق' };
  }

  /** تثبيت/إلغاء تثبيت تعليق */
  async togglePinComment(id, commentId, _userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const comment = license.comments.id(commentId);
    if (!comment) throw new AppError('التعليق غير موجود', 404);

    comment.isPinned = !comment.isPinned;
    await license.save();
    return {
      message: comment.isPinned ? 'تم تثبيت التعليق' : 'تم إلغاء تثبيت التعليق',
      isPinned: comment.isPinned,
    };
  }

  // ==================== تتبع الميزانية ====================

  /** تحديث بيانات الميزانية */
  async updateBudget(id, budgetData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const existing = license.budget?.toObject?.() || license.budget || {};
    license.budget = { ...existing, ...budgetData };
    license.addAuditEntry('updated', userId, 'تم تحديث بيانات الميزانية');
    await license.save();

    return license.budget;
  }

  /** إضافة مصروف */
  async addExpense(id, expenseData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    if (!license.budget) license.budget = { expenses: [] };
    if (!license.budget.expenses) license.budget.expenses = [];

    license.budget.expenses.push({ ...expenseData, createdBy: userId });
    license.budget.spentAmount = license.budget.expenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    );
    license.addAuditEntry(
      'updated',
      userId,
      `تم تسجيل مصروف: ${expenseData.description} - ${expenseData.amount} ر.س`
    );
    await license.save();

    return license.budget.expenses[license.budget.expenses.length - 1];
  }

  /** إحصائيات الميزانية */
  async getBudgetStatistics(fiscalYear) {
    return RehabCenterLicense.getBudgetStatistics(fiscalYear);
  }

  // ==================== مؤشر صحة الترخيص ====================

  /** حساب صحة ترخيص */
  async calculateHealth(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const health = license.calculateHealthScore();
    await license.save();
    return health;
  }

  /** حساب صحة جميع التراخيص */
  async calculateAllHealth() {
    const licenses = await RehabCenterLicense.find({ isActive: true, isDeleted: false });
    let updated = 0;
    for (const lic of licenses) {
      lic.calculateHealthScore();
      await lic.save();
      updated++;
    }
    return { updated, total: licenses.length };
  }

  /** التراخيص ذات الصحة المنخفضة */
  async getLowHealthLicenses(maxScore = 50) {
    return RehabCenterLicense.find({
      'healthScore.score': { $lte: maxScore },
      isActive: true,
      isDeleted: false,
    })
      .select('licenseNumber licenseType category center.name status healthScore dates')
      .sort({ 'healthScore.score': 1 })
      .lean();
  }

  // ==================== استيراد مجمع ====================

  /** استيراد تراخيص من بيانات مجمعة */
  async bulkImport(licensesData, userId) {
    const results = [];
    for (const data of licensesData) {
      try {
        const license = await this.create({ ...data, createdBy: userId }, userId);
        results.push({ success: true, licenseNumber: license.licenseNumber, id: license._id });
      } catch (error) {
        results.push({
          success: false,
          licenseNumber: data.licenseNumber || 'N/A',
          error: error.message,
        });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    logger.info(`[RehabLicense] Bulk import: ${succeeded} success, ${failed} failed`);

    return { total: results.length, succeeded, failed, details: results };
  }

  // ==================== مؤشرات الأداء KPI ====================

  /** حساب KPI لترخيص */
  async calculateKPIs(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const kpi = license.calculateKPIs();
    await license.save();
    return kpi;
  }

  /** لوحة مؤشرات الأداء الشاملة */
  async getKPIDashboard() {
    const licenses = await RehabCenterLicense.find({ isActive: true, isDeleted: false });

    let totalRenewalOnTime = 0;
    let totalCompliance = 0;
    let totalDocCompletion = 0;
    let totalTaskCompletion = 0;
    let totalPenaltyAmount = 0;
    const count = licenses.length;

    for (const lic of licenses) {
      lic.calculateKPIs();
      totalRenewalOnTime += lic.kpiData.renewalOnTimeRate;
      totalCompliance += lic.kpiData.complianceRate;
      totalDocCompletion += lic.kpiData.documentCompletionRate;
      totalTaskCompletion += lic.kpiData.taskCompletionRate;
      totalPenaltyAmount += lic.kpiData.totalPenaltyAmount;
    }

    const avg = v => (count > 0 ? Math.round(v / count) : 0);

    const [taskStats, docStats, budgetStats] = await Promise.all([
      this.getTaskStatistics(),
      this.getDocumentStatistics(),
      this.getBudgetStatistics(),
    ]);

    return {
      overview: {
        totalLicenses: count,
        avgRenewalOnTimeRate: avg(totalRenewalOnTime),
        avgComplianceRate: avg(totalCompliance),
        avgDocumentCompletionRate: avg(totalDocCompletion),
        avgTaskCompletionRate: avg(totalTaskCompletion),
        totalPenaltyAmount,
      },
      taskStats,
      documentStats: docStats,
      budgetStats,
    };
  }

  // ==================== جدولة التنبيهات (Cron job) ====================

  /** يتم استدعاؤها يومياً من scheduler */
  async dailyAlertCheck() {
    logger.info('[RehabLicense] Starting daily alert check...');
    const result = await this.runAlertScan();
    logger.info(`[RehabLicense] Daily alert check completed: ${JSON.stringify(result)}`);
    return result;
  }

  // ==================== Round 4: نظام القوالب ====================

  /** حفظ ترخيص كقالب */
  async saveAsTemplate(id, templateInfo, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.templateData = {
      isTemplate: true,
      templateName: templateInfo.templateName,
      templateDescription: templateInfo.templateDescription || '',
      templateCategory: templateInfo.templateCategory || license.category,
      templateTags: templateInfo.templateTags || [],
      usageCount: 0,
      lastUsedAt: null,
      createdFromTemplate: null,
    };
    license.addAuditEntry('updated', userId, `تم حفظ الترخيص كقالب: ${templateInfo.templateName}`);
    await license.save();
    return license.templateData;
  }

  /** الحصول على قائمة القوالب */
  async getTemplates(category) {
    return RehabCenterLicense.getTemplates(category);
  }

  /** إنشاء ترخيص من قالب */
  async createFromTemplate(templateId, overrides, userId) {
    const template = await RehabCenterLicense.findOne({
      _id: templateId,
      'templateData.isTemplate': true,
      isDeleted: false,
    });
    if (!template) throw new AppError('القالب غير موجود', 404);

    const templateObj = template.toObject();
    delete templateObj._id;
    delete templateObj.__v;
    delete templateObj.createdAt;
    delete templateObj.updatedAt;
    delete templateObj.auditTrail;
    delete templateObj.renewalHistory;
    delete templateObj.alerts;
    delete templateObj.penalties;
    delete templateObj.tickets;
    delete templateObj.changeLog;
    delete templateObj.comments;
    delete templateObj.communications;
    delete templateObj.tasks;
    delete templateObj.calendarEvents;
    delete templateObj.favorites;
    delete templateObj.watchers;
    templateObj.templateData = { isTemplate: false, createdFromTemplate: templateId };
    templateObj.status = 'draft';

    const newData = { ...templateObj, ...overrides, createdBy: userId };
    const newLicense = await this.create(newData, userId);

    // تحديث عداد الاستخدام
    template.templateData.usageCount = (template.templateData.usageCount || 0) + 1;
    template.templateData.lastUsedAt = new Date();
    await template.save();

    logger.info(
      `[RehabLicense] Created from template: ${newLicense.licenseNumber} (from ${templateId})`
    );
    return newLicense;
  }

  /** حذف قالب */
  async removeTemplate(id, userId) {
    const license = await RehabCenterLicense.findOne({
      _id: id,
      'templateData.isTemplate': true,
      isDeleted: false,
    });
    if (!license) throw new AppError('القالب غير موجود', 404);

    license.templateData.isTemplate = false;
    license.addAuditEntry('updated', userId, 'تم إلغاء حالة القالب');
    await license.save();
    return { message: 'تم إلغاء القالب بنجاح' };
  }

  // ==================== Round 4: المفضلة والمتابعة ====================

  /** إضافة إلى المفضلة */
  async toggleFavorite(id, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    if (!license.favorites) license.favorites = [];
    const idx = license.favorites.findIndex(f => f.userId?.toString() === userId?.toString());
    let action;
    if (idx >= 0) {
      license.favorites.splice(idx, 1);
      action = 'removed';
    } else {
      license.favorites.push({ userId, addedAt: new Date() });
      action = 'added';
    }
    await license.save();
    return { action, isFavorite: action === 'added' };
  }

  /** الحصول على مفضلات المستخدم */
  async getUserFavorites(userId) {
    return RehabCenterLicense.getUserFavorites(userId);
  }

  /** إضافة/إزالة متابعة */
  async toggleWatch(id, userId, watchType = 'all') {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    if (!license.watchers) license.watchers = [];
    const idx = license.watchers.findIndex(w => w.userId?.toString() === userId?.toString());
    let action;
    if (idx >= 0) {
      license.watchers.splice(idx, 1);
      action = 'unwatched';
    } else {
      license.watchers.push({ userId, watchType, addedAt: new Date() });
      action = 'watching';
    }
    await license.save();
    return { action, isWatching: action === 'watching' };
  }

  /** قائمة متابعة المستخدم */
  async getUserWatchlist(userId) {
    return RehabCenterLicense.getUserWatchlist(userId);
  }

  // ==================== Round 4: مقارنة التراخيص ====================

  /** مقارنة ترخيصين أو أكثر */
  async compareLicenses(licenseIds) {
    if (!licenseIds || licenseIds.length < 2)
      throw new AppError('يجب تحديد ترخيصين على الأقل للمقارنة', 400);
    if (licenseIds.length > 5) throw new AppError('الحد الأقصى 5 تراخيص للمقارنة', 400);

    const licenses = await RehabCenterLicense.find({ _id: { $in: licenseIds }, isDeleted: false })
      .select(
        'licenseNumber licenseType category center issuingAuthority status dates costs renewalSettings healthScore riskScore kpiData sla compliance budget'
      )
      .lean();

    if (licenses.length < 2) throw new AppError('لم يتم العثور على تراخيص كافية', 404);

    const comparison = {
      licenses: licenses.map(l => ({
        id: l._id,
        licenseNumber: l.licenseNumber,
        licenseType: l.licenseType,
        category: l.category,
        centerName: l.center?.name,
        authority: l.issuingAuthority?.name,
        status: l.status,
        issueDate: l.dates?.issued,
        expiryDate: l.dates?.expiry,
        issueFee: l.costs?.issueFee || 0,
        renewalFee: l.costs?.renewalFee || 0,
        totalPaid: l.costs?.totalPaid || 0,
        healthScore: l.healthScore?.score || 0,
        healthGrade: l.healthScore?.grade || 'N/A',
        riskScore: l.riskScore?.score || 0,
        riskLevel: l.riskScore?.level || 'N/A',
        complianceStatus: l.compliance?.status || 'N/A',
        slaCompliance: l.sla?.overallCompliance || 0,
        budgetAllocated: l.budget?.allocatedBudget || 0,
        budgetSpent: l.budget?.spentAmount || 0,
      })),
      differences: [],
      generatedAt: new Date(),
    };

    // كشف الاختلافات
    const fields = [
      'status',
      'category',
      'licenseType',
      'healthGrade',
      'riskLevel',
      'complianceStatus',
    ];
    for (const field of fields) {
      const values = comparison.licenses.map(l => l[field]);
      if (new Set(values).size > 1) {
        comparison.differences.push({ field, values });
      }
    }

    return comparison;
  }

  // ==================== Round 4: اتفاقيات مستوى الخدمة SLA ====================

  /** تحديث إعدادات SLA */
  async updateSLASettings(id, slaSettings, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const existing = license.sla || {};
    license.sla = { ...existing, ...slaSettings };
    license.evaluateSLA();
    license.addAuditEntry('updated', userId, 'تم تحديث إعدادات SLA');
    await license.save();
    return license.sla;
  }

  /** إضافة قاعدة تصعيد */
  async addEscalationRule(id, ruleData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    if (!license.sla) license.sla = {};
    if (!license.sla.escalationRules) license.sla.escalationRules = [];
    license.sla.escalationRules.push(ruleData);
    license.addAuditEntry('updated', userId, `تم إضافة قاعدة تصعيد: ${ruleData.triggerCondition}`);
    await license.save();
    return license.sla.escalationRules[license.sla.escalationRules.length - 1];
  }

  /** حذف قاعدة تصعيد */
  async removeEscalationRule(id, ruleId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const idx = (license.sla?.escalationRules || []).findIndex(r => r._id?.toString() === ruleId);
    if (idx < 0) throw new AppError('قاعدة التصعيد غير موجودة', 404);
    license.sla.escalationRules.splice(idx, 1);
    license.addAuditEntry('updated', userId, 'تم حذف قاعدة تصعيد');
    await license.save();
    return { message: 'تم حذف قاعدة التصعيد' };
  }

  /** تقييم SLA لترخيص */
  async evaluateSLA(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const sla = license.evaluateSLA();
    await license.save();
    return sla;
  }

  /** تقييم SLA لجميع التراخيص */
  async evaluateAllSLA() {
    const licenses = await RehabCenterLicense.find({ isActive: true, isDeleted: false });
    let updated = 0;
    for (const lic of licenses) {
      lic.evaluateSLA();
      await lic.save();
      updated++;
    }
    return { updated, total: licenses.length };
  }

  /** إحصائيات SLA */
  async getSLAStatistics() {
    return RehabCenterLicense.getSLAStatistics();
  }

  /** التراخيص المخالفة لـ SLA */
  async getSLABreachedLicenses() {
    return RehabCenterLicense.find({
      $or: [
        { 'sla.renewalSLA.status': 'breached' },
        { 'sla.inspectionSLA.status': 'breached' },
        { 'sla.responseSLA.status': 'breached' },
      ],
      isActive: true,
      isDeleted: false,
    })
      .select('licenseNumber licenseType center.name status sla dates')
      .sort({ 'sla.overallCompliance': 1 })
      .lean();
  }

  // ==================== Round 4: نظام التذاكر ====================

  /** إنشاء تذكرة */
  async createTicket(id, ticketData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    if (!license.tickets) license.tickets = [];
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const ticket = { ...ticketData, ticketNumber, reportedBy: userId, createdAt: new Date() };
    license.tickets.push(ticket);
    license.addAuditEntry('updated', userId, `تم إنشاء تذكرة: ${ticketData.title}`);
    await license.save();
    return license.tickets[license.tickets.length - 1];
  }

  /** تحديث تذكرة */
  async updateTicket(id, ticketId, updateData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const ticket = (license.tickets || []).id(ticketId);
    if (!ticket) throw new AppError('التذكرة غير موجودة', 404);

    Object.assign(ticket, updateData, { updatedAt: new Date() });
    if (updateData.status === 'resolved' && !ticket.resolutionDate)
      ticket.resolutionDate = new Date();
    if (updateData.status === 'closed') {
      ticket.closedAt = new Date();
      ticket.closedBy = userId;
    }
    license.addAuditEntry('updated', userId, `تم تحديث التذكرة: ${ticket.ticketNumber}`);
    await license.save();
    return ticket;
  }

  /** إضافة رد على تذكرة */
  async addTicketResponse(id, ticketId, responseData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const ticket = (license.tickets || []).id(ticketId);
    if (!ticket) throw new AppError('التذكرة غير موجودة', 404);

    if (!ticket.responses) ticket.responses = [];
    ticket.responses.push({ ...responseData, respondedBy: userId, respondedAt: new Date() });
    if (ticket.status === 'open') ticket.status = 'in_progress';
    ticket.updatedAt = new Date();
    await license.save();
    return ticket.responses[ticket.responses.length - 1];
  }

  /** إحصائيات التذاكر */
  async getTicketStatistics() {
    return RehabCenterLicense.getTicketStatistics();
  }

  /** التذاكر المفتوحة */
  async getOpenTickets() {
    return RehabCenterLicense.getOpenTickets();
  }

  // ==================== Round 4: الإجراءات التلقائية ====================

  /** إضافة قاعدة أتمتة */
  async addAutomationRule(id, ruleData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    if (!license.automationRules) license.automationRules = [];
    license.automationRules.push({ ...ruleData, createdBy: userId, createdAt: new Date() });
    license.addAuditEntry('updated', userId, `تم إضافة قاعدة أتمتة: ${ruleData.ruleName}`);
    await license.save();
    return license.automationRules[license.automationRules.length - 1];
  }

  /** تحديث قاعدة أتمتة */
  async updateAutomationRule(id, ruleId, updateData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const rule = (license.automationRules || []).id(ruleId);
    if (!rule) throw new AppError('قاعدة الأتمتة غير موجودة', 404);

    Object.assign(rule, updateData);
    license.addAuditEntry('updated', userId, `تم تحديث قاعدة الأتمتة: ${rule.ruleName}`);
    await license.save();
    return rule;
  }

  /** حذف قاعدة أتمتة */
  async removeAutomationRule(id, ruleId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const idx = (license.automationRules || []).findIndex(r => r._id?.toString() === ruleId);
    if (idx < 0) throw new AppError('قاعدة الأتمتة غير موجودة', 404);
    license.automationRules.splice(idx, 1);
    license.addAuditEntry('updated', userId, 'تم حذف قاعدة أتمتة');
    await license.save();
    return { message: 'تم حذف قاعدة الأتمتة' };
  }

  /** تنفيذ قواعد الأتمتة لترخيص */
  async runAutomationRules(id, event) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) return { triggered: 0 };

    const rules = (license.automationRules || []).filter(
      r => r.isActive && r.trigger?.event === event
    );
    let triggered = 0;

    for (const rule of rules) {
      try {
        for (const action of rule.actions || []) {
          switch (action.actionType) {
            case 'calculate_risk':
              license.calculateRiskScore();
              break;
            case 'calculate_health':
              license.calculateHealthScore();
              break;
            case 'add_comment':
              if (!license.comments) license.comments = [];
              license.comments.push({
                content: action.parameters?.content || `أتمتة: ${rule.ruleName}`,
                isInternal: true,
                createdAt: new Date(),
              });
              break;
            default:
              break;
          }
        }
        rule.lastTriggered = new Date();
        rule.triggerCount = (rule.triggerCount || 0) + 1;
        triggered++;
      } catch (_err) {
        logger.warn(`[RehabLicense] Automation rule execution failed: ${rule.ruleName}`);
      }
    }

    if (triggered > 0) await license.save();
    return { triggered, total: rules.length };
  }

  // ==================== Round 4: التقارير التنفيذية ====================

  /** توليد التقرير التنفيذي لترخيص */
  async generateExecutiveSummary(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const summary = license.generateExecutiveSummary();
    await license.save();
    return summary;
  }

  /** التقرير التنفيذي الشامل */
  async getExecutiveReport() {
    return RehabCenterLicense.getExecutiveReport();
  }

  /** توليد التقارير التنفيذية لجميع التراخيص */
  async generateAllExecutiveSummaries() {
    const licenses = await RehabCenterLicense.find({ isActive: true, isDeleted: false });
    let updated = 0;
    for (const lic of licenses) {
      lic.generateExecutiveSummary();
      await lic.save();
      updated++;
    }
    return { updated, total: licenses.length };
  }

  // ==================== Round 4: التحليلات التنبؤية ====================

  /** حساب التحليلات التنبؤية لترخيص */
  async calculatePredictions(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const predictions = license.calculatePredictions();
    await license.save();
    return predictions;
  }

  /** التحليلات التنبؤية الشاملة */
  async getPredictiveAnalytics() {
    const licenses = await RehabCenterLicense.find({ isActive: true, isDeleted: false });
    let totalRenewalCost = 0,
      highRiskCount = 0,
      decliningCompliance = 0,
      totalProjectedCost = 0;
    const count = licenses.length;

    for (const lic of licenses) {
      lic.calculatePredictions();
      totalRenewalCost += lic.predictions?.renewalCostForecast?.nextRenewalEstimate || 0;
      if (lic.predictions?.expiryRiskPrediction?.riskOfLapse > 60) highRiskCount++;
      if (lic.predictions?.complianceTrend?.direction === 'declining') decliningCompliance++;
      totalProjectedCost += lic.predictions?.costAnalysis?.projectedCostNextYear || 0;
      await lic.save();
    }

    return {
      totalLicenses: count,
      totalProjectedRenewalCost: totalRenewalCost,
      totalProjectedAnnualCost: totalProjectedCost,
      highRiskLicenses: highRiskCount,
      decliningComplianceLicenses: decliningCompliance,
      generatedAt: new Date(),
    };
  }

  // ==================== Round 4: سجل التغييرات المفصل ====================

  /** الحصول على سجل التغييرات */
  async getChangeLog(id, options = {}) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false })
      .select('changeLog licenseNumber center.name')
      .populate('changeLog.changedBy', 'name email')
      .lean();
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    let changes = license.changeLog || [];

    if (options.fieldName) changes = changes.filter(c => c.fieldName === options.fieldName);
    if (options.changeType) changes = changes.filter(c => c.changeType === options.changeType);
    if (options.fromDate)
      changes = changes.filter(c => new Date(c.changeDate) >= new Date(options.fromDate));
    if (options.toDate)
      changes = changes.filter(c => new Date(c.changeDate) <= new Date(options.toDate));

    changes.sort((a, b) => new Date(b.changeDate) - new Date(a.changeDate));

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const start = (page - 1) * limit;

    return {
      licenseNumber: license.licenseNumber,
      centerName: license.center?.name,
      total: changes.length,
      page,
      limit,
      changes: changes.slice(start, start + limit),
    };
  }

  /** إضافة سجل تغيير يدوي */
  async addChangeLogEntry(id, entryData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.addChangeLogEntry(
      entryData.fieldName,
      entryData.fieldLabel,
      entryData.oldValue,
      entryData.newValue,
      userId,
      entryData.changeType,
      entryData.changeReason,
      'manual'
    );
    await license.save();
    return license.changeLog[license.changeLog.length - 1];
  }

  // ==================== Round 4: إصدارات الوثائق ====================

  /** إضافة وثيقة مع إصدار */
  async addDocumentVersion(id, docData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    if (!license.documentVersions) license.documentVersions = [];

    license.documentVersions.push({
      documentName: docData.documentName,
      documentType: docData.documentType || 'other',
      versions: [
        {
          versionNumber: 1,
          fileUrl: docData.fileUrl,
          fileName: docData.fileName,
          fileSize: docData.fileSize,
          mimeType: docData.mimeType,
          uploadedBy: userId,
          uploadedAt: new Date(),
          changeNotes: docData.changeNotes || 'الإصدار الأول',
          isCurrentVersion: true,
        },
      ],
      expiryDate: docData.expiryDate,
      reminderDays: docData.reminderDays || 30,
      isActive: true,
      createdAt: new Date(),
    });
    license.addAuditEntry('document_uploaded', userId, `تم إضافة وثيقة: ${docData.documentName}`);
    await license.save();
    return license.documentVersions[license.documentVersions.length - 1];
  }

  /** إضافة إصدار جديد لوثيقة موجودة */
  async addNewVersion(id, docId, versionData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const doc = (license.documentVersions || []).id(docId);
    if (!doc) throw new AppError('الوثيقة غير موجودة', 404);

    // set all existing versions to not current
    doc.versions.forEach(v => {
      v.isCurrentVersion = false;
    });

    const newVersionNumber =
      (doc.versions.length > 0 ? Math.max(...doc.versions.map(v => v.versionNumber)) : 0) + 1;
    doc.versions.push({
      versionNumber: newVersionNumber,
      fileUrl: versionData.fileUrl,
      fileName: versionData.fileName,
      fileSize: versionData.fileSize,
      mimeType: versionData.mimeType,
      uploadedBy: userId,
      uploadedAt: new Date(),
      changeNotes: versionData.changeNotes || '',
      isCurrentVersion: true,
    });

    if (versionData.expiryDate) doc.expiryDate = versionData.expiryDate;
    license.addAuditEntry(
      'document_uploaded',
      userId,
      `تم إضافة إصدار ${newVersionNumber} للوثيقة: ${doc.documentName}`
    );
    await license.save();
    return doc;
  }

  /** الحصول على إصدارات وثيقة */
  async getDocumentVersionHistory(id, docId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false })
      .select('documentVersions')
      .lean();
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const doc = (license.documentVersions || []).find(d => d._id?.toString() === docId);
    if (!doc) throw new AppError('الوثيقة غير موجودة', 404);
    return doc;
  }

  /** الوثائق القريبة من الانتهاء */
  async getExpiringDocuments(days = 30) {
    return RehabCenterLicense.getExpiringDocuments(days);
  }

  /** حذف وثيقة */
  async removeDocumentVersion(id, docId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const doc = (license.documentVersions || []).id(docId);
    if (!doc) throw new AppError('الوثيقة غير موجودة', 404);

    doc.isActive = false;
    license.addAuditEntry('updated', userId, `تم حذف الوثيقة: ${doc.documentName}`);
    await license.save();
    return { message: 'تم حذف الوثيقة' };
  }

  // ====================================================================
  //  Round 5 — Feature 1: الإشعارات المتقدمة (Advanced Notifications)
  // ====================================================================

  /** إضافة إشعار مجدول */
  async addScheduledNotification(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const notification = { ...data, createdBy: userId, createdAt: new Date() };
    license.scheduledNotifications.push(notification);
    license.addAuditEntry('updated', userId, `إشعار مجدول جديد: ${data.title}`);
    await license.save();
    return license.scheduledNotifications[license.scheduledNotifications.length - 1];
  }

  /** جلب الإشعارات المجدولة */
  async getScheduledNotifications(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'scheduledNotifications center'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.scheduledNotifications.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /** تحديث حالة إشعار */
  async updateNotificationStatus(id, notifId, status, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const notif = (license.scheduledNotifications || []).id(notifId);
    if (!notif) throw new AppError('الإشعار غير موجود', 404);

    notif.status = status;
    if (status === 'sent') notif.sentAt = new Date();
    license.addAuditEntry('updated', userId, `تحديث حالة إشعار: ${notif.title} → ${status}`);
    await license.save();
    return notif;
  }

  /** حذف إشعار مجدول */
  async removeScheduledNotification(id, notifId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const notif = (license.scheduledNotifications || []).id(notifId);
    if (!notif) throw new AppError('الإشعار غير موجود', 404);

    notif.status = 'cancelled';
    license.addAuditEntry('updated', userId, `إلغاء إشعار: ${notif.title}`);
    await license.save();
    return { message: 'تم إلغاء الإشعار' };
  }

  /** إرسال جماعي لإشعارات */
  async sendBulkNotifications(filters, data, userId) {
    const query = { isDeleted: false };
    if (filters.licenseIds?.length) {
      query._id = { $in: filters.licenseIds };
    }
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.priority) query.priority = filters.priority;
    const licenses = await RehabCenterLicense.find(query);

    const results = [];
    for (const license of licenses) {
      const notif = { ...data, createdBy: userId, status: 'sent', sentAt: new Date() };
      license.scheduledNotifications.push(notif);
      license.addAuditEntry('updated', userId, `إشعار جماعي: ${data.title}`);
      await license.save();
      results.push({ licenseId: license._id, center: license.center });
    }
    return { sent: results.length, results };
  }

  // ====================================================================
  //  Round 5 — Feature 2: تقييم رضا المتعاملين (Satisfaction Surveys)
  // ====================================================================

  /** إضافة تقييم رضا */
  async addSatisfactionSurvey(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const survey = { ...data, submittedAt: new Date() };
    license.satisfactionSurveys.push(survey);
    license.addAuditEntry('updated', userId, `تقييم رضا جديد: ${data.surveyType || 'عام'}`);
    await license.save();
    return license.satisfactionSurveys[license.satisfactionSurveys.length - 1];
  }

  /** جلب تقييمات الرضا */
  async getSatisfactionSurveys(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'satisfactionSurveys center'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.satisfactionSurveys.sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );
  }

  /** تحليل مؤشرات الرضا */
  async analyzeSatisfaction(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'satisfactionSurveys'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const surveys = license.satisfactionSurveys || [];
    if (surveys.length === 0) return { totalSurveys: 0, averages: {} };

    const sum = (arr, key) => arr.reduce((s, v) => s + (v[key] || 0), 0);
    const avg = (arr, key) => {
      const vals = arr.filter(v => v[key]);
      return vals.length ? +(sum(vals, key) / vals.length).toFixed(2) : 0;
    };

    return {
      totalSurveys: surveys.length,
      averages: {
        overall: avg(surveys, 'overallRating'),
        serviceQuality: avg(surveys, 'serviceQuality'),
        responseTime: avg(surveys, 'responseTime'),
        communication: avg(surveys, 'communication'),
        processClarity: avg(surveys, 'processClarity'),
      },
      byType: Object.entries(
        surveys.reduce((acc, s) => {
          const t = s.surveyType || 'general';
          if (!acc[t]) acc[t] = [];
          acc[t].push(s);
          return acc;
        }, {})
      ).map(([type, items]) => ({
        type,
        count: items.length,
        avgRating: avg(items, 'overallRating'),
      })),
    };
  }

  /** تحليل رضا شامل عبر جميع التراخيص */
  async getGlobalSatisfactionAnalytics() {
    const licenses = await RehabCenterLicense.find({ isDeleted: false }).select(
      'satisfactionSurveys center'
    );
    const all = [];
    for (const lic of licenses) {
      for (const s of lic.satisfactionSurveys || []) {
        all.push({ ...s.toObject(), center: lic.center });
      }
    }
    if (all.length === 0) return { totalSurveys: 0 };

    const avgOf = key => {
      const vals = all.filter(v => v[key]);
      return vals.length ? +(vals.reduce((s, v) => s + v[key], 0) / vals.length).toFixed(2) : 0;
    };

    return {
      totalSurveys: all.length,
      averageOverall: avgOf('overallRating'),
      averageService: avgOf('serviceQuality'),
      averageResponse: avgOf('responseTime'),
      topSuggestions: all
        .filter(s => s.suggestions)
        .map(s => s.suggestions)
        .slice(0, 10),
    };
  }

  // ====================================================================
  //  Round 5 — Feature 3: التوقيعات الرقمية (Digital Signatures)
  // ====================================================================

  /** إضافة توقيع رقمي */
  async addDigitalSignature(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const sig = { ...data, signedAt: new Date() };
    license.digitalSignatures.push(sig);
    license.addAuditEntry(
      'updated',
      userId,
      `توقيع رقمي: ${data.signerName} (${data.signatureType})`
    );
    await license.save();
    return license.digitalSignatures[license.digitalSignatures.length - 1];
  }

  /** جلب التوقيعات الرقمية */
  async getDigitalSignatures(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'digitalSignatures center'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.digitalSignatures.sort((a, b) => new Date(b.signedAt) - new Date(a.signedAt));
  }

  /** التحقق من توقيع */
  async verifyDigitalSignature(id, sigId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const sig = (license.digitalSignatures || []).id(sigId);
    if (!sig) throw new AppError('التوقيع غير موجود', 404);

    sig.isVerified = true;
    sig.verifiedAt = new Date();
    license.addAuditEntry('updated', userId, `تحقق من توقيع: ${sig.signerName}`);
    await license.save();
    return sig;
  }

  /** سلسلة التوقيعات المطلوبة */
  async getSignatureChain(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'digitalSignatures'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const sigs = license.digitalSignatures || [];
    return {
      total: sigs.length,
      verified: sigs.filter(s => s.isVerified).length,
      pending: sigs.filter(s => !s.isVerified).length,
      chain: sigs
        .sort((a, b) => new Date(a.signedAt) - new Date(b.signedAt))
        .map(s => ({
          signer: s.signerName,
          type: s.signatureType,
          signed: s.signedAt,
          verified: s.isVerified,
        })),
    };
  }

  // ====================================================================
  //  Round 5 — Feature 4: الاجتماعات والمراجعات (Meetings & Reviews)
  // ====================================================================

  /** إضافة اجتماع */
  async addMeeting(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const meeting = { ...data, createdBy: userId, createdAt: new Date() };
    license.meetings.push(meeting);
    license.addAuditEntry('updated', userId, `اجتماع جديد: ${data.title}`);
    await license.save();
    return license.meetings[license.meetings.length - 1];
  }

  /** جلب الاجتماعات */
  async getMeetings(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'meetings center'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.meetings.sort(
      (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );
  }

  /** تحديث اجتماع */
  async updateMeeting(id, meetingId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const meeting = (license.meetings || []).id(meetingId);
    if (!meeting) throw new AppError('الاجتماع غير موجود', 404);

    Object.assign(meeting, data);
    license.addAuditEntry('updated', userId, `تحديث اجتماع: ${meeting.title}`);
    await license.save();
    return meeting;
  }

  /** تحديث قرار اجتماع */
  async updateMeetingDecision(id, meetingId, decisionIndex, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const meeting = (license.meetings || []).id(meetingId);
    if (!meeting) throw new AppError('الاجتماع غير موجود', 404);
    if (!meeting.decisions[decisionIndex]) throw new AppError('القرار غير موجود', 404);

    Object.assign(meeting.decisions[decisionIndex], data);
    license.addAuditEntry('updated', userId, `تحديث قرار: ${meeting.title}`);
    await license.save();
    return meeting.decisions[decisionIndex];
  }

  /** تقويم الاجتماعات عبر جميع التراخيص */
  async getGlobalMeetingsCalendar(filters) {
    const query = { isDeleted: false, 'meetings.0': { $exists: true } };
    if (filters.startDate || filters.endDate) {
      query['meetings.date'] = {};
      if (filters.startDate) query['meetings.date'].$gte = new Date(filters.startDate);
      if (filters.endDate) query['meetings.date'].$lte = new Date(filters.endDate);
    }
    const licenses = await RehabCenterLicense.find(query).select('meetings center');
    const cal = [];
    for (const lic of licenses) {
      for (const m of lic.meetings || []) {
        cal.push({ licenseId: lic._id, center: lic.center, ...m.toObject() });
      }
    }
    return cal.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  // ====================================================================
  //  Round 5 — Feature 5: الربط الخارجي (External Integrations)
  // ====================================================================

  /** إضافة ربط خارجي */
  async addExternalIntegration(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.externalIntegrations.push({ ...data, createdAt: new Date() });
    license.addAuditEntry('updated', userId, `ربط خارجي جديد: ${data.systemName}`);
    await license.save();
    return license.externalIntegrations[license.externalIntegrations.length - 1];
  }

  /** جلب الربط الخارجي */
  async getExternalIntegrations(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'externalIntegrations center'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.externalIntegrations;
  }

  /** تحديث حالة المزامنة */
  async updateIntegrationSync(id, integId, syncData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const integ = (license.externalIntegrations || []).id(integId);
    if (!integ) throw new AppError('الربط غير موجود', 404);

    integ.syncStatus = syncData.syncStatus || integ.syncStatus;
    integ.lastSyncAt = new Date();
    integ.lastSyncResult = syncData.result || '';
    license.addAuditEntry('updated', userId, `مزامنة: ${integ.systemName} → ${integ.syncStatus}`);
    await license.save();
    return integ;
  }

  /** حذف ربط خارجي */
  async removeExternalIntegration(id, integId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const integ = (license.externalIntegrations || []).id(integId);
    if (!integ) throw new AppError('الربط غير موجود', 404);

    integ.isActive = false;
    license.addAuditEntry('updated', userId, `إزالة ربط: ${integ.systemName}`);
    await license.save();
    return { message: 'تم إزالة الربط' };
  }

  // ====================================================================
  //  Round 5 — Feature 6: التدريب والتأهيل (Training & Qualification)
  // ====================================================================

  /** إضافة سجل تدريب */
  async addTrainingRecord(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.trainingRecords.push({ ...data, createdAt: new Date() });
    license.addAuditEntry('updated', userId, `تدريب جديد: ${data.title}`);
    await license.save();
    return license.trainingRecords[license.trainingRecords.length - 1];
  }

  /** جلب سجلات التدريب */
  async getTrainingRecords(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'trainingRecords center'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.trainingRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /** تحديث سجل تدريب */
  async updateTrainingRecord(id, recordId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const rec = (license.trainingRecords || []).id(recordId);
    if (!rec) throw new AppError('سجل التدريب غير موجود', 404);

    Object.assign(rec, data);
    license.addAuditEntry('updated', userId, `تحديث تدريب: ${rec.title}`);
    await license.save();
    return rec;
  }

  /** تحليل فجوات التدريب */
  async analyzeTrainingGaps(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'trainingRecords'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const records = license.trainingRecords || [];
    const now = new Date();
    const expiringSoon = records.filter(
      r =>
        r.certificateExpiry &&
        new Date(r.certificateExpiry) <= new Date(now.getTime() + 90 * 86400000)
    );
    const required = records.filter(r => r.isRequired);
    const incomplete = required.filter(r => r.status !== 'completed');

    return {
      totalRecords: records.length,
      completed: records.filter(r => r.status === 'completed').length,
      inProgress: records.filter(r => r.status === 'in_progress').length,
      planned: records.filter(r => r.status === 'planned').length,
      requiredTotal: required.length,
      requiredIncomplete: incomplete.length,
      certExpiringSoon: expiringSoon.map(r => ({
        title: r.title,
        employee: r.employeeName,
        expiry: r.certificateExpiry,
      })),
      complianceRate: required.length
        ? +(
            (required.filter(r => r.status === 'completed').length / required.length) *
            100
          ).toFixed(1)
        : 100,
    };
  }

  /** حالة التدريب عبر جميع التراخيص */
  async getGlobalTrainingStatus() {
    const licenses = await RehabCenterLicense.find({ isDeleted: false }).select(
      'trainingRecords center'
    );
    const summary = [];
    for (const lic of licenses) {
      const recs = lic.trainingRecords || [];
      if (recs.length === 0) continue;
      const required = recs.filter(r => r.isRequired);
      summary.push({
        licenseId: lic._id,
        center: lic.center,
        total: recs.length,
        completed: recs.filter(r => r.status === 'completed').length,
        complianceRate: required.length
          ? +(
              (required.filter(r => r.status === 'completed').length / required.length) *
              100
            ).toFixed(1)
          : 100,
      });
    }
    return summary.sort((a, b) => a.complianceRate - b.complianceRate);
  }

  // ====================================================================
  //  Round 5 — Feature 7: ويدجت لوحة المعلومات (Dashboard Widgets)
  // ====================================================================

  /** تحديث ويدجت لوحة المعلومات */
  async updateDashboardWidgets(id, widgetsData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.dashboardWidgets = {
      ...widgetsData,
      lastCustomized: new Date(),
      customizedBy: userId,
    };
    license.addAuditEntry('updated', userId, 'تحديث ويدجت لوحة المعلومات');
    await license.save();
    return license.dashboardWidgets;
  }

  /** جلب ويدجت لوحة المعلومات */
  async getDashboardWidgets(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'dashboardWidgets'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.dashboardWidgets || { layout: 'default', widgets: [] };
  }

  // ====================================================================
  //  Round 5 — Feature 8: الإصلاح التلقائي (Auto-Remediation)
  // ====================================================================

  /** إضافة إجراء إصلاحي */
  async addRemediationAction(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.remediationActions.push({ ...data, createdBy: userId, createdAt: new Date() });
    license.addAuditEntry('updated', userId, `إجراء إصلاحي: ${data.actionType}`);
    await license.save();
    return license.remediationActions[license.remediationActions.length - 1];
  }

  /** جلب إجراءات الإصلاح */
  async getRemediationActions(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'remediationActions center'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.remediationActions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /** تنفيذ إجراء إصلاحي */
  async executeRemediation(id, actionId, result, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const action = (license.remediationActions || []).id(actionId);
    if (!action) throw new AppError('الإجراء غير موجود', 404);

    action.executed = true;
    action.executedAt = new Date();
    action.result = result || 'تم التنفيذ';
    license.addAuditEntry('updated', userId, `تنفيذ إصلاح: ${action.actionType}`);
    await license.save();
    return action;
  }

  /** تشغيل المسح التلقائي وإنشاء إجراءات */
  async runAutoRemediation(userId) {
    const licenses = await RehabCenterLicense.find({ isDeleted: false });
    const actions = [];
    const now = new Date();

    for (const license of licenses) {
      const newActions = [];

      // فحص التراخيص المنتهية
      if (license.endDate && new Date(license.endDate) < now && license.status !== 'expired') {
        newActions.push({
          triggerCondition: 'expired',
          actionType: 'auto_renew_request',
          description: 'ترخيص منتهي - طلب تجديد تلقائي',
          isAutomatic: true,
          priority: 'critical',
          createdBy: userId,
        });
      }

      // فحص المهام المتأخرة
      const overdueTasks = (license.tasks || []).filter(
        t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now
      );
      if (overdueTasks.length > 0) {
        newActions.push({
          triggerCondition: 'overdue_task',
          actionType: 'escalate',
          description: `${overdueTasks.length} مهام متأخرة`,
          isAutomatic: true,
          priority: 'high',
          createdBy: userId,
        });
      }

      if (newActions.length > 0) {
        license.remediationActions.push(...newActions);
        license.addAuditEntry('updated', userId, `إصلاح تلقائي: ${newActions.length} إجراءات`);
        await license.save();
        actions.push({
          licenseId: license._id,
          center: license.center,
          newActions: newActions.length,
        });
      }
    }
    return {
      scanned: licenses.length,
      actionsCreated: actions.reduce((s, a) => s + a.newActions, 0),
      details: actions,
    };
  }

  // ====================================================================
  //  Round 5 — Feature 9: الموردين والمقاولين (Vendors & Contractors)
  // ====================================================================

  /** إضافة مورد */
  async addVendor(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    license.vendors.push({ ...data, createdAt: new Date() });
    license.addAuditEntry('updated', userId, `مورد جديد: ${data.vendorName}`);
    await license.save();
    return license.vendors[license.vendors.length - 1];
  }

  /** جلب الموردين */
  async getVendors(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'vendors center'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.vendors;
  }

  /** تحديث مورد */
  async updateVendor(id, vendorId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const vendor = (license.vendors || []).id(vendorId);
    if (!vendor) throw new AppError('المورد غير موجود', 404);

    Object.assign(vendor, data);
    license.addAuditEntry('updated', userId, `تحديث مورد: ${vendor.vendorName}`);
    await license.save();
    return vendor;
  }

  /** حذف مورد */
  async removeVendor(id, vendorId, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const vendor = (license.vendors || []).id(vendorId);
    if (!vendor) throw new AppError('المورد غير موجود', 404);

    vendor.status = 'inactive';
    license.addAuditEntry('updated', userId, `إزالة مورد: ${vendor.vendorName}`);
    await license.save();
    return { message: 'تم إزالة المورد' };
  }

  /** تقييم الموردين عبر جميع التراخيص */
  async getGlobalVendorRatings() {
    const licenses = await RehabCenterLicense.find({ isDeleted: false }).select('vendors');
    const vendorMap = {};
    for (const lic of licenses) {
      for (const v of lic.vendors || []) {
        const key = v.vendorName;
        if (!vendorMap[key])
          vendorMap[key] = {
            name: key,
            type: v.vendorType,
            ratings: [],
            contracts: 0,
            totalValue: 0,
          };
        vendorMap[key].contracts += 1;
        vendorMap[key].totalValue += v.contractValue || 0;
        if (v.rating) vendorMap[key].ratings.push(v.rating);
      }
    }
    return Object.values(vendorMap)
      .map(v => ({
        ...v,
        avgRating: v.ratings.length
          ? +(v.ratings.reduce((s, r) => s + r, 0) / v.ratings.length).toFixed(2)
          : 0,
        ratings: undefined,
      }))
      .sort((a, b) => b.avgRating - a.avgRating);
  }

  // ====================================================================
  //  Round 5 — Feature 10: الشكاوى والمقترحات (Complaints & Suggestions)
  // ====================================================================

  /** إضافة شكوى أو مقترح */
  async addComplaint(id, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const complaint = {
      ...data,
      complaintNumber: `CMP-${Date.now().toString(36).toUpperCase()}`,
      submittedAt: new Date(),
    };
    license.complaints.push(complaint);
    license.addAuditEntry(
      'updated',
      userId,
      `${data.isSuggestion ? 'مقترح' : 'شكوى'} جديد: ${data.subject}`
    );
    await license.save();
    return license.complaints[license.complaints.length - 1];
  }

  /** جلب الشكاوى والمقترحات */
  async getComplaints(id) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false }).select(
      'complaints center'
    );
    if (!license) throw new AppError('الترخيص غير موجود', 404);
    return license.complaints.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  /** تحديث شكوى */
  async updateComplaint(id, complaintId, data, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const complaint = (license.complaints || []).id(complaintId);
    if (!complaint) throw new AppError('الشكوى غير موجودة', 404);

    Object.assign(complaint, data);
    if (data.status === 'resolved' && !complaint.resolvedAt) complaint.resolvedAt = new Date();
    license.addAuditEntry('updated', userId, `تحديث شكوى: ${complaint.subject}`);
    await license.save();
    return complaint;
  }

  /** إضافة رد على شكوى */
  async addComplaintResponse(id, complaintId, responseData, userId) {
    const license = await RehabCenterLicense.findOne({ _id: id, isDeleted: false });
    if (!license) throw new AppError('الترخيص غير موجود', 404);

    const complaint = (license.complaints || []).id(complaintId);
    if (!complaint) throw new AppError('الشكوى غير موجودة', 404);

    complaint.responses.push({ ...responseData, respondedAt: new Date() });
    if (complaint.status === 'open') complaint.status = 'under_review';
    license.addAuditEntry('updated', userId, `رد على شكوى: ${complaint.subject}`);
    await license.save();
    return complaint;
  }

  /** تحليل الشكاوى عبر جميع التراخيص */
  async getGlobalComplaintAnalytics() {
    const licenses = await RehabCenterLicense.find({ isDeleted: false }).select(
      'complaints center'
    );
    const all = [];
    for (const lic of licenses) {
      for (const c of lic.complaints || []) {
        all.push({ ...c.toObject(), center: lic.center });
      }
    }
    const complaints = all.filter(c => !c.isSuggestion);
    const suggestions = all.filter(c => c.isSuggestion);

    return {
      totalComplaints: complaints.length,
      totalSuggestions: suggestions.length,
      complaintsByStatus: complaints.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {}),
      complaintsByType: complaints.reduce((acc, c) => {
        acc[c.complaintType] = (acc[c.complaintType] || 0) + 1;
        return acc;
      }, {}),
      avgResolutionDays: (() => {
        const resolved = complaints.filter(c => c.resolvedAt && c.submittedAt);
        if (resolved.length === 0) return 0;
        const total = resolved.reduce(
          (s, c) => s + (new Date(c.resolvedAt) - new Date(c.submittedAt)) / 86400000,
          0
        );
        return +(total / resolved.length).toFixed(1);
      })(),
    };
  }
}

module.exports = new RehabCenterLicenseService();

/**
 * License Service - خدمة إدارة الرخص الشاملة
 * Advanced License Management Service Backend
 * 
 * توفير جميع العمليات على الرخص بما فيها:
 * - CRUD operations
 * - التحقق والتحقق الشامل
 * - إدارة التجديدات
 * - إدارة المستندات
 * - إدارة التنبيهات
 * - التقارير والإحصائيات
 * - التدقيق الكامل
 */

const License = require('../models/LicenseEnhanced');
const LicenseAuditLog = require('../models/LicenseAuditLog');
const LicenseDocument = require('../models/LicenseDocument');
const LicenseAlert = require('../models/LicenseAlert');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

class LicenseService {
  // ==================== CRUD OPERATIONS ====================

  /**
   * إنشاء رخصة جديدة
   */
  async createLicense(licenseData, userId) {
    try {
      // التحقق من عدم تكرار رقم الرخصة
      const existing = await License.findOne({
        licenseNumber: licenseData.licenseNumber
      });

      if (existing) {
        throw new AppError('رقم الرخصة موجود بالفعل', 400);
      }

      // إنشاء السجل
      const license = new License({
        ...licenseData,
        metadata: {
          ...licenseData.metadata,
          createdBy: userId,
          version: 1
        }
      });

      await license.save();

      // تسجيل في سجل التدقيق
      await this.logAuditAction('CREATE', license._id, licenseData.licenseNumber, {
        action_description: 'تم إنشاء رخصة جديدة',
        details: licenseData
      }, userId, 'success');

      logger.info(`License created: ${license.licenseNumber}`, { userId });
      return license;
    } catch (error) {
      logger.error('Error creating license:', error);
      throw error;
    }
  }

  /**
   * الحصول على رخصة بواسطة المعرّف
   */
  async getLicenseById(licenseId) {
    try {
      const license = await License.findById(licenseId)
        .populate('documents')
        .lean();

      if (!license) {
        throw new AppError('الرخصة غير موجودة', 404);
      }

      return license;
    } catch (error) {
      logger.error('Error fetching license:', error);
      throw error;
    }
  }

  /**
   * الحصول على رخصة بواسطة رقم الرخصة
   */
  async getLicenseByNumber(licenseNumber) {
    try {
      return await License.findOne({ licenseNumber })
        .populate('documents')
        .lean();
    } catch (error) {
      logger.error('Error fetching license by number:', error);
      throw error;
    }
  }

  /**
   * البحث عن الرخص مع الفلترة والترتيب
   */
  async searchLicenses(filters = {}, options = {}) {
    try {
      const {
        search = '',
        status = null,
        licenseType = null,
        expiringWithin = null,
        page = 1,
        limit = 20,
        sortBy = 'dates.expiry',
        sortOrder = 'asc'
      } = options;

      const query = {};

      // البحث النصي
      if (search) {
        query.$or = [
          { licenseNumber: { $regex: search, $options: 'i' } },
          { 'entity.name': { $regex: search, $options: 'i' } },
          { 'entity.idNumber': { $regex: search, $options: 'i' } }
        ];
      }

      // الفلترة حسب الحالة
      if (status) {
        query.status = status;
      }

      // الفلترة حسب نوع الرخصة
      if (licenseType) {
        query.licenseType = licenseType;
      }

      // الفلترة حسب الرخص القريبة الانتهاء
      if (expiringWithin) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + expiringWithin);

        query['dates.expiry'] = {
          $gte: today,
          $lte: futureDate
        };
      }

      // تطبيق الفلاتر الإضافية
      Object.keys(filters).forEach(key => {
        if (key.startsWith('entity.') || key.startsWith('dates.')) {
          query[key] = filters[key];
        }
      });

      // حساب عدد النتائج الكلية
      const total = await License.countDocuments(query);

      // تنفيذ الاستعلام مع الترتيب والتصفح
      const skip = (page - 1) * limit;
      const sortObject = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const licenses = await License.find(query)
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        data: licenses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching licenses:', error);
      throw error;
    }
  }

  /**
   * تحديث رخصة
   */
  async updateLicense(licenseId, updateData, userId) {
    try {
      const license = await License.findById(licenseId);

      if (!license) {
        throw new AppError('الرخصة غير موجودة', 404);
      }

      // نسخ البيانات الأصلية قبل التحديث
      const originalData = { ...license.toObject() };

      // تحديد الحقول التي يمكن تحديثها
      const allowedFields = [
        'licenseType',
        'entity',
        'issuingAuthority',
        'dates',
        'costs',
        'requirements',
        'tags',
        'categories',
        'notes'
      ];

      // تطبيق التحديثات
      allowedFields.forEach(field => {
        if (updateData[field]) {
          license[field] = updateData[field];
        }
      });

      license.metadata.lastModifiedBy = userId;
      license.metadata.version++;
      license.dates.lastUpdated = new Date();

      await license.save();

      // تسجيل في سجل التدقيق
      await this.logAuditAction(
        'UPDATE',
        license._id,
        license.licenseNumber,
        {
          before: originalData,
          after: license.toObject(),
          changedFields: this.getChangedFields(originalData, license.toObject())
        },
        userId,
        'success'
      );

      logger.info(`License updated: ${license.licenseNumber}`, { userId });
      return license;
    } catch (error) {
      logger.error('Error updating license:', error);
      throw error;
    }
  }

  /**
   * حذف رخصة
   */
  async deleteLicense(licenseId, reason = '', userId) {
    try {
      const license = await License.findById(licenseId);

      if (!license) {
        throw new AppError('الرخصة غير موجودة', 404);
      }

      // حذف ناعم
      license.status = 'inactive';
      license.metadata.lastModifiedBy = userId;
      await license.save();

      // تسجيل في سجل التدقيق
      await this.logAuditAction(
        'DELETE',
        license._id,
        license.licenseNumber,
        { reason },
        userId,
        'success'
      );

      logger.info(`License deleted: ${license.licenseNumber}`, { userId });
      return { success: true, message: 'تم حذف الرخصة بنجاح' };
    } catch (error) {
      logger.error('Error deleting license:', error);
      throw error;
    }
  }

  // ==================== VERIFICATION & VALIDATION ====================

  /**
   * التحقق الشامل من الرخصة
   */
  async verifyLicense(licenseId, userId) {
    try {
      const license = await License.findById(licenseId);

      if (!license) {
        throw new AppError('الرخصة غير موجودة', 404);
      }

      const verificationResults = {
        format: await this.verifyLicenseFormat(license),
        documents: await this.verifyRequiredDocuments(licenseId),
        compliance: await this.checkCompliance(licenseId),
        government: await this.verifyWithGovernment(license) // قد تكون موجودة أو لا
      };

      // تحديث حالة التحقق
      license.verification = {
        verified: true,
        lastVerificationDate: new Date(),
        verificationType: 'automatic',
        verificationResult: this.determineVerificationResult(verificationResults),
        verificationNotes: JSON.stringify(verificationResults)
      };

      await license.save();

      // تسجيل التدقيق
      await this.logAuditAction(
        'VERIFY',
        license._id,
        license.licenseNumber,
        { verificationResults },
        userId,
        'success'
      );

      return verificationResults;
    } catch (error) {
      logger.error('Error verifying license:', error);
      throw error;
    }
  }

  /**
   * التحقق من صيغة الرخصة
   */
  async verifyLicenseFormat(license) {
    try {
      const validations = {
        licenseNumber: /^[A-Z0-9\-]{5,50}$/.test(license.licenseNumber),
        entityName: license.entity.name && license.entity.name.length > 0,
        idNumber: license.entity.idNumber && license.entity.idNumber.length >= 9,
        issuingAuthority: !!license.issuingAuthority.name,
        datesValid: new Date(license.dates.issued) < new Date(license.dates.expiry)
      };

      return {
        isValid: Object.values(validations).every(v => v),
        details: validations
      };
    } catch (error) {
      logger.error('Error verifying license format:', error);
      return {
        isValid: false,
        details: { error: error.message }
      };
    }
  }

  /**
   * التحقق من المستندات المطلوبة
   */
  async verifyRequiredDocuments(licenseId) {
    try {
      const license = await License.findById(licenseId);
      const documents = await LicenseDocument.find({
        licenseId,
        'review.status': 'approved'
      });

      const requiredDocs = license.requirements.requiredDocuments || [];
      const submittedDocs = documents.map(d => d.classification.type);

      const missing = requiredDocs.filter(
        req => !submittedDocs.includes(req.name)
      );

      return {
        total: requiredDocs.length,
        submitted: documents.length,
        missing: missing.length,
        missingDocuments: missing,
        isComplete: missing.length === 0
      };
    } catch (error) {
      logger.error('Error verifying documents:', error);
      return {
        total: 0,
        submitted: 0,
        missing: 0,
        isComplete: false,
        error: error.message
      };
    }
  }

  /**
   * التحقق من الامتثال
   */
  async checkCompliance(licenseId) {
    try {
      const license = await License.findById(licenseId);

      return {
        status: license.compliance.status,
        violations: license.compliance.violations.length,
        criticalViolations: license.compliance.violations.filter(
          v => v.severity === 'critical'
        ).length,
        isCompliant: license.compliance.status === 'compliant'
      };
    } catch (error) {
      logger.error('Error checking compliance:', error);
      return {
        status: 'unknown',
        violations: 0,
        criticalViolations: 0,
        isCompliant: false,
        error: error.message
      };
    }
  }

  // ==================== RENEWAL MANAGEMENT ====================

  /**
   * تجديد الرخصة
   */
  async renewLicense(licenseId, renewalData, userId) {
    try {
      const license = await License.findById(licenseId);

      if (!license) {
        throw new AppError('الرخصة غير موجودة', 404);
      }

      if (license.isExpired()) {
        throw new AppError('لا يمكن تجديد رخصة منتهية الصلاحية بدون إجراءات إضافية', 400);
      }

      // حساب تاريخ الصلاحية الجديدة
      const renewalPeriod = this.getRenewalPeriodDays(license.licenseType);
      const newExpiryDate = new Date(renewalData.newExpiryDate);

      // تجديد الرخصة
      license.renew(newExpiryDate, {
        notes: renewalData.notes,
        renewedBy: userId,
        documents: renewalData.documents || []
      });

      license.status = 'active';
      await license.save();

      // تسجيل التدقيق
      await this.logAuditAction(
        'RENEW',
        license._id,
        license.licenseNumber,
        {
          oldExpiryDate: license.dates.expiry,
          newExpiryDate: newExpiryDate,
          renewalCost: renewalData.cost || license.costs.renewalFee
        },
        userId,
        'success'
      );

      // حذف التنبيهات ذات الصلة
      await LicenseAlert.deleteMany({
        licenseId,
        type: { $regex: 'expiry' }
      });

      logger.info(`License renewed: ${license.licenseNumber}`, { userId });
      return license;
    } catch (error) {
      logger.error('Error renewing license:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجل التجديدات
   */
  async getRenewalHistory(licenseId) {
    try {
      const license = await License.findById(licenseId);

      if (!license) {
        throw new AppError('الرخصة غير موجودة', 404);
      }

      return license.renewalHistory;
    } catch (error) {
      logger.error('Error fetching renewal history:', error);
      throw error;
    }
  }

  // ==================== ALERT MANAGEMENT ====================

  /**
   * إنشاء تنبيهات تلقائية
   */
  async createAutomatedAlerts() {
    try {
      const alerts = [];

      // البحث عن الرخص القريبة الانتهاء
      const expiringLicenses = await License.findExpiringsoon(90);

      for (const license of expiringLicenses) {
        const daysUntilExpiry = license.daysUntilExpiry;

        // تحديد نوع التنبيه بناءً على عدد الأيام
        let alertType;
        if (daysUntilExpiry <= 7) alertType = 'expiry_7_days';
        else if (daysUntilExpiry <= 15) alertType = 'expiry_15_days';
        else if (daysUntilExpiry <= 30) alertType = 'expiry_30_days';
        else if (daysUntilExpiry <= 60) alertType = 'expiry_60_days';
        else alertType = 'expiry_90_days';

        // التحقق من عدم وجود تنبيه مماثل
        const existing = await LicenseAlert.findOne({
          licenseId: license._id,
          type: alertType,
          'status.current': 'active'
        });

        if (!existing) {
          const alert = new LicenseAlert({
            licenseId: license._id,
            licenseNumber: license.licenseNumber,
            title: `تنبيه: الرخصة تنتهي بعد ${daysUntilExpiry} يوم`,
            description: `الرخصة "${license.entity.name}" ستنتهي صلاحيتها في ${license.dates.expiry.toLocaleDateString('ar')}`,
            type: alertType,
            priority: this.calculateAlertPriority(daysUntilExpiry),
            recipients: {
              roles: ['license_manager', 'admin']
            },
            recommendedActions: [
              {
                description: 'بدء عملية التجديد',
                priority: 'high',
                responsibleRole: 'license_manager',
                dueDate: new Date(license.dates.expiry.getTime() - 7 * 24 * 60 * 60 * 1000)
              }
            ]
          });

          await alert.save();
          alerts.push(alert);
        }
      }

      logger.info(`Created ${alerts.length} automated alerts`);
      return alerts;
    } catch (error) {
      logger.error('Error creating automated alerts:', error);
      throw error;
    }
  }

  /**
   * الحصول على التنبيهات النشطة
   */
  async getActiveAlerts(licenseId = null) {
    try {
      if (licenseId) {
        return await LicenseAlert.find({
          licenseId,
          'status.current': 'active'
        }).sort({ priority: -1 });
      }

      return await LicenseAlert.find({
        'status.current': 'active'
      }).sort({ priority: -1, 'timing.createdAt': -1 });
    } catch (error) {
      logger.error('Error fetching active alerts:', error);
      throw error;
    }
  }

  // ==================== AUDIT & LOGGING ====================

  /**
   * تسجيل إجراء في سجل التدقيق
   */
  async logAuditAction(
    action,
    licenseId,
    licenseNumber,
    details = {},
    userId,
    status = 'success',
    errorMessage = null
  ) {
    try {
      const auditLog = new LicenseAuditLog({
        licenseId,
        licenseNumber,
        action,
        description: details.action_description || action,
        changes: details,
        user: {
          userId,
          // يمكن إضافة المزيد من معلومات المستخدم
        },
        result: {
          status,
          message: details.message,
          errorMessage
        }
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      logger.error('Error logging audit action:', error);
      // لا نرمي خطأ هنا لأن التدقيق لا يجب أن يوقف العملية الرئيسية
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * تحديد نتيجة التحقق
   */
  determineVerificationResult(results) {
    if (!results.format.isValid) return 'invalid';
    if (!results.documents.isComplete) return 'pending';
    if (!results.compliance.isCompliant) return 'invalid';
    return 'valid';
  }

  /**
   * حساب أولوية التنبيه
   */
  calculateAlertPriority(daysUntilExpiry) {
    if (daysUntilExpiry <= 3) return 'critical';
    if (daysUntilExpiry <= 7) return 'high';
    if (daysUntilExpiry <= 30) return 'medium';
    return 'low';
  }

  /**
   * الحصول على فترة التجديد بالأيام
   */
  getRenewalPeriodDays(licenseType) {
    const periods = {
      'CR': 365,
      'ML': 365,
      'CD': 365,
      'HC': 365,
      'FL': 365,
      'DL': 1461, // 4 سنوات
      'BANK': 365,
      'INSURANCE': 365,
      'SCFHS': 365,
      'QIWA': 365,
      'SAMA': 365
    };

    return periods[licenseType] || 365;
  }

  /**
   * الحصول على الحقول المتغيرة
   */
  getChangedFields(before, after) {
    const changed = [];

    Object.keys(after).forEach(key => {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changed.push(key);
      }
    });

    return changed;
  }

  /**
   * التحقق مع الحكومة (placeholder)
   */
  async verifyWithGovernment(license) {
    // سيتم تنفيذه لاحقاً مع التكامل الحكومي
    return {
      status: 'pending',
      message: 'Awaiting government integration setup'
    };
  }

  // ==================== STATISTICS ====================

  /**
   * الحصول على إحصائيات عامة
   */
  async getStatistics() {
    try {
      const stats = await License.getStatistics();
      const expiringLicenses = await License.findExpiringsoon(30);
      const expiredLicenses = await License.findExpired();
      const alerts = await LicenseAlert.getAlertStatistics();

      return {
        licenses: stats,
        expiringCount: expiringLicenses.length,
        expiredCount: expiredLicenses.length,
        activeAlerts: alerts.length
      };
    } catch (error) {
      logger.error('Error fetching statistics:', error);
      throw error;
    }
  }
}

module.exports = new LicenseService();

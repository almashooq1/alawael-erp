/**
 * PdplService — خدمة الامتثال لنظام حماية البيانات الشخصية السعودي (PDPL)
 *
 * نظام حماية البيانات الشخصية (PDPL) — الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA)
 *
 * يشمل:
 * - سجل أنشطة المعالجة (مادة 32)
 * - إدارة الموافقة (مادة 6)
 * - معالجة طلبات أصحاب البيانات (مادة 4) — الوصول / التصحيح / المحو / النقل
 * - حق المحو مع الاحتفاظ بالسجلات القانونية
 * - الإبلاغ عن خرق البيانات (مادة 20)
 * - فترات الاحتفاظ بالبيانات
 *
 * @module services/pdpl
 */
'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ─── نماذج PDPL (inline schemas) ─────────────────────────────────────────────
const { Schema } = mongoose;

// سجل أنشطة المعالجة
const dataProcessingRecordSchema = new Schema(
  {
    purpose: { type: String, required: true },
    dataCategory: { type: String, required: true },
    legalBasis: { type: String, required: true },
    dataSubjectsCategory: { type: String, default: 'beneficiaries/employees' },
    recipientCategory: { type: String },
    crossBorderTransfer: { type: String },
    retentionPeriod: { type: String },
    securityMeasures: { type: String },
    recordedAt: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// سجل الموافقة
const consentRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, required: true },
    dataTypes: [{ type: String }],
    consentGiven: { type: Boolean, default: true },
    consentDate: { type: Date, default: Date.now },
    withdrawalDate: { type: Date },
    expiresAt: { type: Date },
    ipAddress: { type: String },
    userAgent: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// طلبات أصحاب البيانات
const dataSubjectRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestType: {
      type: String,
      enum: ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'],
      required: true,
    },
    status: {
      type: String,
      enum: ['received', 'in_progress', 'completed', 'rejected', 'extended'],
      default: 'received',
    },
    receivedAt: { type: Date, default: Date.now },
    deadline: { type: Date }, // 30 يوماً من الاستلام
    completedAt: { type: Date },
    rejectionReason: { type: String },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    exportedData: { type: Schema.Types.Mixed }, // للتصدير
  },
  { timestamps: true }
);

// حوادث خرق البيانات
const dataBreachIncidentSchema = new Schema(
  {
    description: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    affectedRecords: { type: Number, default: 0 },
    dataTypesAffected: [{ type: String }],
    detectedAt: { type: Date, default: Date.now },
    reportedToSdaia: { type: Boolean, default: false },
    reportedToSdaiaAt: { type: Date },
    affectedNotified: { type: Boolean, default: false },
    affectedNotifiedAt: { type: Date },
    rootCause: { type: String },
    remediation: { type: String },
    status: {
      type: String,
      enum: ['open', 'investigating', 'contained', 'closed'],
      default: 'open',
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ─── تسجيل النماذج بأمان ─────────────────────────────────────────────────────
const DataProcessingRecord =
  mongoose.models.DataProcessingRecord ||
  mongoose.model('DataProcessingRecord', dataProcessingRecordSchema);

const ConsentRecord =
  mongoose.models.ConsentRecord || mongoose.model('ConsentRecord', consentRecordSchema);

const DataSubjectRequest =
  mongoose.models.DataSubjectRequest ||
  mongoose.model('DataSubjectRequest', dataSubjectRequestSchema);

const DataBreachIncident =
  mongoose.models.DataBreachIncident ||
  mongoose.model('DataBreachIncident', dataBreachIncidentSchema);

// ─── فترات الاحتفاظ بالبيانات ─────────────────────────────────────────────
const RETENTION_PERIODS = {
  financial_records: '10 years', // متطلبات ZATCA
  employee_records: '5 years', // متطلبات قانون العمل
  medical_records: '10 years', // متطلبات وزارة الصحة
  insurance_claims: '5 years', // متطلبات CHI
  audit_logs: '7 years', // أفضل ممارسة
  session_recordings: '3 years',
  consent_records: 'duration_of_processing + 3 years',
  beneficiary_records: '10 years',
};

// ─── الحقول الحساسة التي تُخفى في السجلات ─────────────────────────────────
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'privateKey',
  'token',
  'nationalId',
  'iqamaNumber',
  'bankAccount',
  'iban',
  'creditCard',
];

class PdplService {
  // =========================================================================
  // سجل أنشطة المعالجة (مادة 32)
  // =========================================================================

  async recordProcessingActivity(data) {
    const {
      purpose,
      dataCategory,
      legalBasis,
      recipientCategory,
      crossBorderTransfer,
      recordedBy,
    } = data;

    return DataProcessingRecord.create({
      purpose,
      dataCategory,
      legalBasis,
      recipientCategory,
      crossBorderTransfer,
      retentionPeriod: RETENTION_PERIODS[dataCategory] || '5 years',
      securityMeasures: 'encryption_at_rest,encryption_in_transit,access_control,audit_logging',
      recordedBy,
    });
  }

  async getProcessingRecords(filters = {}) {
    const query = {};
    if (filters.dataCategory) query.dataCategory = filters.dataCategory;
    if (filters.legalBasis) query.legalBasis = filters.legalBasis;
    return DataProcessingRecord.find(query).sort({ createdAt: -1 }).lean();
  }

  // =========================================================================
  // إدارة الموافقة (مادة 6)
  // =========================================================================

  async recordConsent(userId, purpose, dataTypes, expiresAt, req) {
    return ConsentRecord.create({
      userId,
      purpose,
      dataTypes,
      consentGiven: true,
      consentDate: new Date(),
      expiresAt: expiresAt || null,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'],
      userAgent: req?.headers?.['user-agent']?.substring(0, 500),
    });
  }

  async withdrawConsent(userId, purpose) {
    return ConsentRecord.findOneAndUpdate(
      { userId, purpose, isActive: true },
      { isActive: false, withdrawalDate: new Date(), consentGiven: false },
      { new: true }
    );
  }

  async getUserConsents(userId) {
    return ConsentRecord.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async checkActiveConsent(userId, purpose) {
    const consent = await ConsentRecord.findOne({
      userId,
      purpose,
      isActive: true,
      consentGiven: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).lean();
    return !!consent;
  }

  // =========================================================================
  // طلبات أصحاب البيانات (مادة 4) — 30 يوماً للرد
  // =========================================================================

  async handleDataSubjectRequest(userId, requestType, notes) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const request = await DataSubjectRequest.create({
      userId,
      requestType,
      status: 'received',
      receivedAt: new Date(),
      deadline,
      notes,
    });

    logger.info(
      `[PDPL] Data subject request: userId=${userId} type=${requestType} id=${request._id}`
    );
    return request;
  }

  async updateRequestStatus(requestId, status, handledBy, notes) {
    const update = { status, handledBy, notes };
    if (['completed', 'rejected'].includes(status)) update.completedAt = new Date();
    return DataSubjectRequest.findByIdAndUpdate(requestId, update, { new: true });
  }

  async getDataSubjectRequests(filters = {}) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.status) query.status = filters.status;
    if (filters.requestType) query.requestType = filters.requestType;
    return DataSubjectRequest.find(query).sort({ receivedAt: -1 }).lean();
  }

  // =========================================================================
  // تصدير بيانات المستخدم (حق الوصول)
  // =========================================================================

  async exportUserData(userId) {
    const User = mongoose.models.User;
    const user = User ? await User.findById(userId).lean() : null;

    // إخفاء الحقول الحساسة
    if (user) {
      for (const field of SENSITIVE_FIELDS) {
        if (user[field]) user[field] = '***MASKED***';
      }
    }

    const consents = await ConsentRecord.find({ userId }).lean();
    const requests = await DataSubjectRequest.find({ userId }).lean();

    return {
      personalInformation: user
        ? {
            name: user.name,
            email: user.email,
            phone: user.phone,
            createdAt: user.createdAt,
          }
        : null,
      consents,
      dataSubjectRequests: requests,
      exportedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // حق المحو (مع الاحتفاظ بالبيانات القانونية)
  // =========================================================================

  async eraseUserData(userId, reason) {
    const erasedItems = [];

    // إخفاء هوية المستخدم (Anonymization) بدلاً من الحذف الكامل
    const User = mongoose.models.User;
    if (User) {
      await User.findByIdAndUpdate(userId, {
        name: `ERASED_${userId}`,
        email: `erased_${userId}@deleted.local`,
        phone: null,
        address: null,
      });
      erasedItems.push('user_personal_data');
    }

    // سحب جميع الموافقات
    await ConsentRecord.updateMany({ userId }, { isActive: false, withdrawalDate: new Date() });
    erasedItems.push('consent_records_withdrawn');

    // تسجيل طلب المحو
    await DataSubjectRequest.create({
      userId,
      requestType: 'erasure',
      status: 'completed',
      receivedAt: new Date(),
      completedAt: new Date(),
      notes: `PDPL erasure completed. Reason: ${reason || 'user request'}`,
    });

    logger.info(
      `[PDPL] Data erasure completed for userId=${userId}, items: ${erasedItems.join(', ')}`
    );
    return erasedItems;
  }

  // =========================================================================
  // الإبلاغ عن خرق البيانات (مادة 20)
  // =========================================================================

  async reportDataBreach(data, reportedBy) {
    const { description, severity, affectedRecords, dataTypesAffected, rootCause } = data;

    const incident = await DataBreachIncident.create({
      description,
      severity,
      affectedRecords,
      dataTypesAffected,
      rootCause,
      detectedAt: new Date(),
      reportedBy,
    });

    logger.warn(`[PDPL] Data breach reported: severity=${severity}, affected=${affectedRecords}`);

    // في حالة الخطورة العالية أو الحرجة — يجب إخطار SDAIA
    if (['high', 'critical'].includes(severity)) {
      logger.error(
        `[PDPL] URGENT: Breach must be reported to SDAIA within 72 hours! IncidentId=${incident._id}`
      );
    }

    return incident;
  }

  async getBreachIncidents(filters = {}) {
    const query = {};
    if (filters.severity) query.severity = filters.severity;
    if (filters.status) query.status = filters.status;
    return DataBreachIncident.find(query).sort({ detectedAt: -1 }).lean();
  }

  async updateBreachIncident(incidentId, update) {
    return DataBreachIncident.findByIdAndUpdate(incidentId, update, { new: true });
  }

  // =========================================================================
  // فترات الاحتفاظ بالبيانات
  // =========================================================================

  getRetentionPeriods() {
    return RETENTION_PERIODS;
  }

  getRetentionPeriod(dataCategory) {
    return RETENTION_PERIODS[dataCategory] || '5 years';
  }

  // =========================================================================
  // إخفاء الحقول الحساسة
  // =========================================================================

  maskSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;
    const masked = { ...data };
    for (const field of SENSITIVE_FIELDS) {
      if (masked[field]) masked[field] = '***MASKED***';
    }
    return masked;
  }

  // =========================================================================
  // لوحة التحكم — ملخص الامتثال
  // =========================================================================

  async getComplianceDashboard() {
    const [processingRecords, activeConsents, pendingRequests, openBreaches] = await Promise.all([
      DataProcessingRecord.countDocuments(),
      ConsentRecord.countDocuments({ isActive: true }),
      DataSubjectRequest.countDocuments({ status: { $in: ['received', 'in_progress'] } }),
      DataBreachIncident.countDocuments({ status: { $in: ['open', 'investigating'] } }),
    ]);

    // الطلبات المتأخرة (تجاوزت 30 يوماً دون إغلاق)
    const overdueRequests = await DataSubjectRequest.countDocuments({
      status: { $in: ['received', 'in_progress'] },
      deadline: { $lt: new Date() },
    });

    return {
      processingRecords,
      activeConsents,
      pendingRequests,
      overdueRequests,
      openBreaches,
      complianceScore: this._calculateComplianceScore(overdueRequests, openBreaches),
      retentionPolicies: Object.keys(RETENTION_PERIODS).length,
    };
  }

  _calculateComplianceScore(overdueRequests, openBreaches) {
    let score = 100;
    score -= overdueRequests * 5;
    score -= openBreaches * 10;
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = new PdplService();

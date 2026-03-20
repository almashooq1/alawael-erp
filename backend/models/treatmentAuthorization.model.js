/**
 * نموذج إذن العلاج / الموافقة المسبقة للتأمين
 * Treatment Authorization / Insurance Pre-Authorization Model
 *
 * سير عمل كامل لطلب الموافقة المسبقة من شركات التأمين
 * على الخدمات العلاجية والتأهيلية
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ============================================================
// نموذج طلب إذن العلاج
// Treatment Authorization Request Schema
// ============================================================
const TreatmentAuthorizationSchema = new Schema(
  {
    // رقم الطلب
    authorizationNumber: { type: String, unique: true, required: true },

    // معلومات المستفيد
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    beneficiaryName: { type: String, required: true },
    nationalId: { type: String, required: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female'] },

    // معلومات التأمين
    insurance: {
      provider: { type: String, required: true },
      policyNumber: { type: String, required: true },
      membershipNumber: { type: String },
      className: { type: String }, // فئة التأمين
      networkType: { type: String, enum: ['A', 'B', 'C', 'VIP'] },
      policyStartDate: { type: Date },
      policyEndDate: { type: Date },
      copayPercentage: { type: Number, min: 0, max: 100 },
      maxCoverage: { type: Number },
      remainingCoverage: { type: Number },
    },

    // نوع الطلب
    requestType: {
      type: String,
      enum: [
        'initial', // طلب جديد
        'extension', // تمديد
        'modification', // تعديل
        'urgent', // طارئ
        'retrospective', // بأثر رجعي
      ],
      required: true,
    },

    // مستوى الأولوية
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'emergent'],
      default: 'routine',
    },

    // الخدمات المطلوبة
    services: [
      {
        serviceCode: { type: String, required: true },
        serviceName: { type: String, required: true },
        serviceCategory: {
          type: String,
          enum: [
            'speech_therapy', // علاج النطق
            'occupational_therapy', // العلاج الوظيفي
            'physical_therapy', // العلاج الطبيعي
            'behavioral_therapy', // العلاج السلوكي
            'psychological_therapy', // العلاج النفسي
            'day_care', // الرعاية النهارية
            'assistive_device', // جهاز مساعد
            'diagnostic_assessment', // تقييم تشخيصي
            'rehabilitation_program', // برنامج تأهيلي
            'medical_consultation', // استشارة طبية
            'nursing_care', // رعاية تمريضية
            'other',
          ],
        },
        requestedSessions: { type: Number },
        approvedSessions: { type: Number },
        usedSessions: { type: Number, default: 0 },
        frequencyPerWeek: { type: Number },
        sessionDuration: { type: Number }, // بالدقائق
        estimatedCost: { type: Number },
        approvedCost: { type: Number },
        startDate: { type: Date },
        endDate: { type: Date },
        status: {
          type: String,
          enum: ['pending', 'approved', 'partially_approved', 'denied', 'cancelled'],
          default: 'pending',
        },
        denialReason: { type: String },
      },
    ],

    // التشخيص والمبررات الطبية
    clinicalInfo: {
      primaryDiagnosis: {
        code: { type: String }, // ICD-10
        description: { type: String },
      },
      secondaryDiagnoses: [
        {
          code: String,
          description: String,
        },
      ],
      disabilityType: { type: String },
      disabilityDegree: { type: String, enum: ['mild', 'moderate', 'severe', 'profound'] },
      functionalLimitations: [{ type: String }],
      medicalJustification: { type: String, required: true },
      treatmentGoals: [{ type: String }],
      previousTreatments: [
        {
          treatment: String,
          provider: String,
          dates: String,
          outcome: String,
        },
      ],
      currentMedications: [
        {
          name: String,
          dosage: String,
        },
      ],
    },

    // الطبيب / المعالج الطالب
    requestingProvider: {
      name: { type: String, required: true },
      specialization: { type: String },
      licenseNumber: { type: String },
      facility: { type: String },
      phone: { type: String },
      email: { type: String },
    },

    // حالة الطلب
    status: {
      type: String,
      enum: [
        'draft', // مسودة
        'pending_review', // بانتظار المراجعة الداخلية
        'submitted', // تم التقديم لشركة التأمين
        'under_review', // قيد المراجعة
        'info_requested', // مطلوب معلومات إضافية
        'approved', // موافق عليه
        'partially_approved', // موافق جزئياً
        'denied', // مرفوض
        'appealed', // تم الاستئناف
        'appeal_approved', // تمت الموافقة بعد الاستئناف
        'appeal_denied', // رُفض الاستئناف
        'expired', // منتهي الصلاحية
        'cancelled', // ملغي
      ],
      default: 'draft',
      index: true,
    },

    // تواريخ سير العمل
    workflow: {
      submittedAt: { type: Date },
      submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date },
      deniedAt: { type: Date },
      expiresAt: { type: Date },
      appealedAt: { type: Date },
      appealDecisionAt: { type: Date },
    },

    // رد شركة التأمين
    insurerResponse: {
      referenceNumber: { type: String },
      responseDate: { type: Date },
      decision: { type: String },
      approvedAmount: { type: Number },
      denialReason: { type: String },
      notes: { type: String },
      validFrom: { type: Date },
      validTo: { type: Date },
      conditions: [{ type: String }],
    },

    // الاستئناف
    appeal: {
      reason: { type: String },
      additionalEvidence: [{ type: String }],
      submittedAt: { type: Date },
      submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      decision: { type: String },
      decisionDate: { type: Date },
      notes: { type: String },
    },

    // معلومات مالية
    financials: {
      totalEstimatedCost: { type: Number },
      totalApprovedCost: { type: Number },
      patientResponsibility: { type: Number },
      insurerResponsibility: { type: Number },
      totalBilled: { type: Number, default: 0 },
      totalPaid: { type: Number, default: 0 },
    },

    // المرفقات
    attachments: [
      {
        name: String,
        type: {
          type: String,
          enum: [
            'medical_report',
            'prescription',
            'assessment',
            'referral',
            'lab_result',
            'imaging',
            'other',
          ],
        },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // سجل الإشعارات والمتابعة
    followUps: [
      {
        date: { type: Date, default: Date.now },
        action: String,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
        result: String,
      },
    ],

    // تتبع التغييرات
    auditLog: [
      {
        action: String,
        previousStatus: String,
        newStatus: String,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
        details: String,
      },
    ],

    // الفرع
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },

    // حقول النظام
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'treatment_authorizations',
  }
);

TreatmentAuthorizationSchema.index({ beneficiary: 1, status: 1 });
TreatmentAuthorizationSchema.index({ 'insurance.policyNumber': 1 });
TreatmentAuthorizationSchema.index({ status: 1, 'workflow.expiresAt': 1 });
TreatmentAuthorizationSchema.index({ branch: 1, createdAt: -1 });

const TreatmentAuthorization = mongoose.model(
  'TreatmentAuthorization',
  TreatmentAuthorizationSchema
);

module.exports = { TreatmentAuthorization };

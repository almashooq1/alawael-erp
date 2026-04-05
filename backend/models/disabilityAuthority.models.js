/**
 * نماذج هيئة رعاية الأشخاص ذوي الإعاقة + معايير CBAHI
 * Disability Authority Reports + CBAHI Accreditation Standards
 *
 * تقارير الهيئة العامة لرعاية الأشخاص ذوي الإعاقة
 * المركز السعودي لاعتماد المنشآت الصحية (سباهي/CBAHI)
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ============================================================
// نموذج التقرير الدوري لهيئة الإعاقة
// Disability Authority Periodic Report Schema
// ============================================================
const DisabilityAuthorityReportSchema = new Schema(
  {
    // معلومات التقرير
    reportNumber: { type: String, unique: true, required: true },
    reportType: {
      type: String,
      enum: [
        'monthly_service', // تقرير الخدمات الشهري
        'quarterly_progress', // تقرير التقدم الربع سنوي
        'annual_comprehensive', // التقرير السنوي الشامل
        'incident_report', // تقرير حادثة
        'complaint_response', // رد على شكوى
        'inspection_response', // رد على زيارة تفتيشية
        'statistical', // تقرير إحصائي
        'quality_assurance', // تقرير ضمان الجودة
      ],
      required: true,
      index: true,
    },
    reportPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },

    // معلومات المركز
    centerInfo: {
      name: { type: String, required: true },
      licenseNumber: { type: String, required: true },
      branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
      region: { type: String },
      city: { type: String },
      capacity: { type: Number },
      centerType: {
        type: String,
        enum: ['day_care', 'residential', 'comprehensive', 'specialized', 'early_intervention'],
      },
    },

    // إحصائيات المستفيدين
    beneficiaryStats: {
      totalRegistered: { type: Number, default: 0 },
      activeBeneficiaries: { type: Number, default: 0 },
      newEnrollments: { type: Number, default: 0 },
      discharged: { type: Number, default: 0 },
      waitlisted: { type: Number, default: 0 },

      // التوزيع حسب نوع الإعاقة
      byDisabilityType: [
        {
          type: { type: String },
          count: { type: Number },
          percentage: { type: Number },
        },
      ],

      // التوزيع حسب الفئة العمرية
      byAgeGroup: [
        {
          range: { type: String }, // e.g., "0-3", "4-6", "7-12", "13-18", "18+"
          count: { type: Number },
        },
      ],

      // التوزيع حسب الجنس
      byGender: {
        male: { type: Number, default: 0 },
        female: { type: Number, default: 0 },
      },

      // التوزيع حسب درجة الإعاقة
      byDisabilityDegree: {
        mild: { type: Number, default: 0 },
        moderate: { type: Number, default: 0 },
        severe: { type: Number, default: 0 },
        profound: { type: Number, default: 0 },
      },
    },

    // إحصائيات الخدمات التأهيلية
    serviceStats: {
      totalSessions: { type: Number, default: 0 },
      totalHours: { type: Number, default: 0 },

      byServiceType: [
        {
          service: { type: String },
          sessions: { type: Number },
          hours: { type: Number },
          beneficiaries: { type: Number },
          satisfactionRate: { type: Number },
        },
      ],

      // الخطط التأهيلية
      activePlans: { type: Number, default: 0 },
      completedPlans: { type: Number, default: 0 },
      averagePlanDuration: { type: Number },

      // التقييمات
      assessmentsCompleted: { type: Number, default: 0 },
      averageProgressRate: { type: Number, min: 0, max: 100 },
    },

    // الكوادر البشرية
    staffStats: {
      totalStaff: { type: Number, default: 0 },
      bySpecialization: [
        {
          specialization: { type: String },
          count: { type: Number },
          licensed: { type: Number },
        },
      ],
      staffToBeneficiaryRatio: { type: String },
      trainingHoursTotal: { type: Number },
      turnoverRate: { type: Number },
    },

    // مؤشرات الجودة
    qualityIndicators: {
      overallSatisfactionRate: { type: Number, min: 0, max: 100 },
      familySatisfactionRate: { type: Number, min: 0, max: 100 },
      incidentCount: { type: Number, default: 0 },
      complaintCount: { type: Number, default: 0 },
      complaintResolutionRate: { type: Number, min: 0, max: 100 },
      safetyComplianceRate: { type: Number, min: 0, max: 100 },
      documentationComplianceRate: { type: Number, min: 0, max: 100 },
    },

    // مؤشرات المخرجات
    outcomeIndicators: {
      goalAchievementRate: { type: Number, min: 0, max: 100 },
      independenceLevelImprovement: { type: Number },
      communityIntegrationRate: { type: Number },
      employmentPlacementRate: { type: Number },
      academicProgressRate: { type: Number },
      behavioralImprovementRate: { type: Number },
    },

    // الملاحظات والتوصيات
    challenges: [{ type: String }],
    achievements: [{ type: String }],
    recommendations: [{ type: String }],
    actionPlans: [
      {
        area: String,
        action: String,
        responsible: String,
        deadline: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
      },
    ],

    // حالة التقرير
    status: {
      type: String,
      enum: ['draft', 'review', 'approved', 'submitted', 'acknowledged', 'returned'],
      default: 'draft',
      index: true,
    },
    submittedAt: { type: Date },
    acknowledgedAt: { type: Date },
    authorityReferenceNumber: { type: String },
    authorityFeedback: { type: String },

    // المرفقات
    attachments: [
      {
        name: String,
        type: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // حقول النظام
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'disability_authority_reports',
  }
);

DisabilityAuthorityReportSchema.index({ reportType: 1, 'reportPeriod.startDate': 1 });

// ============================================================
// نموذج معايير CBAHI (سباهي)
// CBAHI Accreditation Standards Schema
// ============================================================
const CBAHIStandardSchema = new Schema(
  {
    // معلومات المعيار
    standardCode: { type: String, required: true, unique: true },
    chapter: {
      type: String,
      enum: [
        'leadership_governance', // القيادة والحوكمة
        'patient_care', // رعاية المرضى/المستفيدين
        'safety_management', // إدارة السلامة
        'infection_control', // مكافحة العدوى
        'human_resources', // الموارد البشرية
        'information_management', // إدارة المعلومات
        'quality_improvement', // تحسين الجودة
        'facility_management', // إدارة المرافق
        'medication_management', // إدارة الأدوية
        'patient_rights', // حقوق المستفيدين
        'education_training', // التعليم والتدريب
        'rehabilitation_services', // خدمات التأهيل
        'support_services', // الخدمات المساندة
      ],
      required: true,
    },
    title: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    description: {
      ar: { type: String },
      en: { type: String },
    },
    requirement: { type: String },
    evidenceRequired: [{ type: String }],
    priority: {
      type: String,
      enum: ['essential', 'important', 'desirable'],
      default: 'important',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'cbahi_standards',
  }
);

// ============================================================
// نموذج تقييم الامتثال لمعايير CBAHI
// CBAHI Compliance Assessment Schema
// ============================================================
const CBAHIComplianceSchema = new Schema(
  {
    // معلومات التقييم
    assessmentNumber: { type: String, unique: true, required: true },
    assessmentType: {
      type: String,
      enum: ['self_assessment', 'mock_survey', 'pre_survey', 'official_survey', 'follow_up'],
      required: true,
    },
    assessmentDate: { type: Date, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },

    // نتائج التقييم لكل معيار
    standardResults: [
      {
        standard: { type: Schema.Types.ObjectId, ref: 'CBAHIStandard' },
        standardCode: { type: String, required: true },
        chapter: { type: String },

        // درجة الامتثال
        complianceLevel: {
          type: String,
          enum: ['fully_compliant', 'partially_compliant', 'non_compliant', 'not_applicable'],
          required: true,
        },
        score: { type: Number, min: 0, max: 100 },

        // الأدلة
        evidenceProvided: [
          {
            description: String,
            documentRef: String,
            verified: Boolean,
          },
        ],

        // الملاحظات والإجراءات
        findings: { type: String },
        correctiveAction: {
          required: Boolean,
          description: String,
          deadline: Date,
          responsible: String,
          status: { type: String, enum: ['pending', 'in_progress', 'completed', 'overdue'] },
          completedAt: Date,
        },
      },
    ],

    // النتائج الإجمالية
    overallResults: {
      totalStandards: { type: Number },
      fullyCompliant: { type: Number },
      partiallyCompliant: { type: Number },
      nonCompliant: { type: Number },
      notApplicable: { type: Number },
      overallScore: { type: Number, min: 0, max: 100 },
      overallComplianceRate: { type: Number, min: 0, max: 100 },
    },

    // النتائج حسب الفصل
    chapterResults: [
      {
        chapter: { type: String },
        chapterName: { ar: String, en: String },
        totalStandards: Number,
        compliant: Number,
        score: Number,
      },
    ],

    // خطة التحسين
    improvementPlan: [
      {
        area: String,
        currentGap: String,
        targetLevel: String,
        actions: [
          {
            description: String,
            responsible: String,
            deadline: Date,
            status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
            progress: { type: Number, min: 0, max: 100 },
          },
        ],
        priority: { type: String, enum: ['high', 'medium', 'low'] },
      },
    ],

    // حالة التقييم
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'submitted', 'approved'],
      default: 'planned',
    },
    readinessLevel: {
      type: String,
      enum: ['not_ready', 'needs_improvement', 'nearly_ready', 'ready', 'excellent'],
    },
    nextAssessmentDate: { type: Date },

    // حقول النظام
    assessedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'cbahi_compliance_assessments',
  }
);

CBAHIComplianceSchema.index({ assessmentDate: -1, branch: 1 });

// ============================================================
// التصدير
// ============================================================
const DisabilityAuthorityReport =
  mongoose.models.DisabilityAuthorityReport ||
  mongoose.models.DisabilityAuthorityReport ||
  mongoose.models.DisabilityAuthorityReport ||
  mongoose.model('DisabilityAuthorityReport', DisabilityAuthorityReportSchema);
const CBAHIStandard =
  mongoose.models.CBAHIStandard || mongoose.model('CBAHIStandard', CBAHIStandardSchema);
const CBAHICompliance =
  mongoose.models.CBAHICompliance || mongoose.model('CBAHICompliance', CBAHIComplianceSchema);

module.exports = {
  DisabilityAuthorityReport,
  CBAHIStandard,
  CBAHICompliance,
};

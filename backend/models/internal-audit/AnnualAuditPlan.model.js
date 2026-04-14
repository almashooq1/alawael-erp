'use strict';
const mongoose = require('mongoose');

// Annual Audit Plan Schema
const AnnualAuditPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    titleAr: {
      type: String,
      required: true,
    },
    description: String,
    descriptionAr: String,

    // الأقسام والعمليات المدرجة
    departments: [
      {
        departmentId: String,
        departmentName: String,
        departmentNameAr: String,
        auditFrequency: {
          type: String,
          enum: ['quarterly', 'semi-annual', 'annual'],
          default: 'annual',
        },
        estimatedAuditors: Number,
        riskLevel: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium',
        },
        priorities: [String],
      },
    ],

    // الأهداف والنطاق
    objectives: [
      {
        objectiveId: String,
        title: String,
        titleAr: String,
        description: String,
        measurementCriteria: String,
      },
    ],

    // الموارد المخصصة
    resources: {
      totalBudget: Number,
      allocatedAuditors: Number,
      auditDays: Number,
      supportTools: [String],
    },

    // المعايير المراد تطبيقها
    standards: [
      {
        standardId: String,
        standardName: String,
        applicableGuidelines: [String],
      },
    ],

    // جدول التنفيذ
    schedule: [
      {
        phase: Number,
        quarter: String,
        startDate: Date,
        endDate: Date,
        departments: [String],
        auditors: [String],
        status: {
          type: String,
          enum: ['planned', 'in-progress', 'completed', 'postponed'],
          default: 'planned',
        },
      },
    ],

    // الموارد البشرية المسؤولة
    auditTeam: [
      {
        auditorId: String,
        auditorName: String,
        role: {
          type: String,
          enum: ['lead-auditor', 'auditor', 'observer'],
          default: 'auditor',
        },
        specialization: [String],
        certifications: [String],
      },
    ],

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'approved', 'active', 'completed', 'archived'],
      default: 'draft',
    },

    approvalInfo: {
      approvedBy: String,
      approvalDate: Date,
      approverRole: String,
      comments: String,
    },

    createdBy: String,
    createdDate: { type: Date, default: Date.now },
    lastModifiedBy: String,
    lastModifiedDate: Date,

    attachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadDate: Date,
        uploadedBy: String,
      },
    ],
  },
  { timestamps: true }
);

// إنشاء الفهارس للبحث السريع
AnnualAuditPlanSchema.index({ year: 1, status: 1 });

const AnnualAuditPlan =
  mongoose.models.AnnualAuditPlan || mongoose.model('AnnualAuditPlan', AnnualAuditPlanSchema);

module.exports = AnnualAuditPlan;

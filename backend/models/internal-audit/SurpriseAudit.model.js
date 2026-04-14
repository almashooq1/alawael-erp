'use strict';
const mongoose = require('mongoose');

// Surprise Audit Operations Schema
const SurpriseAuditSchema = new mongoose.Schema(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['surprise', 'planned', 'follow-up'],
    },

    // معلومات التدقيق الأساسية
    auditInfo: {
      title: String,
      titleAr: String,
      description: String,
      reason: String,
      reasonAr: String,
      triggeringFactor: String, // سبب التدقيق المفاجئ
      initiatedBy: String,
      initiationDate: Date,
    },

    // القسم المراد تدقيقه
    auditScope: {
      departmentId: String,
      departmentName: String,
      departmentNameAr: String,
      processArea: String,
      processAreaAr: String,
      scopeDescription: String,
      riskAssessment: String,
    },

    // فريق التدقيق
    auditTeam: [
      {
        auditorsId: String,
        auditorName: String,
        role: {
          type: String,
          enum: ['lead', 'member', 'observer'],
          default: 'member',
        },
        responsibility: String,
      },
    ],

    // جدول التدقيق
    schedule: {
      scheduledDate: Date,
      actualStartDate: Date,
      actualEndDate: Date,
      duration: Number, // بالساعات
      location: String,
      notificationDate: Date,
      notificationMethod: String,
    },

    // المعايير المراد الفحص عليها
    auditCriteria: [
      {
        criteriaId: String,
        criteriaTitle: String,
        criteriaType: {
          type: String,
          enum: ['compliance', 'performance', 'process', 'control'],
          default: 'compliance',
        },
        description: String,
        expectedResults: String,
      },
    ],

    // الأدلة والمستندات
    evidence: [
      {
        evidenceId: String,
        category: {
          type: String,
          enum: ['document', 'interview', 'observation', 'record', 'sample'],
          default: 'document',
        },
        description: String,
        location: String,
        collectionDate: Date,
        collectedBy: String,
        fileUrl: String,
        findings: String,
      },
    ],

    // الملاحظات المبدئية
    observations: [
      {
        observationId: String,
        category: {
          type: String,
          enum: ['strength', 'weakness', 'risk', 'opportunity'],
          default: 'weakness',
        },
        description: String,
        severity: {
          type: String,
          enum: ['critical', 'major', 'minor'],
          default: 'minor',
        },
        relatedCriteria: [String],
        evidenceReferences: [String],
      },
    ],

    // الحالة والتقدم
    status: {
      type: String,
      enum: ['planned', 'in-progress', 'fieldwork-complete', 'reporting', 'completed', 'closed'],
      default: 'planned',
    },

    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // النتائج الأولية
    preliminaryResults: {
      totalFindingsCount: Number,
      criticalFindingsCount: Number,
      majorFindingsCount: Number,
      minorFindingsCount: Number,
      overallComplianceScore: Number,
      riskRating: String,
    },

    managementNotification: {
      notificationSent: Boolean,
      notificationDate: Date,
      notificationMethod: String,
      recipientList: [String],
    },

    createdBy: String,
    createdDate: { type: Date, default: Date.now },
    lastModifiedBy: String,
    lastModifiedDate: Date,
  },
  { timestamps: true }
);

const SurpriseAudit =
  mongoose.models.SurpriseAudit || mongoose.model('SurpriseAudit', SurpriseAuditSchema);

module.exports = SurpriseAudit;

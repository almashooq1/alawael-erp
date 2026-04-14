'use strict';
const mongoose = require('mongoose');

// Non-Conformance Reports Schema
const NonConformanceReportSchema = new mongoose.Schema(
  {
    ncrId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // معلومات عدم المطابقة
    reportInfo: {
      title: String,
      titleAr: String,
      description: String,
      descriptionAr: String,
      reportDate: { type: Date, default: Date.now },
      reportedBy: String,
      reporterRole: String,
    },

    // تصنيف عدم المطابقة
    classification: {
      type: {
        type: String,
        enum: [
          'external-audit',
          'internal-audit',
          'management-review',
          'customer-complaint',
          'process-monitoring',
          'other',
        ],
        default: 'internal-audit',
      },
      category: {
        type: String,
        enum: ['critical', 'major', 'minor'],
        default: 'major',
      },
      severity: {
        type: String,
        enum: ['1-Critical', '2-High', '3-Medium', '4-Low'],
        default: '3-Medium',
      },
      immediateImpact: Boolean,
    },

    // تفاصيل عدم المطابقة
    details: {
      affectedProcessArea: String,
      affectedDepartment: String,
      affectedDepartmentAr: String,
      statementOfNonconformity: String,
      statementAr: String,
      relatedStandard: String,
      requirementNotMet: String,
      rootCause: String,
      potentialImpact: String,
    },

    // الأدلة
    evidence: [
      {
        evidenceType: String,
        description: String,
        documentUrl: String,
        attachmentDate: Date,
      },
    ],

    // التأثير المحدث
    impact: {
      customerImpact: Boolean,
      safetyImpact: Boolean,
      complianceImpact: Boolean,
      financialImpact: Boolean,
      estimatedLoss: Number,
      numberOfAffectedItems: Number,
      impactDescription: String,
    },

    // الحالة
    status: {
      type: String,
      enum: [
        'open',
        'acknowledged',
        'under-investigation',
        'action-plan-defined',
        'action-in-progress',
        'verification-pending',
        'closed',
        'rejected',
      ],
      default: 'open',
    },

    // المالك ومعلومات المتابعة
    ownership: {
      ownerId: String,
      ownerName: String,
      ownerDepartment: String,
      ownerEmail: String,
      assignmentDate: Date,
    },

    // التعليقات والإجراءات المؤقتة
    temporaryActions: [
      {
        actionId: String,
        description: String,
        implementedDate: Date,
        implementedBy: String,
        effectiveness: String,
      },
    ],

    // الأولويات والتواريخ
    priorities: {
      initialResponse: Date,
      investigationDeadline: Date,
      correctionDeadline: Date,
      verificationDeadline: Date,
    },

    // متابعة الإغلاق
    closingInfo: {
      closedDate: Date,
      closedBy: String,
      verificationMethod: String,
      verificationEvidence: [String],
      closingComments: String,
      preventiveMeasures: String,
    },

    // التصعيد
    escalation: {
      escalated: Boolean,
      escalationDate: Date,
      escalationReason: String,
      escalatedTo: String,
    },

    attachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadDate: Date,
        uploadedBy: String,
      },
    ],

    createdBy: String,
    createdDate: { type: Date, default: Date.now },
    lastModifiedBy: String,
    lastModifiedDate: Date,
  },
  { timestamps: true }
);

const NonConformanceReport =
  mongoose.models.NonConformanceReport ||
  mongoose.model('NonConformanceReport', NonConformanceReportSchema);

module.exports = NonConformanceReport;

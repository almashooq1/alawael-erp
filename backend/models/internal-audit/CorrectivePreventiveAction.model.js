'use strict';
const mongoose = require('mongoose');

// Corrective and Preventive Actions Schema
const CorrectivePreventiveActionSchema = new mongoose.Schema(
  {
    actionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ['corrective', 'preventive'],
      default: 'corrective',
    },

    // الارتباط بعدم المطابقة
    linkedNcr: {
      ncrId: String,
      ncrTitle: String,
      relationshipType: String,
    },

    // معلومات الإجراء
    actionInfo: {
      title: String,
      titleAr: String,
      description: String,
      descriptionAr: String,
      createdDate: { type: Date, default: Date.now },
      createdBy: String,
    },

    // تحليل الأسباب الجذرية
    rootCauseAnalysis: {
      method: {
        type: String,
        enum: ['5-why', 'fishbone', 'fault-tree', 'pareto', 'other'],
        default: '5-why',
      },
      analysis: String,
      analysisAr: String,
      identifiedRootCauses: [
        {
          causeId: String,
          cause: String,
          causeAr: String,
          probability: String,
          contributionPercentage: Number,
        },
      ],
      analysisDate: Date,
      analyzedBy: String,
    },

    // الإجراءات المقترحة
    proposedActions: [
      {
        actionSequence: Number,
        description: String,
        objective: String,
        expectedOutcome: String,
        implementationMethod: String,
        resourcesRequired: String,
        estimatedCost: Number,
      },
    ],

    // تفاصيل التنفيذ
    implementation: {
      ownerName: String,
      ownerDepartment: String,
      ownerEmail: String,
      responsibleTeam: [String],
      startDate: Date,
      targetCompletionDate: Date,
      actualCompletionDate: Date,
      status: {
        type: String,
        enum: ['planning', 'approved', 'in-progress', 'completed', 'delayed', 'on-hold'],
        default: 'planning',
      },
      progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },

    // المراحل والتقدم
    phases: [
      {
        phaseNumber: Number,
        phaseName: String,
        description: String,
        startDate: Date,
        endDate: Date,
        status: String,
        progress: Number,
        leadPerson: String,
        notes: String,
      },
    ],

    // الموارد المخصصة
    resources: {
      budget: Number,
      humanResources: [String],
      equipment: [String],
      materials: [String],
      budget_ar: String,
    },

    // المخاطر والعقبات
    risks: [
      {
        riskId: String,
        description: String,
        probability: String,
        impact: String,
        mitigationPlan: String,
        mitigationOwner: String,
      },
    ],

    // المراقبة والتحقق
    monitoring: {
      indicators: [
        {
          indicatorId: String,
          indicatorName: String,
          targetValue: String,
          currentValue: String,
          measurementFrequency: String,
          dataSource: String,
        },
      ],
      reviewSchedule: String,
      monitoringFrequency: String,
      lastReviewDate: Date,
      nextReviewDate: Date,
    },

    // التحقق من الفعالية
    effectiveness: {
      verificationMethod: {
        type: String,
        enum: ['audit', 'measurement', 'observation', 'review', 'testing'],
        default: 'audit',
      },
      verificationDate: Date,
      verificationResults: String,
      isEffective: Boolean,
      effectivenessScore: Number,
      verificationEvidence: [String],
      verificationBy: String,
      performanceAfterAction: String,
    },

    // الإغلاق
    closure: {
      closureDate: Date,
      closedBy: String,
      closureComment: String,
      lessonsLearned: String,
      relatedDocumentation: [String],
      applicableToOtherAreas: Boolean,
      recommendations: String,
    },

    // الحالة الكلية
    overallStatus: {
      type: String,
      enum: [
        'new',
        'assigned',
        'in-progress',
        'awaiting-verification',
        'effective',
        'ineffective',
        'closed',
      ],
      default: 'new',
    },

    attachments: [
      {
        fileName: String,
        fileUrl: String,
        category: String,
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

const CorrectivePreventiveAction =
  mongoose.models.CorrectivePreventiveAction ||
  mongoose.model('CorrectivePreventiveAction', CorrectivePreventiveActionSchema);

module.exports = CorrectivePreventiveAction;

'use strict';
const mongoose = require('mongoose');

// Closure Follow-up Schema
const ClosureFollowUpSchema = new mongoose.Schema(
  {
    followUpId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // الارتباط بالمشكلة الأصلية
    linkedTo: {
      type: {
        type: String,
        enum: ['ncr', 'audit-finding', 'corrective-action', 'preventive-action'],
        required: true,
      },
      linkedId: String,
      linkedTitle: String,
    },

    // معلومات المتابعة
    followUpInfo: {
      description: String,
      descriptionAr: String,
      initiatedDate: { type: Date, default: Date.now },
      initiatedBy: String,
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'awaiting-evidence', 'completed', 'failed', 'escalated'],
        default: 'pending',
      },
    },

    // معايير الإغلاق
    closureCriteria: [
      {
        criteriaId: String,
        description: String,
        descriptionAr: String,
        measurable: Boolean,
        targetMetrics: String,
        acceptanceCriteria: String,
        verificationMethod: String,
      },
    ],

    // التحقق من الإغلاق
    closureVerification: {
      verificationDate: Date,
      verifiedBy: String,
      verificationMethod: String,
      allCriteriaMet: Boolean,
      evidenceProvided: [
        {
          evidenceType: String,
          description: String,
          documentUrl: String,
          attachmentDate: Date,
        },
      ],
      verificationNotes: String,
    },

    // الاختبارات والعينات
    samplingAndTesting: {
      testingRequired: Boolean,
      testType: String,
      sampleSize: Number,
      testingMethod: String,
      testingDate: Date,
      testResults: String,
      testPassed: Boolean,
      testingPerformedBy: String,
    },

    // عمليات التحقق الإضافية
    additionalVerification: [
      {
        verificationId: String,
        verificationType: String,
        description: String,
        date: Date,
        performedBy: String,
        results: String,
        passed: Boolean,
      },
    ],

    // المتابعة الميدانية
    fieldFollowUp: {
      visitRequired: Boolean,
      visitDate: Date,
      visitedBy: String,
      visitDuration: Number,
      departmentVisited: String,
      observations: String,
      photographsAttached: Boolean,
      conclusionOfVisit: String,
    },

    // المراجعات الفترية
    periodicReviews: [
      {
        reviewNumber: Number,
        reviewDate: Date,
        reviewedBy: String,
        statusAtReview: String,
        findings: String,
        additionalActionsNeeded: Boolean,
      },
    ],

    // الموافقة النهائية
    finalApproval: {
      approvalRequired: Boolean,
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'conditional'],
        default: 'pending',
      },
      approvedBy: String,
      approvalDate: Date,
      rejectionReason: String,
      conditionalRequirements: String,
      conditionsMet: Boolean,
    },

    // الإغلاق النهائي
    finalClosure: {
      closureDate: Date,
      closedBy: String,
      closureReason: {
        type: String,
        enum: ['criteria-met', 'time-expired', 'superseded', 'waived', 'other'],
        default: 'criteria-met',
      },
      closureComments: String,
      lessonsLearned: String,
      preventiveMeasuresImplemented: String,
      documentation: [String],
    },

    // إعادة الفتح
    reopening: {
      reopened: Boolean,
      reopeningDate: Date,
      reopeningReason: String,
      reopenedBy: String,
      numberOfReopenings: Number,
    },

    // الجدول الزمني
    timeline: {
      originalDeadline: Date,
      extensionsRequested: Number,
      finalDeadline: Date,
      daysToClose: Number,
      daysOverdue: Number,
    },

    // المسؤولية والمحاسبية
    accountability: {
      responsibleParty: String,
      responsibleDepartment: String,
      escalationPerformed: Boolean,
      escalationDetails: String,
      managementReviewRequired: Boolean,
      managementReviewDate: Date,
    },

    statusOverall: {
      type: String,
      enum: ['not-started', 'in-progress', 'monitoring', 'closed', 'suspended'],
      default: 'not-started',
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

const ClosureFollowUp =
  mongoose.models.ClosureFollowUp || mongoose.model('ClosureFollowUp', ClosureFollowUpSchema);

module.exports = ClosureFollowUp;

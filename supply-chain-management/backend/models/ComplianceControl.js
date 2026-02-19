const mongoose = require('mongoose');

const complianceControlSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => `CC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    framework: {
      type: String,
      enum: ['ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS', 'SOX', 'CUSTOMIZED'],
      required: true,
    },
    requirement: String,
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'implemented', 'compliant', 'non_compliant'],
      default: 'planned',
    },
    owner: String,
    reviewer: String,
    evidenceRequired: [String],
    evidenceProvided: [
      {
        documentId: String,
        documentName: String,
        uploadedAt: Date,
        uploadedBy: String,
      },
    ],
    assessmentSchedule: {
      frequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'annually', 'on-demand'],
        default: 'annually',
      },
      lastAssessed: Date,
      nextAssessment: Date,
    },
    findings: [
      {
        findingId: String,
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
          default: 'medium',
        },
        description: String,
        remediation: String,
        dueDate: Date,
        status: {
          type: String,
          enum: ['open', 'in_progress', 'resolved', 'closed'],
          default: 'open',
        },
        closedAt: Date,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      priority: String,
      tags: [String],
      customFields: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

complianceControlSchema.index({ framework: 1, status: 1 });
complianceControlSchema.index({ owner: 1 });

module.exports = mongoose.model('ComplianceControl', complianceControlSchema);

const mongoose = require('mongoose');

// Standard Schema - معايير الجودة
const StandardSchema = new mongoose.Schema(
  {
    standardId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'saudi_health_commission', // الهيئة السعودية للتخصصات الصحية
        'local_quality', // معايير الجودة المحلية
        'carf', // CARF International
        'jci', // Joint Commission International
        'iso', // ISO Standards
        'national_accreditation', // الاعتماد الوطني
      ],
    },
    version: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    descriptionAr: {
      type: String,
    },
    requirements: [
      {
        requirementId: String,
        title: String,
        titleAr: String,
        description: String,
        descriptionAr: String,
        mandatory: Boolean,
        evidenceTypes: [String],
        weight: Number, // أهمية المعيار (1-10)
      },
    ],
    effectiveDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'deprecated', 'under_review'],
      default: 'active',
    },
    attachments: [
      {
        filename: String,
        filepath: String,
        uploadDate: Date,
        fileSize: Number,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Accreditation Schema - الاعتمادات
const AccreditationSchema = new mongoose.Schema(
  {
    accreditationId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    nameAr: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'saudi_health_commission',
        'carf',
        'jci',
        'iso_9001',
        'iso_27001',
        'national_accreditation',
        'other',
      ],
    },
    issuingBody: {
      name: String,
      nameAr: String,
      country: String,
    },
    certificateNumber: {
      type: String,
      required: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    scope: {
      type: String,
      required: true,
    },
    scopeAr: {
      type: String,
      required: true,
    },
    standards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Standard',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended', 'pending_renewal', 'in_progress'],
      default: 'active',
    },
    documents: [
      {
        type: String,
        description: String,
        filepath: String,
        uploadDate: Date,
      },
    ],
    auditSchedule: {
      nextAuditDate: Date,
      auditFrequency: String, // annual, biannual, triannual
      lastAuditDate: Date,
    },
    responsiblePerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
    notesAr: String,
  },
  {
    timestamps: true,
  }
);

// Quality Audit Schema - مراجعات الجودة
const QualityAuditSchema = new mongoose.Schema(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    titleAr: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['internal', 'external', 'certification', 'surveillance', 'follow_up'],
    },
    accreditation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Accreditation',
    },
    standards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Standard',
      },
    ],
    auditDate: {
      type: Date,
      required: true,
    },
    auditors: [
      {
        name: String,
        nameAr: String,
        organization: String,
        role: String,
      },
    ],
    scope: {
      type: String,
      required: true,
    },
    scopeAr: {
      type: String,
    },
    findings: [
      {
        findingId: String,
        type: {
          type: String,
          enum: [
            'major_nonconformity',
            'minor_nonconformity',
            'observation',
            'positive',
            'recommendation',
          ],
        },
        standard: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Standard',
        },
        requirementId: String,
        description: String,
        descriptionAr: String,
        evidence: String,
        rootCause: String,
        correctiveAction: String,
        correctiveActionAr: String,
        responsiblePerson: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        dueDate: Date,
        status: {
          type: String,
          enum: ['open', 'in_progress', 'resolved', 'verified', 'closed'],
          default: 'open',
        },
        attachments: [
          {
            filename: String,
            filepath: String,
            uploadDate: Date,
          },
        ],
      },
    ],
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'report_pending'],
      default: 'scheduled',
    },
    reportFile: {
      filename: String,
      filepath: String,
      uploadDate: Date,
    },
    nextFollowUpDate: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compliance Tracking Schema - تتبع الامتثال
const ComplianceTrackingSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      required: true,
      unique: true,
    },
    standard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Standard',
      required: true,
    },
    requirementId: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    complianceLevel: {
      type: String,
      enum: [
        'fully_compliant',
        'partially_compliant',
        'non_compliant',
        'not_applicable',
        'under_review',
      ],
      required: true,
    },
    assessmentDate: {
      type: Date,
      required: true,
    },
    evidence: [
      {
        type: String,
        description: String,
        descriptionAr: String,
        filepath: String,
        uploadDate: Date,
      },
    ],
    gaps: [
      {
        description: String,
        descriptionAr: String,
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
        },
        actionPlan: String,
        responsiblePerson: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        targetDate: Date,
        status: {
          type: String,
          enum: ['identified', 'action_planned', 'in_progress', 'resolved'],
          default: 'identified',
        },
      },
    ],
    assessor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    nextReviewDate: Date,
    notes: String,
    notesAr: String,
  },
  {
    timestamps: true,
  }
);

// Quality Indicator Schema - مؤشرات الجودة
const QualityIndicatorSchema = new mongoose.Schema(
  {
    indicatorId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    nameAr: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'clinical_outcomes', // نتائج سريرية
        'patient_safety', // سلامة المرضى
        'patient_satisfaction', // رضا المرضى
        'operational_efficiency', // كفاءة تشغيلية
        'staff_competency', // كفاءة الموظفين
        'infection_control', // مكافحة العدوى
        'medication_safety', // سلامة الأدوية
      ],
    },
    relatedStandards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Standard',
      },
    ],
    formula: String, // صيغة الحساب
    targetValue: {
      type: Number,
      required: true,
    },
    unit: String, // percentage, count, rate, etc.
    dataSource: String,
    collectionFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
    },
    measurements: [
      {
        date: Date,
        value: Number,
        numerator: Number,
        denominator: Number,
        notes: String,
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    responsible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'under_review'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StandardSchema.index({ category: 1, status: 1 });
AccreditationSchema.index({ type: 1, status: 1 });
AccreditationSchema.index({ expiryDate: 1 });
QualityAuditSchema.index({ auditDate: 1 });
QualityAuditSchema.index({ status: 1 });
ComplianceTrackingSchema.index({ standard: 1, department: 1 });
ComplianceTrackingSchema.index({ complianceLevel: 1 });
QualityIndicatorSchema.index({ category: 1, status: 1 });

const Standard = mongoose.model('Standard', StandardSchema);
const Accreditation = mongoose.model('Accreditation', AccreditationSchema);
const QualityAudit = mongoose.model('QualityAudit', QualityAuditSchema);
const ComplianceTracking = mongoose.model('ComplianceTracking', ComplianceTrackingSchema);
const QualityIndicator = mongoose.model('QualityIndicator', QualityIndicatorSchema);

module.exports = {
  Standard,
  Accreditation,
  QualityAudit,
  ComplianceTracking,
  QualityIndicator,
};

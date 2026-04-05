'use strict';

const mongoose = require('mongoose');

// =============================================
// 1. معايير الجودة (CBAHI / JCI / MOH)
// =============================================
const qualityStandardSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true }, // CBAHI-2.1, JCI-PFR.1
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    source: {
      type: String,
      enum: ['cbahi', 'jci', 'moh', 'internal'],
      required: true,
    },
    chapter: { type: String, default: null },
    section: { type: String, default: null },
    descriptionAr: { type: String, required: true },
    descriptionEn: { type: String, default: null },
    requirements: { type: String, default: null },
    evidenceRequired: { type: [String], default: [] },
    priority: {
      type: String,
      enum: ['required', 'recommended', 'best_practice'],
      default: 'required',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// =============================================
// 2. قوائم الفحص (Checklists)
// =============================================
const checklistItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    textAr: { type: String, required: true },
    textEn: { type: String, default: null },
    category: { type: String, default: null },
    isCritical: { type: Boolean, default: false },
    helpText: { type: String, default: null },
  },
  { _id: false }
);

const checklistSchema = new mongoose.Schema(
  {
    titleAr: { type: String, required: true },
    titleEn: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'safety_round',
        'infection_control',
        'patient_safety',
        'environment',
        'equipment',
        'documentation',
        'clinical_audit',
      ],
      required: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'on_demand'],
      required: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    department: { type: String, default: null },
    items: { type: [checklistItemSchema], default: [] },
    requiresSignature: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// =============================================
// 3. نتائج قوائم الفحص
// =============================================
const checklistResponseSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    compliant: { type: Boolean, required: true },
    notes: { type: String, default: null },
    photoPath: { type: String, default: null },
    correctiveAction: { type: String, default: null },
  },
  { _id: false }
);

const checklistSubmissionSchema = new mongoose.Schema(
  {
    checklistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checklist', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submissionDate: { type: Date, required: true },
    responses: { type: [checklistResponseSchema], default: [] },
    totalItems: { type: Number, default: 0 },
    compliantItems: { type: Number, default: 0 },
    nonCompliantItems: { type: Number, default: 0 },
    complianceRate: { type: Number, default: 0 }, // نسبة مئوية 0-100
    overallNotes: { type: String, default: null },
    status: {
      type: String,
      enum: ['submitted', 'reviewed', 'action_required', 'closed'],
      default: 'submitted',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

checklistSubmissionSchema.index({ branchId: 1, submissionDate: -1 });
checklistSubmissionSchema.index({ checklistId: 1, branchId: 1 });

// =============================================
// 4. الحوادث (Incidents)
// =============================================
const correctiveActionSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    responsible: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue'],
      default: 'pending',
    },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    incidentNumber: { type: String, unique: true, required: true }, // INC-2024-0001
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'fall',
        'medication_error',
        'equipment_failure',
        'behavior',
        'abuse',
        'infection',
        'near_miss',
        'other',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['insignificant', 'minor', 'moderate', 'major', 'catastrophic'],
      required: true,
    },
    category: {
      type: String,
      enum: ['patient_safety', 'staff_safety', 'environmental', 'operational'],
      required: true,
    },
    occurredAt: { type: Date, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    involvedPersons: { type: [mongoose.Schema.Types.Mixed], default: [] },
    immediateActionTaken: { type: String, default: null },
    witnesses: { type: [String], default: [] },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rootCause: { type: String, default: null },
    rcaMethod: {
      type: String,
      enum: ['five_why', 'fishbone', 'fault_tree', null],
      default: null,
    },
    rcaDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    correctiveActions: { type: [correctiveActionSchema], default: [] },
    preventiveActions: { type: [correctiveActionSchema], default: [] },
    status: {
      type: String,
      enum: ['reported', 'investigating', 'rca_in_progress', 'action_plan', 'monitoring', 'closed'],
      default: 'reported',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedAt: { type: Date, default: null },
    closureNotes: { type: String, default: null },
    reportedToMoh: { type: Boolean, default: false },
  },
  { timestamps: true }
);

incidentSchema.index({ branchId: 1, status: 1 });
incidentSchema.index({ incidentNumber: 1 });
incidentSchema.index({ severity: 1, createdAt: -1 });

// =============================================
// 5. الشكاوى (Complaints)
// =============================================
const complaintSchema = new mongoose.Schema(
  {
    complaintNumber: { type: String, unique: true, required: true }, // CMP-2024-0001
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    source: {
      type: String,
      enum: ['beneficiary', 'guardian', 'employee', 'external', 'anonymous'],
      required: true,
    },
    complainantType: { type: String, default: null }, // 'Beneficiary' | 'Guardian'
    complainantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    complainantName: { type: String, default: null },
    complainantPhone: { type: String, default: null },
    category: {
      type: String,
      enum: [
        'service_quality',
        'staff_behavior',
        'waiting_time',
        'facility',
        'billing',
        'clinical',
        'other',
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    description: { type: String, required: true },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    investigationNotes: { type: String, default: null },
    resolution: { type: String, default: null },
    status: {
      type: String,
      enum: ['open', 'investigating', 'pending_response', 'resolved', 'closed', 'escalated'],
      default: 'open',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    satisfactionRating: { type: Number, min: 1, max: 5, default: null },
    slaTracking: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

complaintSchema.index({ branchId: 1, status: 1 });
complaintSchema.index({ complaintNumber: 1 });

// =============================================
// 6. استبيانات الرضا (Satisfaction Surveys)
// =============================================
const satisfactionSurveySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    respondentType: { type: String, enum: ['Beneficiary', 'Guardian'], required: true },
    respondentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    surveyType: {
      type: String,
      enum: ['general', 'service', 'discharge', 'annual'],
      default: 'general',
    },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    npsScore: { type: Number, required: true, min: 0, max: 10 },
    ratings: { type: [mongoose.Schema.Types.Mixed], default: [] },
    positiveFeedback: { type: String, default: null },
    improvementSuggestions: { type: String, default: null },
    wouldRecommend: { type: Boolean, default: null },
    channel: {
      type: String,
      enum: ['app', 'sms_link', 'tablet', 'paper'],
      default: 'app',
    },
  },
  { timestamps: true }
);

satisfactionSurveySchema.index({ branchId: 1, createdAt: -1 });
satisfactionSurveySchema.index({ npsScore: 1 });

// =============================================
// 7. التدقيق (Audits)
// =============================================
const auditFindingSchema = new mongoose.Schema(
  {
    standardCode: { type: String },
    finding: { type: String, required: true },
    type: {
      type: String,
      enum: ['conformity', 'minor_nc', 'major_nc', 'observation'],
      required: true,
    },
    evidence: { type: String, default: null },
  },
  { _id: false }
);

const auditActionSchema = new mongoose.Schema(
  {
    findingRef: { type: String },
    action: { type: String, required: true },
    responsible: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
  },
  { _id: false }
);

const auditSchema = new mongoose.Schema(
  {
    auditNumber: { type: String, unique: true, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    type: {
      type: String,
      enum: ['internal', 'external', 'mock', 'surveillance'],
      required: true,
    },
    standard: {
      type: String,
      enum: ['cbahi', 'jci', 'moh', 'internal'],
      required: true,
    },
    scope: { type: String, required: true },
    plannedDate: { type: Date, required: true },
    actualDate: { type: Date, default: null },
    auditors: { type: [mongoose.Schema.Types.Mixed], default: [] },
    departmentsAudited: { type: [String], default: [] },
    findings: { type: [auditFindingSchema], default: [] },
    totalStandardsChecked: { type: Number, default: 0 },
    conformities: { type: Number, default: 0 },
    minorNonconformities: { type: Number, default: 0 },
    majorNonconformities: { type: Number, default: 0 },
    observations: { type: Number, default: 0 },
    overallComplianceRate: { type: Number, default: null },
    summary: { type: String, default: null },
    actionPlan: { type: [auditActionSchema], default: [] },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'report_pending', 'closed'],
      default: 'planned',
    },
  },
  { timestamps: true }
);

auditSchema.index({ branchId: 1, status: 1 });

// =============================================
// 8. مشاريع التحسين PDCA
// =============================================
const improvementProjectSchema = new mongoose.Schema(
  {
    projectNumber: { type: String, unique: true, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    titleAr: { type: String, required: true },
    titleEn: { type: String, default: null },
    problemStatement: { type: String, required: true }, // Plan
    objective: { type: String, required: true },
    planPhase: { type: mongoose.Schema.Types.Mixed, default: null },
    doPhase: { type: mongoose.Schema.Types.Mixed, default: null },
    checkPhase: { type: mongoose.Schema.Types.Mixed, default: null },
    actPhase: { type: mongoose.Schema.Types.Mixed, default: null },
    currentPhase: {
      type: String,
      enum: ['plan', 'do', 'check', 'act', 'closed'],
      default: 'plan',
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamMembers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    startDate: { type: Date, required: true },
    targetEndDate: { type: Date, required: true },
    actualEndDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

improvementProjectSchema.index({ branchId: 1, status: 1 });

// =============================================
// 9. إدارة المخاطر (Risk Management)
// =============================================
const riskSchema = new mongoose.Schema(
  {
    riskNumber: { type: String, unique: true, required: true }, // RSK-2024-0001
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    category: {
      type: String,
      enum: ['clinical', 'operational', 'financial', 'legal', 'reputational', 'safety', 'it'],
      required: true,
    },
    titleAr: { type: String, required: true },
    description: { type: String, required: true },
    source: { type: String, default: null },
    likelihood: { type: Number, min: 1, max: 5, required: true }, // 1=نادر, 5=شبه مؤكد
    impact: { type: Number, min: 1, max: 5, required: true }, // 1=ضئيل, 5=كارثي
    riskScore: { type: Number }, // likelihood * impact
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    existingControls: { type: [String], default: [] },
    residualLikelihood: { type: Number, default: null },
    residualImpact: { type: Number, default: null },
    residualRiskScore: { type: Number, default: null },
    mitigationActions: { type: [correctiveActionSchema], default: [] },
    treatmentStrategy: {
      type: String,
      enum: ['avoid', 'reduce', 'transfer', 'accept', null],
      default: null,
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['open', 'mitigating', 'monitoring', 'closed', 'accepted'],
      default: 'open',
    },
  },
  { timestamps: true }
);

// حساب درجة المخاطرة تلقائياً
riskSchema.pre('save', function (next) {
  this.riskScore = this.likelihood * this.impact;
  const score = this.riskScore;
  if (score >= 17) this.riskLevel = 'critical';
  else if (score >= 10) this.riskLevel = 'high';
  else if (score >= 5) this.riskLevel = 'medium';
  else this.riskLevel = 'low';

  if (this.residualLikelihood && this.residualImpact) {
    this.residualRiskScore = this.residualLikelihood * this.residualImpact;
  }
  next();
});

riskSchema.index({ branchId: 1, riskLevel: 1, status: 1 });

// Exports
const QualityStandard =
  mongoose.models.QualityStandard || mongoose.model('QualityStandard', qualityStandardSchema);
const Checklist = mongoose.models.Checklist || mongoose.model('Checklist', checklistSchema);
const ChecklistSubmission =
  mongoose.models.ChecklistSubmission ||
  mongoose.model('ChecklistSubmission', checklistSubmissionSchema);
const Incident = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);
const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
const SatisfactionSurvey =
  mongoose.models.SatisfactionSurvey ||
  mongoose.model('SatisfactionSurvey', satisfactionSurveySchema);
const Audit = mongoose.models.Audit || mongoose.model('Audit', auditSchema);
const ImprovementProject =
  mongoose.models.ImprovementProject ||
  mongoose.model('ImprovementProject', improvementProjectSchema);
const Risk = mongoose.models.Risk || mongoose.model('Risk', riskSchema);

module.exports = {
  QualityStandard,
  Checklist,
  ChecklistSubmission,
  Incident,
  Complaint,
  SatisfactionSurvey,
  Audit,
  ImprovementProject,
  Risk,
};

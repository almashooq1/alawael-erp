/**
 * Audit Engagement Models
 * إدارة التدقيق المالي - Audit Planning, Fieldwork, Findings
 * Corrective actions, external audit support, audit opinions
 */
const mongoose = require('mongoose');

const auditEngagementSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    engagementNumber: { type: String, unique: true },
    title: { type: String, required: true },
    titleEn: { type: String },
    description: { type: String },
    auditType: {
      type: String,
      enum: [
        'internal',
        'external',
        'regulatory',
        'compliance',
        'operational',
        'forensic',
        'it_audit',
        'special_purpose',
        'tax_audit',
        'zatca_audit',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'planning',
        'fieldwork',
        'review',
        'draft_report',
        'management_response',
        'final_report',
        'closed',
        'cancelled',
      ],
      default: 'planning',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    riskRating: {
      type: String,
      enum: ['high_risk', 'medium_risk', 'low_risk'],
      default: 'medium_risk',
    },
    scope: {
      departments: [{ type: String }],
      processes: [{ type: String }],
      accounts: [{ type: String }],
      period: { startDate: { type: Date }, endDate: { type: Date } },
      materialityThreshold: { type: Number, default: 0 },
      samplingMethod: {
        type: String,
        enum: ['random', 'systematic', 'stratified', 'judgmental', 'monetary_unit'],
      },
      sampleSize: { type: Number },
    },
    timeline: {
      planningStart: { type: Date },
      planningEnd: { type: Date },
      fieldworkStart: { type: Date },
      fieldworkEnd: { type: Date },
      reportDraftDate: { type: Date },
      managementResponseDate: { type: Date },
      finalReportDate: { type: Date },
      followUpDate: { type: Date },
    },
    team: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['lead_auditor', 'auditor', 'specialist', 'reviewer', 'observer'],
        },
        hoursAllocated: { type: Number, default: 0 },
        hoursSpent: { type: Number, default: 0 },
      },
    ],
    externalAuditor: {
      firmName: { type: String },
      leadPartner: { type: String },
      contactEmail: { type: String },
      engagementLetter: { type: String },
      fees: { type: Number, default: 0 },
    },
    workPapers: [
      {
        paperRef: { type: String },
        title: { type: String },
        section: { type: String },
        preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['draft', 'prepared', 'reviewed', 'approved'],
          default: 'draft',
        },
        filePath: { type: String },
      },
    ],
    findings: [
      {
        findingNumber: { type: String },
        title: { type: String },
        description: { type: String },
        category: {
          type: String,
          enum: [
            'control_weakness',
            'non_compliance',
            'error',
            'fraud',
            'inefficiency',
            'observation',
            'improvement',
          ],
        },
        severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'observation'] },
        criteria: { type: String },
        condition: { type: String },
        cause: { type: String },
        effect: { type: String },
        recommendation: { type: String },
        managementResponse: { type: String },
        agreedAction: { type: String },
        responsible: { type: String },
        targetDate: { type: Date },
        status: {
          type: String,
          enum: ['open', 'in_progress', 'resolved', 'verified', 'accepted_risk'],
          default: 'open',
        },
        followUpDate: { type: Date },
        evidence: [{ type: String }],
      },
    ],
    correctiveActions: [
      {
        actionNumber: { type: String },
        finding: { type: String },
        description: { type: String },
        assignedTo: { type: String },
        dueDate: { type: Date },
        completedDate: { type: Date },
        status: {
          type: String,
          enum: ['planned', 'in_progress', 'completed', 'verified', 'overdue'],
          default: 'planned',
        },
        effectiveness: {
          type: String,
          enum: ['effective', 'partially_effective', 'ineffective', 'not_verified'],
        },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    auditOpinion: {
      type: {
        type: String,
        enum: ['unqualified', 'qualified', 'adverse', 'disclaimer', 'not_applicable'],
      },
      emphasisOfMatter: [{ type: String }],
      keyAuditMatters: [{ type: String }],
      goingConcern: { type: Boolean, default: false },
      notes: { type: String },
    },
    budget: {
      plannedHours: { type: Number, default: 0 },
      actualHours: { type: Number, default: 0 },
      plannedCost: { type: Number, default: 0 },
      actualCost: { type: Number, default: 0 },
    },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

auditEngagementSchema.pre('save', async function () {
  if (!this.engagementNumber) {
    const count = await this.constructor.countDocuments();
    this.engagementNumber = `AUD-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.models.AuditEngagement || mongoose.model('AuditEngagement', auditEngagementSchema);

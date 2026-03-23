/**
 * Compliance & Internal Controls Models
 * الامتثال والرقابة الداخلية - Internal Audit, SOX Controls, Risk Register
 * Control testing, compliance tracking, audit findings, risk assessment
 */
const mongoose = require('mongoose');

const controlSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    controlNumber: { type: String, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    description: { type: String },
    category: {
      type: String,
      enum: [
        'financial_reporting',
        'revenue_cycle',
        'expenditure_cycle',
        'payroll',
        'treasury',
        'tax',
        'fixed_assets',
        'inventory',
        'it_general',
        'entity_level',
        'disclosure',
        'other',
      ],
      default: 'financial_reporting',
    },
    controlType: {
      type: String,
      enum: ['preventive', 'detective', 'corrective', 'directive'],
      default: 'preventive',
    },
    frequency: {
      type: String,
      enum: ['continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc'],
      default: 'monthly',
    },
    automationLevel: {
      type: String,
      enum: ['manual', 'semi_automated', 'fully_automated'],
      default: 'manual',
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ownerName: { type: String },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    assertions: [
      {
        type: String,
        enum: [
          'existence',
          'completeness',
          'valuation',
          'rights',
          'presentation',
          'accuracy',
          'cutoff',
        ],
      },
    ],
    testResults: [
      {
        testDate: { type: Date },
        tester: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        testerName: { type: String },
        sampleSize: { type: Number },
        exceptionsFound: { type: Number, default: 0 },
        result: {
          type: String,
          enum: ['effective', 'ineffective', 'partially_effective', 'not_tested'],
          default: 'not_tested',
        },
        findings: { type: String },
        recommendations: { type: String },
        managementResponse: { type: String },
        remediationDate: { type: Date },
      },
    ],
    lastTestDate: { type: Date },
    lastTestResult: {
      type: String,
      enum: ['effective', 'ineffective', 'partially_effective', 'not_tested'],
      default: 'not_tested',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'under_review', 'remediation'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

controlSchema.pre('save', async function (next) {
  if (!this.controlNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.controlNumber = `CTL-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const InternalControl = mongoose.models.InternalControl || mongoose.model('InternalControl', controlSchema);

// Compliance Item - بند الامتثال
const complianceItemSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    itemNumber: { type: String, unique: true },
    regulation: { type: String, required: true },
    regulationEn: { type: String },
    regulatoryBody: {
      type: String,
      enum: ['zatca', 'sama', 'cma', 'gosi', 'mol', 'moci', 'socpa', 'other'],
      default: 'zatca',
    },
    requirement: { type: String, required: true },
    deadline: { type: Date },
    frequency: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly', 'semi_annual', 'annual'],
      default: 'annual',
    },
    responsiblePerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responsibleName: { type: String },
    evidence: [
      {
        description: { type: String },
        documentUrl: { type: String },
        uploadedAt: { type: Date },
      },
    ],
    complianceStatus: {
      type: String,
      enum: ['compliant', 'non_compliant', 'partially_compliant', 'pending', 'not_applicable'],
      default: 'pending',
    },
    penaltyRisk: { type: Number, default: 0 },
    lastAssessmentDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

complianceItemSchema.pre('save', async function (next) {
  if (!this.itemNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.itemNumber = `CMP-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const ComplianceItem = mongoose.models.ComplianceItem || mongoose.model('ComplianceItem', complianceItemSchema);

module.exports = { InternalControl, ComplianceItem };

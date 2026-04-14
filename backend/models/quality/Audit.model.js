'use strict';

const mongoose = require('mongoose');

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

const Audit = mongoose.models.Audit || mongoose.model('Audit', auditSchema);

module.exports = Audit;

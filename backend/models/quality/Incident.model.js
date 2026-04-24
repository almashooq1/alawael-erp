'use strict';

const mongoose = require('mongoose');

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
        'seizure',
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

    // Structured beneficiary linkage — distinct from `involvedPersons`
    // which stayed Mixed-typed for back-compat with pre-existing
    // clinical-incident UI flows. New incidents populate this field
    // for first-class queryability (used by beneficiary-360 flags
    // safety.incident.critical.open, clinical.seizure.cluster.48h,
    // safety.fall.repeat.30d).
    beneficiaryIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' }],
      default: [],
      index: true,
    },
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
incidentSchema.index({ severity: 1, createdAt: -1 }); // incidentNumber already indexed via unique:true
// Red-flag queries: "open incidents for this beneficiary by type/occurrence date"
incidentSchema.index({ beneficiaryIds: 1, status: 1 });
incidentSchema.index({ beneficiaryIds: 1, type: 1, occurredAt: -1 });

const Incident = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);

module.exports = Incident;

'use strict';

const mongoose = require('mongoose');

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

const Checklist = mongoose.models.Checklist || mongoose.model('Checklist', checklistSchema);

module.exports = Checklist;

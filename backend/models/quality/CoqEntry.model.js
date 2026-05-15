'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const coqEntrySchema = new Schema(
  {
    entryNumber: { type: String, unique: true, index: true }, // COQ-YYYY-NNNN
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },

    period: {
      year: { type: Number, required: true, index: true },
      month: { type: Number, required: true, min: 1, max: 12, index: true },
    },

    category: {
      type: String,
      enum: ['prevention', 'appraisal', 'internal_failure', 'external_failure'],
      required: true,
      index: true,
    },
    subcategory: { type: String, default: null },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR' },

    // Optional links to the source artefact.
    sourceType: { type: String, default: null }, // e.g. 'incident', 'complaint', 'capa', 'po'
    sourceId: { type: Schema.Types.ObjectId, default: null },

    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'coq_entries' }
);

coqEntrySchema.index({ branchId: 1, 'period.year': 1, 'period.month': 1, category: 1 });

coqEntrySchema.pre('validate', async function () {
  if (!this.entryNumber) {
    const year = (this.period && this.period.year) || new Date().getUTCFullYear();
    const Model = mongoose.model('CoqEntry');
    const count = await Model.countDocuments({ entryNumber: { $regex: `^COQ-${year}-` } });
    this.entryNumber = `COQ-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.models.CoqEntry || mongoose.model('CoqEntry', coqEntrySchema);

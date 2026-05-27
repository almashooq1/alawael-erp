'use strict';

/**
 * TherapistTemplate — reusable note/letter/SOAP templates owned by
 * the therapist. Different from `FormTemplate` (organisation-wide
 * structured forms) and `ContractTemplate` (legal/finance).
 *
 * Used by `routes/therapistPro.routes.js` `/templates`. Tracks
 * `usageCount` so frequently-used templates can surface first.
 */

const mongoose = require('mongoose');

if (mongoose.models.TherapistTemplate) {
  module.exports = mongoose.models.TherapistTemplate;
} else {
  const schema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      title: { type: String, required: true, trim: true },
      kind: {
        type: String,
        enum: ['soap', 'progress_note', 'parent_letter', 'home_program', 'discharge', 'other'],
        default: 'soap',
      },
      content: { type: String, required: true },
      placeholders: { type: [String], default: [] }, // ['{patientName}', '{date}']
      usageCount: { type: Number, default: 0 },
      lastUsedAt: { type: Date, default: null },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapisttemplates' }
  );

  schema.index({ therapist: 1, kind: 1 });

  module.exports =
    mongoose.models.TherapistTemplate || mongoose.model('TherapistTemplate', schema);
}

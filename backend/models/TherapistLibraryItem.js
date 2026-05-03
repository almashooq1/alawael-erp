'use strict';

/**
 * TherapistLibraryItem — therapist's personal resource library
 * (saved articles, videos, exercises, references). Distinct from
 * `ActivityLibrary` (clinic-wide activity catalog) and from
 * elearning content. Used by `routes/therapistPro.routes.js` `/library`.
 */

const mongoose = require('mongoose');

if (mongoose.models.TherapistLibraryItem) {
  module.exports = mongoose.models.TherapistLibraryItem;
} else {
  const schema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      title: { type: String, required: true, trim: true },
      kind: {
        type: String,
        enum: ['article', 'video', 'exercise', 'reference', 'protocol', 'other'],
        default: 'reference',
      },
      url: { type: String, default: null },
      content: { type: String, default: null },
      tags: { type: [String], default: [] },
      addedAt: { type: Date, default: Date.now },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapistlibraryitems' }
  );

  schema.index({ therapist: 1, kind: 1 });

  module.exports = mongoose.model('TherapistLibraryItem', schema);
}

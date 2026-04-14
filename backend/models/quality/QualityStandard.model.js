'use strict';

const mongoose = require('mongoose');

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

const QualityStandard =
  mongoose.models.QualityStandard || mongoose.model('QualityStandard', qualityStandardSchema);

module.exports = QualityStandard;

'use strict';

/**
 * ICF Code Reference Model — نموذج مرجع رموز ICF
 *
 * يحتوي على بيانات رموز ICF المرجعية المستخدمة في التقييمات.
 */

const mongoose = require('mongoose');

/* ─── ICF Reference Data Schema ────────────────────────────────────────────── */

const icfCodeReferenceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    component: {
      type: String,
      required: true,
      enum: ['bodyFunctions', 'bodyStructures', 'activitiesParticipation', 'environmentalFactors'],
    },
    chapter: { type: Number, required: true },
    level: { type: Number, required: true, min: 1, max: 4 },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    includes: [String],
    excludes: [String],
    parentCode: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

icfCodeReferenceSchema.index({ component: 1, chapter: 1 });
icfCodeReferenceSchema.index({ parentCode: 1 });

/* ─── Registration Guard & Export ─────────────────────────────────────────── */

const ICFCodeReference =
  mongoose.models.ICFCodeReference || mongoose.model('ICFCodeReference', icfCodeReferenceSchema);

module.exports = ICFCodeReference;

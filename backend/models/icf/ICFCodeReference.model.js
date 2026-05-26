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

    // W448 — Core Set memberships (Brief / Comprehensive per WHO Core Set framework).
    // Allows a code to belong to multiple sets (e.g., b117 is in both Generic Brief
    // and ID Comprehensive). The setName convention: '{condition}_{tier}' lowercase,
    // e.g., 'generic_brief', 'cp_brief', 'asd_comprehensive'.
    coreSetMemberships: [
      {
        setName: { type: String, required: true },
        setVersion: { type: String, default: '2017' },
        isCanonical: { type: Boolean, default: true },
      },
    ],

    // W448 — ICF-CY (Children and Youth) version codes that are NOT in the adult
    // ICF. Most codes are shared; this flag isolates the pediatric-only additions.
    isCyOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

icfCodeReferenceSchema.index({ component: 1, chapter: 1 });
icfCodeReferenceSchema.index({ parentCode: 1 });
icfCodeReferenceSchema.index({ 'coreSetMemberships.setName': 1 });

/* ─── Registration Guard & Export ─────────────────────────────────────────── */

const ICFCodeReference =
  mongoose.models.ICFCodeReference || mongoose.model('ICFCodeReference', icfCodeReferenceSchema);

module.exports = ICFCodeReference;

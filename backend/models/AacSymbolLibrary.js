/**
 * AacSymbolLibrary — مكتبة رموز التواصل البديل
 * ════════════════════════════════════════════════════════════════════
 * Wave 263 — AAC Foundation
 *
 * Admin-managed library of Arabic-first communication symbols used to
 * build beneficiary-specific boards in later waves. Each symbol carries
 * label_ar (required), category, optional image URL, and aliases for
 * search.
 *
 * Wave-18 invariants:
 *   - code is unique ASCII slug, lowercase, [a-z0-9_-]+
 *   - status transitions: draft → published → archived (one-way)
 *   - label_ar required; label_en optional
 *
 * @module models/AacSymbolLibrary
 */

'use strict';

const mongoose = require('mongoose');

const SLUG_RE = /^[a-z0-9_-]{1,80}$/;

const SYMBOL_CATEGORIES = [
  'food',
  'drink',
  'people',
  'places',
  'actions',
  'feelings',
  'body',
  'clothing',
  'religion_culture',
  'school',
  'home',
  'colors',
  'numbers',
  'time',
  'social_questions',
  'transport',
  'animals',
  'weather',
  'health',
  'other',
];

const aacSymbolSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [SLUG_RE, 'code must be lowercase ASCII slug'],
      index: true,
    },
    label_ar: { type: String, required: true, trim: true },
    label_en: { type: String, trim: true },
    category: {
      type: String,
      enum: SYMBOL_CATEGORIES,
      required: true,
      index: true,
    },
    imageUrl: { type: String, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    aliases: [{ type: String, trim: true }], // alt Arabic terms for search

    isCulturalSaudi: { type: Boolean, default: false, index: true }, // KSA-specific
    isCore: { type: Boolean, default: false }, // belongs to core-vocabulary set

    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

aacSymbolSchema.index({ category: 1, status: 1 });
aacSymbolSchema.index({ label_ar: 'text', label_en: 'text', aliases: 'text' });

aacSymbolSchema.statics.SYMBOL_CATEGORIES = SYMBOL_CATEGORIES;

module.exports =
  mongoose.models.AacSymbolLibrary || mongoose.model('AacSymbolLibrary', aacSymbolSchema);

/**
 * ReportTemplate.js — Report Template Model
 * ═══════════════════════════════════════════════════
 * Stores report template layouts, sections, and fields.
 */

'use strict';

const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea', 'checkbox', 'signature', 'image', 'table'],
      required: true,
    },
    required: { type: Boolean, default: false },
    defaultValue: { type: mongoose.Schema.Types.Mixed },
    options: [{ type: String }], // for select/multiselect
    validation: {
      min: Number,
      max: Number,
      pattern: String,
      message: String,
    },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, default: 0 },
    fields: [fieldSchema],
    collapsible: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
  },
  { _id: false }
);

const reportTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      enum: ['clinical', 'hr', 'financial', 'operational', 'quality', 'custom'],
      required: true,
    },
    sections: [sectionSchema],
    tags: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    version: { type: Number, default: 1 },
    parentTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      default: null,
    },
  },
  { timestamps: true }
);

reportTemplateSchema.index({ category: 1, isActive: 1 });
reportTemplateSchema.index({ createdBy: 1, category: 1 });
reportTemplateSchema.index({ tags: 1 });

module.exports = mongoose.model('ReportTemplate', reportTemplateSchema);

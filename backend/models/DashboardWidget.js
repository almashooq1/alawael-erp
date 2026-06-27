/**
 * DashboardWidget.js — Dashboard Widget Configuration Model
 * ═══════════════════════════════════════════════════════
 * Stores user-defined dashboard widget layouts and preferences.
 */

'use strict';

const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['stat', 'chart', 'table', 'list', 'alert', 'custom'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      w: { type: Number, default: 4 },
      h: { type: Number, default: 4 },
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dataSource: {
      type: String,
      enum: ['beneficiaries', 'sessions', 'assessments', 'staff', 'financial', 'custom'],
      default: 'custom',
    },
    refreshInterval: {
      type: Number,
      default: 300, // seconds
      min: 30,
    },
    isVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

const dashboardWidgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Default Dashboard',
    },
    widgets: [widgetSchema],
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure one default per user
dashboardWidgetSchema.index({ userId: 1, isDefault: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('DashboardWidget', dashboardWidgetSchema);

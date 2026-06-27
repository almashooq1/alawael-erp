/**
 * VisualizationChart.js — Visualization Chart Model
 * ═══════════════════════════════════════════════════
 * Stores chart configurations and datasets.
 */

'use strict';

const mongoose = require('mongoose');

const chartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['line', 'bar', 'pie', 'doughnut', 'radar', 'scatter', 'area', 'heatmap'],
      required: true,
    },
    description: { type: String, trim: true },
    dataSource: {
      type: String,
      enum: ['beneficiaries', 'sessions', 'assessments', 'staff', 'financial', 'custom', 'api'],
      default: 'custom',
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dataset: {
      labels: [{ type: String }],
      datasets: [{
        label: String,
        data: [Number],
        backgroundColor: [String],
        borderColor: [String],
      }],
    },
    filters: {
      dateRange: {
        from: Date,
        to: Date,
      },
      branch: String,
      department: String,
    },
    isPublic: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

chartSchema.index({ createdBy: 1, type: 1 });
chartSchema.index({ isPublic: 1, type: 1 });

module.exports = mongoose.model('VisualizationChart', chartSchema);

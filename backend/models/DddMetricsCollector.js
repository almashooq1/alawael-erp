'use strict';
/**
 * DddMetricsCollector Model
 * Auto-extracted from services/dddMetricsCollector.js
 */
const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['counter', 'gauge', 'histogram', 'summary', 'timer'],
      required: true,
    },
    value: { type: Number, required: true },
    tags: { type: Map, of: String, default: {} },
    domain: String,
    branchId: { type: mongoose.Schema.Types.ObjectId },
    route: String,
    method: String,
    statusCode: Number,
    durationMs: Number,
    bucket: String, // time bucket for aggregation (e.g., '2026-04-09T14:00')
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

metricSchema.index({ name: 1, createdAt: -1 });
metricSchema.index({ name: 1, bucket: 1 });
metricSchema.index({ domain: 1, createdAt: -1 });
metricSchema.index({ route: 1, method: 1, createdAt: -1 });

const DDDMetricEntry =
  mongoose.models.DDDMetricEntry || mongoose.model('DDDMetricEntry', metricSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Metric Types & In-Memory Buffers
   ═══════════════════════════════════════════════════════════════════════ */
const METRIC_TYPES = ['counter', 'gauge', 'histogram', 'summary', 'timer'];

/** In-memory counters for hot-path metrics */
const memCounters = {};
const memGauges = {};
const memHistograms = {};
const memBuffer = [];
const BUFFER_FLUSH_SIZE = 100;
const BUFFER_FLUSH_INTERVAL = 60000; // 1 minute

module.exports = {
  DDDMetricEntry,
};

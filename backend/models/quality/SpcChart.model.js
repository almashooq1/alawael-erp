'use strict';

/**
 * SpcChart.model.js — World-Class QMS Phase 29 Commit 3.
 *
 * Persists an SPC chart with its measurement series. The compute layer
 * lives in `services/quality/spc.service.js` — the model is dumb.
 *
 * One chart = one process characteristic over time. Add data points
 * to the series; control limits are recomputed on demand.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// A measurement subgroup. For continuous charts each `values[]` holds
// the individual measurements; for attribute charts we use `defective`,
// `sampleSize`, `count`, `units`.
const measurementSchema = new Schema(
  {
    collectedAt: { type: Date, required: true },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    values: { type: [Number], default: [] }, // continuous
    sampleSize: { type: Number, default: null }, // p, np
    defective: { type: Number, default: null }, // p, np
    count: { type: Number, default: null }, // c, u (defects)
    units: { type: Number, default: null }, // u
    note: { type: String, default: null },
  },
  { _id: true }
);

const spcSchema = new Schema(
  {
    chartNumber: { type: String, unique: true, index: true }, // SPC-YYYY-NNNN
    title: { type: String, required: true },
    description: { type: String, default: null },
    chartType: {
      type: String,
      enum: ['xbar_r', 'xbar_s', 'imr', 'p', 'np', 'c', 'u'],
      required: true,
    },
    metric: { type: String, required: true }, // human label of what's measured
    unit: { type: String, default: null }, // mg/dL, %, count, …
    subgroupSize: { type: Number, default: null }, // for x-bar charts

    // Specification limits — used for capability when present.
    usl: { type: Number, default: null },
    lsl: { type: Number, default: null },
    target: { type: Number, default: null },

    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },

    // Linkage.
    indicatorId: { type: Schema.Types.ObjectId, ref: 'QualityIndicator', default: null },

    measurements: { type: [measurementSchema], default: [] },

    status: {
      type: String,
      enum: ['active', 'paused', 'archived'],
      default: 'active',
      index: true,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'spc_charts' }
);

spcSchema.index({ branchId: 1, status: 1, chartType: 1 });

spcSchema.pre('validate', async function () {
  if (!this.chartNumber) {
    const year = new Date().getUTCFullYear();
    const Model = mongoose.model('SpcChart');
    const count = await Model.countDocuments({
      chartNumber: { $regex: `^SPC-${year}-` },
    });
    this.chartNumber = `SPC-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.models.SpcChart || mongoose.model('SpcChart', spcSchema);

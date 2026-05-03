'use strict';

/**
 * TherapyCustomKPI — therapist-defined ad-hoc KPIs distinct from the
 * system-wide `KPI.js`/`KpiDefinition.js` registry. Used by
 * `routes/therapistUltra.routes.js` `/kpis`. Lighter — just a target
 * with periodic measurements logged inline.
 */

const mongoose = require('mongoose');

if (mongoose.models.TherapyCustomKPI) {
  module.exports = mongoose.models.TherapyCustomKPI;
} else {
  const measurementSchema = new mongoose.Schema(
    {
      date: { type: Date, default: Date.now },
      value: { type: Number, required: true },
      notes: { type: String, default: null },
    },
    { _id: false }
  );

  const schema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      name: { type: String, required: true, trim: true },
      description: { type: String, default: null },
      unit: { type: String, default: null }, // '%', 'count', 'minutes'
      target: { type: Number, default: null },
      direction: {
        type: String,
        enum: ['higher_is_better', 'lower_is_better'],
        default: 'higher_is_better',
      },
      measurements: { type: [measurementSchema], default: [] },
      currentValue: { type: Number, default: null },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapycustomkpis' }
  );

  schema.index({ therapist: 1 });

  module.exports = mongoose.model('TherapyCustomKPI', schema);
}

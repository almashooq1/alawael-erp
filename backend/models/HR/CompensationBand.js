'use strict';

const mongoose = require('mongoose');

const CompensationBandSchema = new mongoose.Schema(
  {
    bandCode: { type: String, required: true, unique: true, maxlength: 20 }, // e.g. "L4"
    bandName: { type: String, required: true, maxlength: 100 },
    bandNameAr: { type: String, maxlength: 100 },
    level: { type: Number, required: true, min: 1, max: 20 },
    jobFamily: { type: String, maxlength: 100 }, // engineering, sales, hr, ...
    minSalary: { type: Number, required: true, min: 0 },
    midSalary: { type: Number, required: true, min: 0 },
    maxSalary: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR', maxlength: 5 },
    isActive: { type: Boolean, default: true, index: true },
    effectiveDate: { type: Date, default: Date.now },
    description: { type: String, maxlength: 1000 },
  },
  { timestamps: true, collection: 'hr_compensation_bands' }
);

CompensationBandSchema.index({ jobFamily: 1, level: 1 });

module.exports =
  mongoose.models.CompensationBand || mongoose.model('CompensationBand', CompensationBandSchema);

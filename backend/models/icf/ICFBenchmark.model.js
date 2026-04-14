'use strict';

/**
 * ICF Benchmark Model — نموذج بيانات المعايير المرجعية لـ ICF
 *
 * يحتوي على بيانات إحصائية مرجعية لمقارنة نتائج التقييمات
 * بمجموعات السكان المختلفة.
 */

const mongoose = require('mongoose');

/* ─── ICF Benchmark Data Schema ───────────────────────────────────────────── */

const icfBenchmarkSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, index: true },
    population: {
      type: String,
      required: true,
      enum: [
        'general',
        'pediatric',
        'geriatric',
        'stroke',
        'spinalCordInjury',
        'cerebralPalsy',
        'autismSpectrum',
        'intellectualDisability',
        'musculoskeletal',
        'mentalHealth',
        'saudiArabia',
        'gccRegion',
        'middleEast',
      ],
    },
    ageGroup: { type: String },
    sampleSize: { type: Number },
    mean: { type: Number, required: true },
    median: { type: Number },
    standardDeviation: { type: Number },
    percentile25: { type: Number },
    percentile75: { type: Number },
    dataSource: { type: String, required: true },
    publicationYear: { type: Number },
    region: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

icfBenchmarkSchema.index({ code: 1, population: 1 });
icfBenchmarkSchema.index({ population: 1, code: 1 });

/* ─── Registration Guard & Export ─────────────────────────────────────────── */

const ICFBenchmark =
  mongoose.models.ICFBenchmark || mongoose.model('ICFBenchmark', icfBenchmarkSchema);

module.exports = ICFBenchmark;

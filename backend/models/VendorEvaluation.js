/* eslint-disable no-unused-vars */
/**
 * VendorEvaluation Model — نموذج تقييم الموردين
 */
const mongoose = require('mongoose');

const vendorEvaluationSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    vendorName: { type: String, trim: true },
    period: { type: String, trim: true },
    qualityScore: { type: Number, min: 0, max: 100, default: 0 },
    deliveryScore: { type: Number, min: 0, max: 100, default: 0 },
    priceScore: { type: Number, min: 0, max: 100, default: 0 },
    communicationScore: { type: Number, min: 0, max: 100, default: 0 },
    complianceScore: { type: Number, min: 0, max: 100, default: 0 },
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    comments: String,
  },
  { timestamps: true }
);

vendorEvaluationSchema.index({ vendorId: 1 });
vendorEvaluationSchema.index({ date: -1 });

module.exports =
  mongoose.models.VendorEvaluation || mongoose.model('VendorEvaluation', vendorEvaluationSchema);

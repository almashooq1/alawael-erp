/**
 * LabResult.js — نموذج نتائج التحاليل
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LabParameterSchema = new Schema(
  {
    parameter: { ar: { type: String, required: true }, en: String },
    value: { type: String, required: true },
    numericValue: Number,
    unit: String,
    referenceRange: { low: String, high: String, text: String },
    flag: {
      type: String,
      enum: ['normal', 'low', 'high', 'critical_low', 'critical_high', 'abnormal'],
    },
    method: String,
  },
  { _id: true }
);

const LabResultSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    labOrderNumber: {
      type: String,
      unique: true,
      default: function () {
        return (
          'LAB-' +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 6).toUpperCase()
        );
      },
    },
    orderedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    orderedDate: { type: Date, required: true },
    collectionDate: Date,
    reportDate: Date,
    category: {
      type: String,
      enum: [
        'hematology',
        'chemistry',
        'microbiology',
        'urinalysis',
        'serology',
        'immunology',
        'endocrinology',
        'coagulation',
        'toxicology',
        'genetic',
        'pathology',
        'other',
      ],
      required: true,
    },
    testName: {
      ar: { type: String, required: true },
      en: String,
    },
    loincCode: String,
    specimen: {
      type: {
        type: String,
        enum: ['blood', 'urine', 'csf', 'stool', 'swab', 'tissue', 'sputum', 'other'],
      },
      collectedAt: Date,
      collectedBy: String,
    },
    parameters: [LabParameterSchema],
    overallStatus: {
      type: String,
      enum: ['ordered', 'collected', 'processing', 'completed', 'cancelled', 'preliminary'],
      default: 'ordered',
    },
    interpretation: { ar: String, en: String },
    criticalValues: {
      hasCritical: { type: Boolean, default: false },
      notifiedTo: String,
      notifiedAt: Date,
      acknowledgedBy: String,
    },
    attachments: [
      {
        name: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    reportedBy: String,
    performingLab: String,
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LabResultSchema.index({ beneficiary: 1, orderedDate: -1 });
LabResultSchema.index({ category: 1, overallStatus: 1 });
LabResultSchema.index({ labOrderNumber: 1 });

module.exports =
  mongoose.models.EmrLabResult ||
  mongoose.model('EmrLabResult', LabResultSchema);

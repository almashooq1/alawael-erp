/**
 * Referral.js — نموذج التحويلات الطبية
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReferralSchema = new Schema(
  {
    referralNumber: {
      type: String,
      unique: true,
      default: function () {
        return (
          'REF-' +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 6).toUpperCase()
        );
      },
    },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referralDate: { type: Date, default: Date.now, required: true },
    referralType: {
      type: String,
      enum: ['internal', 'external', 'emergency', 'routine', 'specialist', 'diagnostic', 'therapy', 'surgical'],
      default: 'routine',
    },
    department: String,
    specialty: String,
    referredToProvider: { type: Schema.Types.ObjectId, ref: 'User' },
    referredToFacility: {
      name: String,
      address: String,
      contactPhone: String,
    },
    reason: { ar: { type: String, required: true }, en: String },
    clinicalIndication: String,
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine',
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
    },
    appointmentDate: Date,
    appointmentConfirmed: { type: Boolean, default: false },
    diagnosis: {
      code: String,
      description: { ar: String, en: String },
    },
    notes: { ar: String, en: String },
    documents: [
      {
        name: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date,
    outcome: {
      summary: { ar: String, en: String },
      recommendations: { ar: String, en: String },
      completedAt: Date,
      completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ReferralSchema.index({ beneficiary: 1, referralDate: -1 });
ReferralSchema.index({ status: 1, urgency: 1 });
ReferralSchema.index({ referralNumber: 1 });

module.exports =
  mongoose.models.EmrReferral ||
  mongoose.model('EmrReferral', ReferralSchema);

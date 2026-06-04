'use strict';

const mongoose = require('mongoose');

const AcknowledgementSchema = new mongoose.Schema(
  {
    _id: false,
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    acknowledgedAt: { type: Date, default: Date.now },
    ipAddress: { type: String, maxlength: 50 },
    policyVersion: { type: String, maxlength: 20 },
  },
  { _id: false }
);

const PolicySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 300 },
    titleAr: { type: String, maxlength: 300 },
    slug: { type: String, required: true, unique: true, maxlength: 100 },
    category: {
      type: String,
      enum: [
        'attendance',
        'leave',
        'conduct',
        'safety',
        'compensation',
        'benefits',
        'data_privacy',
        'antiharassment',
        'social_media',
        'travel',
        'other',
      ],
      default: 'other',
      index: true,
    },
    body: { type: String, required: true, maxlength: 100000 },
    bodyAr: { type: String, maxlength: 100000 },
    version: { type: String, default: '1.0', maxlength: 20 },
    status: {
      type: String,
      enum: ['draft', 'published', 'retired'],
      default: 'draft',
      index: true,
    },
    effectiveDate: { type: Date, default: null },
    requiresAcknowledgement: { type: Boolean, default: true },
    acknowledgements: { type: [AcknowledgementSchema], default: [] },
    publishedAt: { type: Date, default: null },
    publishedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'hr_policies' }
);

PolicySchema.virtual('acknowledgedCount').get(function () {
  return (this.acknowledgements || []).length;
});
PolicySchema.set('toJSON', { virtuals: true });
PolicySchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.HrModulePolicy || mongoose.model('HrModulePolicy', PolicySchema);

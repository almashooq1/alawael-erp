'use strict';

/**
 * ToiletingEvent — Wave 178.
 *
 * "سجل الحفاضات والحمام" — care-critical for non-toilet-trained kids
 * and toilet-training progress tracking. Many rows per (beneficiary, day).
 *
 * Not unique per day (multiple events). Indexed for fast per-day per-kid
 * rollup queries.
 */

const mongoose = require('mongoose');

const TYPES = [
  'wet', // تبول
  'bowel', // تبرز
  'both', // كلاهما
  'diaper_change', // تغيير حفاض جاف (روتيني)
  'requested_potty', // طلب الذهاب للحمام (تطور إيجابي)
  'accident', // حادثة بعد التدريب
];

const ToiletingEventSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    eventTime: { type: Date, required: true, default: Date.now },
    type: { type: String, enum: TYPES, required: true },
    wasInDiaper: { type: Boolean, default: true },
    diaperChanged: { type: Boolean, default: false },
    successful: { type: Boolean, default: true }, // false = refused/accident
    notes: { type: String, default: '', maxlength: 300 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    recordedByName: { type: String, default: '', maxlength: 100 },
  },
  { timestamps: true, collection: 'toileting_events' }
);

ToiletingEventSchema.index({ beneficiaryId: 1, date: 1 });
ToiletingEventSchema.index({ beneficiaryId: 1, eventTime: -1 });
ToiletingEventSchema.index({ branchId: 1, date: -1 });

module.exports =
  mongoose.models.ToiletingEvent || mongoose.model('ToiletingEvent', ToiletingEventSchema);

module.exports.TYPES = TYPES;

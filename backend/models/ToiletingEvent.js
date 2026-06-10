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

// ── W1076: unified-core producer ───────────────────────────────────
// Emit toileting_event.potty_requested ONLY for the positive
// toilet-training milestone (child independently asked for the potty),
// NOT for routine wet/bowel/diaper-change/accident rows — those are
// high-frequency care logs, not timeline milestones. Non-callback hook
// style (W483 gate): the global async save plugin puts the whole hook
// chain in promise-adapter mode.
ToiletingEventSchema.pre('save', function flagPottyRequested() {
  this.$__pottyRequestedNow =
    this.isNew && this.type === 'requested_potty' && this.successful === true;
});

ToiletingEventSchema.post('save', function emitPottyRequested(doc) {
  if (!doc.$__pottyRequestedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('toileting-event', 'toileting_event.potty_requested', {
      eventId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      type: doc.type,
      eventTime: doc.eventTime,
      requestedAt: doc.eventTime || doc.createdAt || new Date(),
    });
  } catch (_e) {
    /* bus optional in some contexts */
  }
});

module.exports =
  mongoose.models.ToiletingEvent || mongoose.model('ToiletingEvent', ToiletingEventSchema);

module.exports.TYPES = TYPES;

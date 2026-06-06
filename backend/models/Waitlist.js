const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // Preferences
    department: { type: String, required: true }, // SPEECH, OT, etc.
    preferredTherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional

    preferredDays: [{ type: String, enum: ['SUN', 'MON', 'TUE', 'WED', 'THU'] }],
    preferredTimeRange: {
      start: String, // "14:00"
      end: String, // "18:00"
    },

    priority: { type: String, enum: ['HIGH', 'NORMAL', 'LOW'], default: 'NORMAL' },
    notes: String,

    status: { type: String, enum: ['WAITING', 'OFFERED', 'BOOKED', 'EXPIRED'], default: 'WAITING' },
    expertiryDate: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────
waitlistSchema.index({ beneficiary: 1 });
waitlistSchema.index({ status: 1 });
waitlistSchema.index({ department: 1 });
waitlistSchema.index({ priority: 1 });
waitlistSchema.index({ status: 1, department: 1 });
waitlistSchema.index({ createdAt: -1 });

// W979 — surface the waitlist journey on the unified-core timeline: a new
// waitlist entry (`waitlist.added`) and — the high-value moment — the entry
// being BOOKED (`waitlist.booked` = admission into active care). Native
// pre-compile hooks (schema middleware added after mongoose.model() never
// fires); 0-arg pre + function(doc) post per the proven W970 pattern; guarded,
// fire-and-forget. Consumed by dddCrossModuleSubscribers.js.
waitlistSchema.pre('save', function () {
  this.$__wasNew = this.isNew;
});
waitlistSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
waitlistSchema.post('save', function (doc) {
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    if (!doc.beneficiary) return;
    const base = {
      waitlistId: String(doc._id),
      beneficiaryId: String(doc.beneficiary),
      department: doc.department || '',
      priority: doc.priority || '',
    };
    if (this.$__wasNew) {
      Promise.resolve(integrationBus.publish('waitlist', 'waitlist.added', base)).catch(() => {});
    } else if (doc.status === 'BOOKED' && this.$__prevStatus !== 'BOOKED') {
      Promise.resolve(integrationBus.publish('waitlist', 'waitlist.booked', base)).catch(() => {});
    }
  } catch (_) {
    /* bus not wired — never block persistence */
  }
});

module.exports = mongoose.models.Waitlist || mongoose.model('Waitlist', waitlistSchema);

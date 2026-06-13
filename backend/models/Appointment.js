/**
 * نموذج المواعيد - Appointment Model
 * يدير مواعيد الاستشارات والفحوصات والمتابعات
 * مختلف عن TherapySession: المواعيد هي حجوزات أولية (قبل/بدون جلسة علاجية)
 */

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    // Appointment identification
    appointmentNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Who is the appointment for
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
    },
    beneficiaryName: { type: String }, // Denormalized for quick display
    beneficiaryPhone: { type: String },

    // Guardian/parent who booked
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    bookedByName: { type: String },

    // Who is the appointment with
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    therapistName: { type: String },
    department: { type: String },

    // Appointment type
    type: {
      type: String,
      enum: [
        'استشارة أولية', // Initial consultation
        'متابعة', // Follow-up
        'تقييم', // Assessment/evaluation
        'فحص', // Examination
        'علاج طبيعي', // Physical therapy
        'علاج وظيفي', // Occupational therapy
        'نطق وتخاطب', // Speech therapy
        'علاج سلوكي', // Behavioral therapy
        'علاج نفسي', // Psychology
        'أخرى', // Other
      ],
      default: 'استشارة أولية',
    },

    // Scheduling
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String }, // "10:30"
    duration: { type: Number, default: 30 }, // minutes

    // Room assignment
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapyRoom' },
    location: { type: String },

    // Status workflow
    status: {
      type: String,
      enum: [
        'PENDING', // Waiting for confirmation
        'CONFIRMED', // Confirmed by admin/therapist
        'CHECKED_IN', // Patient arrived
        'IN_PROGRESS', // Appointment started
        'COMPLETED', // Done
        'CANCELLED', // Cancelled
        'NO_SHOW', // Patient didn't show up
        'RESCHEDULED', // Moved to new time
      ],
      default: 'PENDING',
    },

    // Priority
    priority: {
      type: String,
      enum: ['normal', 'urgent', 'emergency'],
      default: 'normal',
    },

    // Reason / notes
    reason: { type: String },
    notes: { type: String },
    internalNotes: { type: String }, // Staff-only notes

    // Recurrence
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly'],
      default: 'none',
    },
    recurrenceEnd: { type: Date },
    recurrenceParent: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    // Reminders
    reminders: [
      {
        type: { type: String, enum: ['sms', 'whatsapp', 'email', 'push'], default: 'sms' },
        minutesBefore: { type: Number, default: 60 },
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
    ],

    // Linked therapy session (if appointment converts to session)
    linkedSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapySession',
    },

    // Insurance / financial
    insuranceApprovalRequired: { type: Boolean, default: false },
    insuranceApprovalStatus: {
      type: String,
      enum: ['not_required', 'pending', 'approved', 'rejected'],
      default: 'not_required',
    },
    estimatedCost: { type: Number },

    // Check-in details
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    waitTimeMinutes: { type: Number },

    // Cancellation
    cancellationReason: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,

    // Status history
    statusHistory: [
      {
        from: String,
        to: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],

    // Source of booking
    source: {
      type: String,
      enum: ['online', 'phone', 'walk-in', 'referral', 'system'],
      default: 'online',
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Auto-generate appointment number
appointmentSchema.pre('save', function () {
  // W970: capture create-vs-update + the pre-save status so the post('save')
  // hook below can publish the right unified-core event. Mongoose resets
  // `isNew`/modified state after save, so we snapshot here. (Promise-style hook
  // — no `next` — to match the model's other hooks per CLAUDE.md gate #4.)
  this.$__wasNew = this.isNew;

  if (!this.appointmentNumber) {
    const d = new Date();
    const prefix = 'APT';
    const ts =
      d.getFullYear().toString().slice(-2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    const rand = require('crypto').randomBytes(3).toString('hex').toUpperCase();
    this.appointmentNumber = `${prefix}-${ts}-${rand}`;
  }

  // Auto-compute duration from startTime/endTime
  if (this.startTime && this.endTime) {
    const [sh, sm] = this.startTime.split(':').map(Number);
    const [eh, em] = this.endTime.split(':').map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    if (mins > 0) this.duration = mins;
  }
});

// W970 — snapshot the persisted status on load so a status flip is detectable
// in post('save'). These hooks live IN the model file (pre-compile) on purpose:
// schema middleware added AFTER mongoose.model() compilation does NOT fire,
// which is why the generic modelEventBridge never produced these events.
appointmentSchema.post('init', function () {
  this.$__prevApptStatus = this.status;
});

// W970 — link the appointment lifecycle into the unified core (CareTimeline +
// dashboards) via the integration bus. Booking and, critically, no-shows (a
// clinical disengagement / drop-out risk signal) were previously invisible to
// the per-beneficiary timeline. Completes the appointment subscribers that
// landed on main (W928/W929) without a producer. Fully guarded + fire-and-
// forget so a bus hiccup never fails or slows a save. The literal
// `integrationBus.publish('appointments', …)` calls keep the W389/W392
// producer-coverage guards satisfied.
appointmentSchema.post('save', function (doc) {
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    if (!doc.beneficiary) return; // no beneficiary → nothing to place on a timeline

    const base = {
      appointmentId: String(doc._id),
      beneficiaryId: String(doc.beneficiary),
      appointmentType: doc.type || '',
      date: doc.date,
    };

    if (this.$__wasNew) {
      Promise.resolve(
        integrationBus.publish('appointments', 'appointment.booked', {
          ...base,
          beneficiaryName: doc.beneficiaryName || '',
          therapistId: String(doc.therapist || ''),
          startTime: doc.startTime || '',
        })
      ).catch(() => {});
    } else if (doc.status === 'CANCELLED' && this.$__prevApptStatus !== 'CANCELLED') {
      Promise.resolve(
        integrationBus.publish('appointments', 'appointment.cancelled', {
          ...base,
          reason: doc.cancellationReason || doc.reason || 'unspecified',
        })
      ).catch(() => {});
    } else if (doc.status === 'NO_SHOW' && this.$__prevApptStatus !== 'NO_SHOW') {
      Promise.resolve(integrationBus.publish('appointments', 'appointment.no_show', base)).catch(
        () => {}
      );
    }
  } catch (_) {
    /* bus not wired (e.g. unit tests) — never block persistence */
  }
});

// Indexes
appointmentSchema.index({ beneficiary: 1, date: 1 });
appointmentSchema.index({ therapist: 1, date: 1, startTime: 1 });
appointmentSchema.index({ room: 1, date: 1, startTime: 1 });
appointmentSchema.index({ status: 1, date: 1 });
appointmentSchema.index({ bookedBy: 1 });
appointmentSchema.index({ recurrenceParent: 1 });
appointmentSchema.index({ branchId: 1, date: 1 });

// Auto-issue a UniversalCode (`RH-APT-XXXXXX`) for every appointment —
// SMS / parent-portal link can include the QR for one-tap check-in.
try {
  const universalCodePlugin = require('../services/universalCode/plugin');
  appointmentSchema.plugin(universalCodePlugin, {
    entityType: 'APT',
    labelFrom: doc =>
      doc.appointmentNumber || (doc.date ? new Date(doc.date).toISOString().slice(0, 10) : null),
  });
} catch (_e) {
  /* loaded before services exist — skip silently */
}

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

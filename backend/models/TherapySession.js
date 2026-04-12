/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const therapySessionSchema = new mongoose.Schema(
  {
    // Display / Front-end fields
    title: { type: String, default: '' },
    sessionType: {
      type: String,
      default: 'علاج طبيعي',
      enum: ['علاج طبيعي', 'علاج وظيفي', 'نطق وتخاطب', 'علاج سلوكي', 'علاج نفسي', 'أخرى'],
    },
    participants: [
      {
        name: String,
        role: { type: String, default: 'مستفيد' },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly'],
      default: 'none',
    },
    recurrenceEnd: { type: Date }, // تاريخ انتهاء التكرار
    recurrenceParent: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapySession' }, // الجلسة الأصلية
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,
    noShowReason: String,

    // Clinical references (optional for simple scheduling)
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticPlan' },
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    // Scheduling
    date: { type: Date, required: true },
    startTime: { type: String }, // "10:00"
    endTime: { type: String }, // "11:00"
    duration: { type: Number }, // Duration in minutes (computed or explicit)

    // Room assignment (حجز الغرفة)
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapyRoom' },
    location: { type: String }, // Free-text override or virtual location

    // Status
    status: {
      type: String,
      enum: [
        'SCHEDULED',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED_BY_PATIENT',
        'CANCELLED_BY_CENTER',
        'NO_SHOW',
        'RESCHEDULED',
      ],
      default: 'SCHEDULED',
    },

    // Priority (for scheduling conflicts)
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // Clinical Data (Post-session)
    attendance: {
      isPresent: Boolean,
      arrivalTime: String,
      departureTime: String,
      lateMinutes: { type: Number, default: 0 },
    },

    notes: {
      subjective: String, // What patient said
      objective: String, // What therapist observed
      assessment: String, // Analysis
      plan: String, // Next steps
    },

    rating: { type: Number, min: 1, max: 5 }, // Patient performance

    // Goals progress tracking (تتبع تقدم الأهداف)
    goalsProgress: [
      {
        goalId: { type: mongoose.Schema.Types.ObjectId },
        description: String,
        baseline: Number,
        target: Number,
        achieved: Number,
        notes: String,
      },
    ],

    // Reminders (تذكيرات)
    reminders: [
      {
        type: { type: String, enum: ['email', 'sms', 'whatsapp', 'push'], default: 'push' },
        minutesBefore: { type: Number, default: 60 },
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
    ],

    // Financial Hook
    isBilled: { type: Boolean, default: false },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },

    // History tracking (سجل التغييرات)
    statusHistory: [
      {
        from: String,
        to: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: compute duration from startTime/endTime if not explicitly set
therapySessionSchema.virtual('computedDuration').get(function () {
  if (this.duration) return this.duration;
  if (this.startTime && this.endTime) {
    const [sh, sm] = this.startTime.split(':').map(Number);
    const [eh, em] = this.endTime.split(':').map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  }
  return 60; // default
});

// Pre-save: auto-compute duration if startTime & endTime provided
therapySessionSchema.pre('save', function () {
  if (!this.duration && this.startTime && this.endTime) {
    const [sh, sm] = this.startTime.split(':').map(Number);
    const [eh, em] = this.endTime.split(':').map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    if (mins > 0) this.duration = mins;
  }
});

// Index for conflict detection
therapySessionSchema.index({ therapist: 1, date: 1, startTime: 1 });
therapySessionSchema.index({ beneficiary: 1, date: 1, startTime: 1 });
therapySessionSchema.index({ room: 1, date: 1, startTime: 1 }); // Room conflict detection
therapySessionSchema.index({ status: 1, date: 1 }); // Status queries
therapySessionSchema.index({ recurrenceParent: 1 }); // Recurring series lookup

module.exports =
  mongoose.models.TherapySession || mongoose.model('TherapySession', therapySessionSchema);

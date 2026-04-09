/**
 * TeleSession Model — نموذج جلسة التأهيل عن بُعد
 *
 * يمثل جلسة تأهيل تتم عن بُعد عبر الفيديو أو الصوت
 * مع تتبع جودة الاتصال، التسجيل، الأداء التقني
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const teleSessionSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: 'EpisodeOfCare', index: true },
    clinicalSessionId: { type: Schema.Types.ObjectId, ref: 'ClinicalSession' },
    therapistId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Session type
    sessionType: {
      type: String,
      enum: ['video', 'audio', 'chat', 'mixed', 'asynchronous'],
      default: 'video',
    },
    specialty: {
      type: String,
      enum: [
        'speech_therapy',
        'occupational_therapy',
        'physical_therapy',
        'psychology',
        'behavioral',
        'educational',
        'social_work',
        'other',
      ],
    },

    // Scheduling
    scheduledAt: { type: Date, required: true, index: true },
    startedAt: Date,
    endedAt: Date,
    durationMinutes: { type: Number, min: 5, max: 180 },

    // Status
    status: {
      type: String,
      enum: [
        'scheduled',
        'waiting',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'technical_failure',
        'rescheduled',
      ],
      default: 'scheduled',
      index: true,
    },
    cancellationReason: String,
    rescheduledTo: { type: Schema.Types.ObjectId, ref: 'TeleSession' },

    // Platform & connection
    platform: {
      provider: {
        type: String,
        enum: ['zoom', 'teams', 'webrtc', 'custom', 'google_meet', 'other'],
        default: 'webrtc',
      },
      roomId: String,
      joinUrl: String,
      hostUrl: String,
      meetingId: String,
      passcode: String,
    },

    // Connection quality
    connectionQuality: {
      averageBitrate: Number,
      averageLatency: Number,
      packetLoss: Number,
      videoResolution: String,
      audioQuality: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      videoQuality: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      disconnections: { type: Number, default: 0 },
      qualityScore: { type: Number, min: 0, max: 100 },
    },

    // Recording
    recording: {
      isRecorded: { type: Boolean, default: false },
      consentObtained: { type: Boolean, default: false },
      consentDate: Date,
      recordingUrl: String,
      duration: Number,
      storageKey: String,
      expiresAt: Date,
    },

    // Participants (beyond therapist and beneficiary)
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: [
            'therapist',
            'beneficiary',
            'family_member',
            'interpreter',
            'supervisor',
            'co_therapist',
            'observer',
          ],
        },
        name: String,
        joinedAt: Date,
        leftAt: Date,
        deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet'] },
      },
    ],

    // Clinical content
    clinicalNotes: {
      subjective: String,
      objective: String,
      assessment: String,
      plan: String,
    },
    activitiesCompleted: [
      {
        name: String,
        type: {
          type: String,
          enum: ['exercise', 'assessment', 'education', 'demonstration', 'practice', 'review'],
        },
        duration: Number,
        performance: {
          type: String,
          enum: ['excellent', 'good', 'fair', 'poor', 'not_applicable'],
        },
        notes: String,
      },
    ],
    goalsAddressed: [
      {
        goalId: { type: Schema.Types.ObjectId, ref: 'TherapeuticGoal' },
        progress: { type: String, enum: ['improved', 'maintained', 'declined', 'not_assessed'] },
        notes: String,
      },
    ],
    homeExercises: [
      {
        name: String,
        description: String,
        frequency: String,
        duration: String,
        videoUrl: String,
        imageUrl: String,
      },
    ],

    // Technical issues
    technicalIssues: [
      {
        type: {
          type: String,
          enum: ['audio', 'video', 'connection', 'software', 'hardware', 'other'],
        },
        description: String,
        severity: { type: String, enum: ['minor', 'moderate', 'major', 'critical'] },
        resolvedDuring: { type: Boolean, default: false },
        impactMinutes: Number,
      },
    ],

    // Satisfaction
    satisfaction: {
      beneficiaryRating: { type: Number, min: 1, max: 5 },
      therapistRating: { type: Number, min: 1, max: 5 },
      beneficiaryFeedback: String,
      therapistFeedback: String,
      wouldRecommend: Boolean,
      preferredOverInPerson: Boolean,
    },

    // Billing
    billing: {
      billable: { type: Boolean, default: true },
      billingCode: String,
      effectiveMinutes: Number,
      adjustmentReason: String,
    },

    // Metadata
    tags: [String],
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'tele_sessions',
  }
);

// Indexes
teleSessionSchema.index({ beneficiaryId: 1, scheduledAt: -1 });
teleSessionSchema.index({ therapistId: 1, scheduledAt: -1 });
teleSessionSchema.index({ status: 1, scheduledAt: 1 });

// Virtuals
teleSessionSchema.virtual('effectiveDuration').get(function () {
  if (this.startedAt && this.endedAt) {
    const totalIssueMinutes = (this.technicalIssues || []).reduce(
      (sum, i) => sum + (i.impactMinutes || 0),
      0
    );
    return Math.round((this.endedAt - this.startedAt) / 60000) - totalIssueMinutes;
  }
  return this.durationMinutes || 0;
});

module.exports = mongoose.models.TeleSession || mongoose.model('TeleSession', teleSessionSchema);

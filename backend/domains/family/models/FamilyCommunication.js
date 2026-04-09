/**
 * FamilyCommunication — نموذج التواصل مع الأسرة
 *
 * يسجل كل تواصل (مكالمة، رسالة، اجتماع، واجب منزلي…)
 * مع ربطه بالمستفيد والخطة والأهداف
 *
 * @module domains/family/models/FamilyCommunication
 */

const mongoose = require('mongoose');

// ─── Homework / Task Sub-Schema ─────────────────────────────────────────────
const homeworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticGoal' },
    dueDate: Date,
    frequency: String, // e.g. "يومياً", "3 مرات أسبوعياً"
    instructions: String,
    resources: [{ type: { type: String }, url: String, title: String }],
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed', 'not_done', 'partially_done'],
      default: 'assigned',
    },
    familyFeedback: String,
    completedAt: Date,
    rating: { type: Number, min: 1, max: 5 },
  },
  { _id: true }
);

// ─── Main Schema ────────────────────────────────────────────────────────────
const familyCommunicationSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      index: true,
    },
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember',
      index: true,
    },

    // ── Type ────────────────────────────────────────────────────────────────
    type: {
      type: String,
      required: true,
      enum: [
        'phone_call',
        'sms',
        'whatsapp',
        'email',
        'in_person_meeting',
        'video_call',
        'home_visit',
        'progress_report',
        'homework_assignment',
        'consent_request',
        'notification',
        'complaint',
        'feedback',
        'family_training',
      ],
      index: true,
    },

    direction: {
      type: String,
      enum: ['outgoing', 'incoming', 'bidirectional'],
      default: 'outgoing',
    },

    // ── Content ─────────────────────────────────────────────────────────────
    subject: { type: String, maxlength: 200 },
    summary: { type: String, required: true },
    details: String,

    // ── Links to Clinical Context ───────────────────────────────────────────
    relatedGoalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticGoal' }],
    relatedSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalSession' },
    relatedCarePlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'UnifiedCarePlan' },
    relatedAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalAssessment' },

    // ── Homework ────────────────────────────────────────────────────────────
    homework: [homeworkSchema],

    // ── Follow-up ───────────────────────────────────────────────────────────
    requiresFollowUp: { type: Boolean, default: false },
    followUpDate: Date,
    followUpAssignedTo: { type: mongoose.Schema.Types.ObjectId },
    followUpStatus: {
      type: String,
      enum: ['pending', 'completed', 'overdue', 'cancelled'],
    },
    followUpNote: String,

    // ── Participants ────────────────────────────────────────────────────────
    staffId: { type: mongoose.Schema.Types.ObjectId, index: true },
    staffRole: String,
    participants: [
      {
        name: String,
        role: String,
        userId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],

    // ── Outcome ─────────────────────────────────────────────────────────────
    outcome: {
      type: String,
      enum: [
        'successful',
        'no_answer',
        'rescheduled',
        'escalated',
        'family_satisfied',
        'family_concerned',
        'action_required',
        'information_shared',
      ],
    },
    satisfactionRating: { type: Number, min: 1, max: 5 },

    // ── Attachments ─────────────────────────────────────────────────────────
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Privacy ─────────────────────────────────────────────────────────────
    isConfidential: { type: Boolean, default: false },
    visibleToFamily: { type: Boolean, default: true },

    // ── Auto-generated Task ─────────────────────────────────────────────────
    generatedTaskId: { type: mongoose.Schema.Types.ObjectId },

    // ── Multi-tenant ────────────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'family_communications',
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
familyCommunicationSchema.index({ beneficiaryId: 1, type: 1, createdAt: -1 });
familyCommunicationSchema.index({ requiresFollowUp: 1, followUpStatus: 1, followUpDate: 1 });
familyCommunicationSchema.index({ staffId: 1, createdAt: -1 });

module.exports =
  mongoose.models.FamilyCommunication ||
  mongoose.model('FamilyCommunication', familyCommunicationSchema);

/**
 * TherapyGroup — نموذج المجموعات العلاجية
 *
 * يُعرّف مجموعة علاجية مع معايير الأهلية والمنهج والجدول
 *
 * @module domains/group-therapy/models/TherapyGroup
 */

const mongoose = require('mongoose');

const therapyGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    code: { type: String, unique: true, sparse: true },

    // ── Classification ──────────────────────────────────────────────────────
    type: {
      type: String,
      required: true,
      enum: [
        'social_skills',
        'language_group',
        'motor_group',
        'sensory_group',
        'behavioral_group',
        'life_skills',
        'academic_readiness',
        'parent_training',
        'sibling_support',
        'transition_group',
        'recreation',
        'art_therapy',
        'music_therapy',
        'mixed',
      ],
      index: true,
    },

    category: {
      type: String,
      enum: ['therapeutic', 'educational', 'social', 'recreational', 'support'],
      default: 'therapeutic',
    },

    // ── Capacity ────────────────────────────────────────────────────────────
    minSize: { type: Number, default: 3 },
    maxSize: { type: Number, default: 8 },
    currentSize: { type: Number, default: 0 },

    // ── Eligibility ─────────────────────────────────────────────────────────
    eligibility: {
      ageRange: { min: Number, max: Number },
      diagnoses: [String],
      functionalLevel: {
        type: String,
        enum: ['high', 'moderate', 'low', 'mixed'],
      },
      prerequisites: [String],
      contraindications: [String],
    },

    // ── Schedule ────────────────────────────────────────────────────────────
    schedule: {
      dayOfWeek: [{ type: Number, min: 0, max: 6 }],
      startTime: String,
      endTime: String,
      sessionDuration: { type: Number, default: 60 },
      totalSessions: Number,
      startDate: Date,
      endDate: Date,
    },

    // ── Curriculum / Goals ──────────────────────────────────────────────────
    goals: [
      {
        title: String,
        domain: String,
        targetBehavior: String,
        measurementMethod: String,
      },
    ],

    curriculum: [
      {
        sessionNumber: Number,
        title: String,
        objectives: [String],
        activities: [String],
        materials: [String],
      },
    ],

    // ── Team ────────────────────────────────────────────────────────────────
    leadTherapistId: { type: mongoose.Schema.Types.ObjectId, index: true },
    coTherapistIds: [{ type: mongoose.Schema.Types.ObjectId }],
    supervisorId: { type: mongoose.Schema.Types.ObjectId },

    // ── Members ─────────────────────────────────────────────────────────────
    members: [
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
        enrolledAt: { type: Date, default: Date.now },
        role: {
          type: String,
          enum: ['member', 'peer_leader', 'observer'],
          default: 'member',
        },
        status: {
          type: String,
          enum: ['active', 'on_hold', 'completed', 'withdrawn'],
          default: 'active',
        },
        individualGoals: [String],
        withdrawnAt: Date,
        withdrawalReason: String,
      },
    ],

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['planning', 'recruiting', 'active', 'paused', 'completed', 'cancelled'],
      default: 'planning',
      index: true,
    },

    // ── Multi-tenant ────────────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'therapy_groups',
  }
);

therapyGroupSchema.index({ type: 1, status: 1, branchId: 1 });
therapyGroupSchema.index({ 'members.beneficiaryId': 1 });
therapyGroupSchema.index({ leadTherapistId: 1, status: 1 });

module.exports = mongoose.models.TherapyGroup || mongoose.model('TherapyGroup', therapyGroupSchema);

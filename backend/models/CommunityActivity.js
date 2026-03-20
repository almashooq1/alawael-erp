/* eslint-disable no-unused-vars */
/**
 * CommunityActivity Model — نموذج الأنشطة المجتمعية
 *
 * Represents community activities such as sports, cultural, and entertainment programs
 * designed to support social integration for beneficiaries.
 */
const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      required: true,
    },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true }, // "11:00"
  },
  { _id: false }
);

const communityActivitySchema = new mongoose.Schema(
  {
    // ─── Core Information ──────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'عنوان النشاط مطلوب'],
      trim: true,
      index: true,
    },
    titleAr: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'وصف النشاط مطلوب'],
    },
    descriptionAr: String,

    // ─── Category & Type ───────────────────────────────────────────────
    category: {
      type: String,
      enum: [
        'sports',
        'cultural',
        'entertainment',
        'educational',
        'vocational',
        'social',
        'therapeutic',
      ],
      required: [true, 'تصنيف النشاط مطلوب'],
      index: true,
    },
    activityType: {
      type: String,
      enum: ['individual', 'group', 'team', 'workshop', 'competition', 'exhibition', 'trip'],
      default: 'group',
    },

    // ─── Disability & Accessibility ────────────────────────────────────
    targetDisabilityTypes: [
      {
        type: String,
        enum: [
          'visual',
          'hearing',
          'mobility',
          'cognitive',
          'learning',
          'developmental',
          'multiple',
          'all',
        ],
      },
    ],
    accessibilityFeatures: {
      wheelchairAccessible: { type: Boolean, default: false },
      signLanguageInterpreter: { type: Boolean, default: false },
      brailleMaterials: { type: Boolean, default: false },
      audioDescription: { type: Boolean, default: false },
      simplifiedInstructions: { type: Boolean, default: false },
      assistiveTechnology: { type: Boolean, default: false },
      personalAssistant: { type: Boolean, default: false },
    },
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
      default: 'all-levels',
    },
    ageGroup: {
      minAge: { type: Number, default: 0 },
      maxAge: { type: Number, default: 100 },
    },

    // ─── Schedule & Location ───────────────────────────────────────────
    schedule: [scheduleSlotSchema],
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'none'],
      default: 'none',
    },
    location: {
      name: String,
      address: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      isVirtual: { type: Boolean, default: false },
      virtualLink: String,
    },

    // ─── Capacity & Registration ───────────────────────────────────────
    maxParticipants: { type: Number, required: true },
    currentParticipants: { type: Number, default: 0 },
    waitlistCount: { type: Number, default: 0 },
    registrationDeadline: Date,
    isRegistrationOpen: { type: Boolean, default: true },

    // ─── Financial ─────────────────────────────────────────────────────
    cost: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    isFree: { type: Boolean, default: true },
    sponsorships: [
      {
        sponsorName: String,
        amount: Number,
        sponsorType: { type: String, enum: ['full', 'partial', 'in-kind'] },
      },
    ],

    // ─── Staff & Supervision ───────────────────────────────────────────
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    supervisors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    volunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    partnerOrganization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CivilPartnership',
    },

    // ─── Status & Metrics ──────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'planned', 'active', 'ongoing', 'completed', 'cancelled', 'suspended'],
      default: 'draft',
      index: true,
    },
    satisfactionRating: { type: Number, min: 0, max: 5, default: 0 },
    totalRatings: { type: Number, default: 0 },
    completionRate: { type: Number, min: 0, max: 100, default: 0 },

    // ─── Media & Documents ─────────────────────────────────────────────
    coverImage: String,
    gallery: [String],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
      },
    ],
    tags: [String],

    // ─── Audit ─────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
communityActivitySchema.index({ category: 1, status: 1 });
communityActivitySchema.index({ startDate: 1, endDate: 1 });
communityActivitySchema.index({ status: 1, createdAt: -1 });
communityActivitySchema.index({ 'location.city': 1, category: 1 });
communityActivitySchema.index({ targetDisabilityTypes: 1 });

// ─── Pre-save ────────────────────────────────────────────────────────────────
communityActivitySchema.pre('save', function (next) {
  if (this.cost === 0) this.isFree = true;
  else this.isFree = false;
  next();
});

// ─── Virtuals ────────────────────────────────────────────────────────────────
communityActivitySchema.virtual('availableSpots').get(function () {
  return Math.max(0, this.maxParticipants - this.currentParticipants);
});

communityActivitySchema.virtual('isFull').get(function () {
  return this.currentParticipants >= this.maxParticipants;
});

communityActivitySchema.set('toJSON', { virtuals: true });
communityActivitySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CommunityActivity', communityActivitySchema);

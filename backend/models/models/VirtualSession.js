const mongoose = require('mongoose');

const virtualSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'عنوان الجلسة مطلوب'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'وصف الجلسة مطلوب'],
    },
    sessionType: {
      type: String,
      enum: ['workshop', 'webinar', 'training', 'consultation', 'discussion_group'],
      default: 'webinar',
      required: true,
    },
    targetDisabilityCategory: {
      type: String,
      enum: ['visual', 'hearing', 'mobility', 'intellectual', 'psychosocial', 'multiple', 'all'],
      default: 'all',
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coInstructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    scheduledDate: {
      type: Date,
      required: [true, 'تاريخ الجلسة مطلوب'],
    },
    duration: {
      type: Number,
      required: [true, 'مدة الجلسة مطلوبة'],
      description: 'المدة بالدقائق',
    },
    maxParticipants: {
      type: Number,
      default: 100,
    },
    currentParticipants: {
      type: Number,
      default: 0,
    },
    meetingLink: {
      type: String,
      required: [true, 'رابط الاجتماع مطلوب'],
    },
    password: String,
    platform: {
      type: String,
      enum: ['zoom', 'teams', 'jitsi', 'google_meet', 'youtube_live'],
      default: 'zoom',
    },
    language: {
      type: String,
      default: 'ar',
      enum: ['ar', 'en', 'fr'],
    },
    accessibilityServices: {
      arabicSignLanguageInterpreter: Boolean,
      liveSubtitles: Boolean,
      arabicSubtitles: Boolean,
      englishSubtitles: Boolean,
      audioDescription: Boolean,
      largeFont: Boolean,
      recordingAvailable: {
        type: Boolean,
        default: false,
      },
    },
    agenda: [
      {
        time: String,
        topic: String,
        duration: Number,
      },
    ],
    materials: [
      {
        name: String,
        url: String,
        description: String,
      },
    ],
    registrations: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        registrationDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['registered', 'attended', 'no_show', 'cancelled'],
          default: 'registered',
        },
      },
    ],
    speakers: [
      {
        name: String,
        title: String,
        bio: String,
        imageUrl: String,
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
    },
    recordingUrl: String,
    feedback: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    statistics: {
      registeredCount: {
        type: Number,
        default: 0,
      },
      attendedCount: {
        type: Number,
        default: 0,
      },
      noShowCount: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
virtualSessionSchema.index({ scheduledDate: 1, status: 1 });
virtualSessionSchema.index({ instructor: 1 });
virtualSessionSchema.index({ targetDisabilityCategory: 1 });
virtualSessionSchema.index({ createdAt: -1 });

// Virtual for is full
virtualSessionSchema.virtual('isFull').get(function () {
  return this.currentParticipants >= this.maxParticipants;
});

// Virtual for days until session
virtualSessionSchema.virtual('daysUntilSession').get(function () {
  const now = new Date();
  const diff = this.scheduledDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Static method to get upcoming sessions
virtualSessionSchema.statics.getUpcomingSessions = function (limit = 10) {
  const now = new Date();
  return this.find({
    scheduledDate: { $gte: now },
    status: { $in: ['scheduled', 'draft'] },
  })
    .sort({ scheduledDate: 1 })
    .limit(limit)
    .populate('instructor', 'name email');
};

// Static method to get sessions by category
virtualSessionSchema.statics.getByCategory = function (category) {
  return this.find({
    targetDisabilityCategory: { $in: [category, 'all'] },
    status: { $in: ['scheduled', 'completed'] },
  })
    .sort({ scheduledDate: -1 })
    .populate('instructor', 'name email');
};

module.exports = mongoose.model('VirtualSession', virtualSessionSchema);

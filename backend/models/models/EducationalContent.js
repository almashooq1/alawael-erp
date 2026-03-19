const mongoose = require('mongoose');

const educationalContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'عنوان المحتوى مطلوب'],
      trim: true,
      minlength: [5, 'يجب أن يكون العنوان على الأقل 5 أحرف'],
    },
    description: {
      type: String,
      required: [true, 'وصف المحتوى مطلوب'],
      minlength: [20, 'يجب أن يكون الوصف على الأقل 20 حرف'],
    },
    contentType: {
      type: String,
      enum: ['article', 'video', 'audio', 'pdf', 'infographic', 'interactive'],
      default: 'article',
      required: true,
    },
    disabilityCategory: {
      type: String,
      enum: [
        'visual',
        'hearing',
        'mobility',
        'intellectual',
        'psychosocial',
        'multiple',
        'general',
      ],
      default: 'general',
      required: true,
    },
    contentUrl: {
      type: String,
      required: [true, 'رابط المحتوى مطلوب'],
    },
    thumbnailUrl: String,
    duration: {
      type: Number,
      description: 'المدة بالدقائق',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [String],
    views: {
      type: Number,
      default: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
    accessibilityFeatures: {
      subtitles: Boolean,
      signLanguageInterpreter: Boolean,
      audioDescription: Boolean,
      captions: Boolean,
      easyLanguage: Boolean,
      largeText: Boolean,
    },
    resources: [
      {
        name: String,
        url: String,
        format: String,
      },
    ],
    statistics: {
      downloads: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      comments: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected'],
      default: 'draft',
    },
    reviewNotes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
educationalContentSchema.index({ disabilityCategory: 1, isPublished: 1 });
educationalContentSchema.index({ author: 1 });
educationalContentSchema.index({ contentType: 1 });
educationalContentSchema.index({ createdAt: -1 });
educationalContentSchema.index({ tags: 1 });

// Virtual for content category
educationalContentSchema.virtual('category').get(function () {
  return this.disabilityCategory;
});

// Static method to get popular content
educationalContentSchema.statics.getPopularContent = function (limit = 10) {
  return this.find({ isPublished: true })
    .sort({ views: -1, 'rating.average': -1 })
    .limit(limit)
    .populate('author', 'name email');
};

// Static method to get content by category
educationalContentSchema.statics.getByCategory = function (category, limit = 20) {
  return this.find({
    disabilityCategory: category,
    isPublished: true,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', 'name email');
};

// Instance method to increment views
educationalContentSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('EducationalContent', educationalContentSchema);

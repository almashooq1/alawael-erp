const mongoose = require('mongoose');

const digitalLibrarySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'عنوان المورد مطلوب'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'وصف المورد مطلوب'],
    },
    resourceType: {
      type: String,
      enum: [
        'book',
        'guide',
        'article',
        'research_paper',
        'case_study',
        'toolkit',
        'template',
        'tool',
        'research_statistics',
      ],
      required: true,
    },
    disabilityCategories: {
      type: [String],
      enum: ['visual', 'hearing', 'mobility', 'intellectual', 'psychosocial', 'multiple'],
      default: [],
    },
    author: {
      name: String,
      organization: String,
      email: String,
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileUrl: {
      type: String,
      required: [true, 'رابط الملف مطلوب'],
    },
    fileType: {
      type: String,
      enum: ['pdf', 'doc', 'xlsx', 'video', 'audio', 'image', 'link', 'other'],
      required: true,
    },
    fileSize: {
      type: Number,
      description: 'حجم الملف بالبايتات',
    },
    language: {
      type: String,
      enum: ['ar', 'en', 'fr', 'multilingual'],
      default: 'ar',
    },
    publicationDate: Date,
    publisher: String,
    categories: [String],
    tags: [String],
    keywords: [String],
    accessibilityFormat: {
      hasBraille: Boolean,
      hasLargeText: Boolean,
      hasArabicSignLanguageInterpretation: Boolean,
      hasAudioVersion: Boolean,
      hasSimpleLanguageVersion: Boolean,
      isScreenReaderFriendly: Boolean,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
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
    reviews: [
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
    relatedResources: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DigitalLibrary',
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'archived'],
      default: 'draft',
    },
    metadata: {
      isbn: String,
      doi: String,
      issn: String,
      edition: String,
      pages: Number,
      language_level: String,
    },
    contributors: [
      {
        name: String,
        role: String,
        email: String,
      },
    ],
    license: {
      type: String,
      enum: ['cc_by', 'cc_by_sa', 'cc_by_nc', 'cc0', 'proprietary'],
      default: 'cc_by',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
digitalLibrarySchema.index({ resourceType: 1, isPublic: 1 });
digitalLibrarySchema.index({ disabilityCategories: 1 });
digitalLibrarySchema.index({ uploader: 1 });
digitalLibrarySchema.index({ categories: 1 });
digitalLibrarySchema.index({ tags: 1 });
digitalLibrarySchema.index({ createdAt: -1 });
digitalLibrarySchema.index({ fileType: 1 });

// Static method to search resources
digitalLibrarySchema.statics.searchResources = function (query, filters = {}) {
  const searchQuery = {
    isPublic: true,
    status: 'approved',
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
      { keywords: { $in: [new RegExp(query, 'i')] } },
    ],
  };

  if (filters.resourceType) searchQuery.resourceType = filters.resourceType;
  if (filters.disabilityCategories)
    searchQuery.disabilityCategories = { $in: [filters.disabilityCategories] };
  if (filters.language) searchQuery.language = filters.language;

  return this.find(searchQuery)
    .sort({ 'rating.average': -1, views: -1 })
    .populate('uploader', 'name email')
    .limit(filters.limit || 20);
};

// Static method to get resources by category
digitalLibrarySchema.statics.getByCategory = function (category, limit = 15) {
  return this.find({
    disabilityCategories: category,
    isPublic: true,
    status: 'approved',
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('uploader', 'name email');
};

// Instance method to increment downloads
digitalLibrarySchema.methods.incrementDownloads = function () {
  this.downloads += 1;
  return this.save();
};

// Instance method to add review
digitalLibrarySchema.methods.addReview = function (userId, rating, comment) {
  this.reviews.push({ userId, rating, comment });

  // Calculate average rating
  const ratings = this.reviews.map(r => r.rating);
  this.rating.average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  this.rating.count = ratings.length;

  return this.save();
};

module.exports = mongoose.model('DigitalLibrary', digitalLibrarySchema);

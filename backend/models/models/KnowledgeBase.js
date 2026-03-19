const mongoose = require('mongoose');

// Knowledge Article Schema
const knowledgeArticleSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
      minlength: 100,
    },

    // Classification
    category: {
      type: String,
      required: true,
      enum: [
        'therapeutic_protocols',
        'case_studies',
        'research_experiments',
        'best_practices',
        'other',
      ]
    },
    subcategory: {
      type: String,
      default: 'general',
    },

    // Metadata
    tags: [
      {
        type: String,
        lowercase: true,
      },
    ],
    keywords: [
      {
        type: String,
        lowercase: true,
      },
    ],

    // Content Structure
    sections: [
      {
        title: String,
        content: String,
        order: Number,
      },
    ],

    // Attachments & Resources
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    relatedArticles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KnowledgeArticle',
      },
    ],

    // References
    references: [
      {
        title: String,
        url: String,
        source: String,
        dateAccessed: Date,
      },
    ],

    // Author & Versioning
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Status & Approval
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'published', 'archived'],
      default: 'draft'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,

    // Engagement Metrics
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
      type: Number,
      default: 0,
    },
    ratings: {
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
    comments: [
      {
        author: mongoose.Schema.Types.ObjectId,
        text: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // SEO
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    metaTitle: String,
    metaDescription: String,

    // Visibility
    isPublic: {
      type: Boolean,
      default: false,
    },
    visibleTo: [
      {
        type: String,
        enum: ['admin', 'manager', 'employee', 'user'],
      },
    ],

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'knowledge_articles',
  }
);

// Indexes for better search performance
knowledgeArticleSchema.index({ title: 'text', content: 'text', description: 'text' });
knowledgeArticleSchema.index({ category: 1, status: 1 });
knowledgeArticleSchema.index({ tags: 1 });
knowledgeArticleSchema.index({ createdAt: -1 });
knowledgeArticleSchema.index({ views: -1 });

// Knowledge Category Schema
const knowledgeCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: String,
    icon: String,
    color: String,
    order: Number,
    subcategories: [
      {
        name: String,
        description: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'knowledge_categories',
  }
);

// Knowledge Search Log Schema
const knowledgeSearchLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    query: {
      type: String,
      required: true,
    },
    category: String,
    resultsCount: Number,
    clickedArticle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeArticle',
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
  },
  {
    collection: 'knowledge_search_logs',
  }
);

// Knowledge Rating Schema
const knowledgeRatingSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeArticle',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    helpful: Boolean,
    feedback: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'knowledge_ratings',
  }
);

// Export Models
const KnowledgeArticle = mongoose.model('KnowledgeArticle', knowledgeArticleSchema);
const KnowledgeCategory = mongoose.model('KnowledgeCategory', knowledgeCategorySchema);
const KnowledgeSearchLog = mongoose.model('KnowledgeSearchLog', knowledgeSearchLogSchema);
const KnowledgeRating = mongoose.model('KnowledgeRating', knowledgeRatingSchema);

module.exports = {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeSearchLog,
  KnowledgeRating,
};

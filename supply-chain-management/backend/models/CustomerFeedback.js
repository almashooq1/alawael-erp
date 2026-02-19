const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['email', 'phone', 'chat', 'survey', 'review', 'social'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'product_quality',
        'service_quality',
        'price',
        'delivery',
        'support',
        'general',
        'bug_report',
        'feature_request',
      ],
      default: 'general',
    },
    title: String,
    message: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
    },
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'in_progress', 'resolved', 'closed'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    assignedTo: String,
    resolution: String,
    closedAt: Date,
    metadata: {
      userAgent: String,
      ipAddress: String,
      location: String,
      customFields: mongoose.Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: Date,
  },
  { timestamps: true }
);

feedbackSchema.index({ customerId: 1, createdAt: -1 });
feedbackSchema.index({ sentiment: 1, status: 1 });

module.exports = mongoose.model('CustomerFeedback', feedbackSchema);

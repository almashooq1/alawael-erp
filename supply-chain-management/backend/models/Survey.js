const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: String,
  text: String,
  type: {
    type: String,
    enum: ['rating', 'yesno', 'text', 'multiselect'],
  },
  options: [String],
});

const surveySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => `SRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    questions: [questionSchema],
    targetAudience: [String],
    status: {
      type: String,
      enum: ['active', 'draft', 'closed'],
      default: 'active',
    },
    type: {
      type: String,
      enum: ['nps', 'csat', 'ces', 'general'],
      default: 'general',
    },
    responseCount: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: String,
      default: '0.00',
    },
    createdBy: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      duration: Number,
      tags: [String],
      customFields: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Survey', surveySchema);

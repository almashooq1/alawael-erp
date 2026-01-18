const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['development', 'therapy', 'soft-skills', 'technical', 'other'],
      default: 'other',
    },
    thumbnailUrl: {
      type: String,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      default: 0,
    },
    stats: {
      studentsEnrolled: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Course', courseSchema);

/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String, // Rich text content
    },
    videoUrl: {
      type: String,
    },
    duration: {
      type: Number, // In minutes
      default: 0,
    },
    order: {
      type: Number, // Order in the course
      required: true,
    },
    isFreePreview: {
      type: Boolean,
      default: false,
    },
    resources: [
      {
        title: String,
        url: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);


// ── Indexes ───────────────────────────────────────────────────────────────
lessonSchema.index({ courseId: 1 });
lessonSchema.index({ courseId: 1, order: 1 });
module.exports = mongoose.models.Lesson || mongoose.model('Lesson', lessonSchema);

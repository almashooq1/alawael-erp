/**
 * DiscussionForum Model — نموذج منتديات النقاش للمقررات
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const discussionForumSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElearningCourse', required: true },
    title: { type: String, required: true, maxlength: 500 },
    body: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
    lastReplyAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

discussionForumSchema.index({ branchId: 1, courseId: 1, isPinned: -1 });

discussionForumSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('DiscussionForum', discussionForumSchema);

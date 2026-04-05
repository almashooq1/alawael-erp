/**
 * ForumReply Model — نموذج ردود المنتدى
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const forumReplySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    forumId: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionForum', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumReply' },
    body: { type: String, required: true },
    isBestAnswer: { type: Boolean, default: false },
    likes: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

forumReplySchema.index({ branchId: 1, forumId: 1, parentId: 1 });

forumReplySchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.models.ForumReply || mongoose.model('ForumReply', forumReplySchema);

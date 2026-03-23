/**
 * Group Model
 * نموذج المجموعات
 *
 * Represents groups for collaborative activities, expense sharing, or team management.
 */

const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: { type: String, required: true },
    email: { type: String },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم المجموعة مطلوب'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    members: [groupMemberSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalExpenses: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

groupSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.length : 0;
});

groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ status: 1 });

module.exports = mongoose.models.Group || mongoose.model('Group', groupSchema);

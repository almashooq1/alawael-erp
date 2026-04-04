/**
 * RecruitmentInterview Model — System 43
 * نموذج المقابلات الوظيفية
 */
const mongoose = require('mongoose');

const recruitmentInterviewSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobApplication',
      required: true,
    },
    stageId: { type: mongoose.Schema.Types.ObjectId, default: null },

    interviewType: {
      type: String,
      enum: ['phone', 'video', 'in_person', 'panel', 'technical'],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'],
      default: 'scheduled',
    },

    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    location: { type: String },
    meetingLink: { type: String },
    interviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    score: { type: Number, min: 0, max: 100, default: null },
    feedback: { type: String },
    strengths: { type: String },
    weaknesses: { type: String },
    recommendation: {
      type: String,
      enum: ['hire', 'reject', 'hold', 'next_round'],
      default: null,
    },
    completedAt: { type: Date, default: null },
    notes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

recruitmentInterviewSchema.index({ applicationId: 1 });
recruitmentInterviewSchema.index({ branchId: 1, status: 1 });
recruitmentInterviewSchema.index({ scheduledAt: 1 });
recruitmentInterviewSchema.index({ deletedAt: 1 });

recruitmentInterviewSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports = mongoose.model('RecruitmentInterview', recruitmentInterviewSchema);

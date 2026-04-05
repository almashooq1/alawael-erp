/**
 * OnboardingChecklist Model — System 43
 * نموذج قوائم تدقيق الإعداد للموظفين الجدد
 */
const mongoose = require('mongoose');

const onboardingTaskSchema = new mongoose.Schema(
  {
    taskId: { type: Number },
    title: { type: String },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    responsible: {
      type: String,
      enum: ['hr', 'it', 'manager', 'payroll', 'employee'],
      default: 'hr',
    },
    completedAt: { type: Date, default: null },
    notes: { type: String },
  },
  { _id: false }
);

const onboardingChecklistSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobApplication',
      required: true,
    },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobOffer', required: true },

    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    startDate: { type: Date, required: true },
    targetCompletionDate: { type: Date },
    actualCompletionDate: { type: Date, default: null },

    tasks: [onboardingTaskSchema],
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },

    buddyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hrOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

onboardingChecklistSchema.index({ branchId: 1, status: 1 });
onboardingChecklistSchema.index({ applicationId: 1 });
onboardingChecklistSchema.index({ startDate: 1 });
onboardingChecklistSchema.index({ deletedAt: 1 });

onboardingChecklistSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports =
  mongoose.models.OnboardingChecklist ||
  mongoose.model('OnboardingChecklist', onboardingChecklistSchema);

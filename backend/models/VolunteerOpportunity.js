/**
 * VolunteerOpportunity Model — System 41
 * نموذج فرص التطوع
 */
const mongoose = require('mongoose');

const volunteerOpportunitySchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    title: { type: String, required: true, trim: true },
    titleAr: { type: String, required: true, trim: true },
    description: { type: String },
    descriptionAr: { type: String },
    category: {
      type: String,
      enum: ['medical_support', 'administrative', 'event', 'training', 'awareness'],
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'cancelled'],
      default: 'open',
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },

    volunteersNeeded: { type: Number, default: 1, min: 1 },
    volunteersEnrolled: { type: Number, default: 0 },
    location: { type: String },
    requiredSkills: [{ type: String }],
    minHoursCommitment: { type: Number, default: 0 },
    difficultyLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: null },
    trainingRequired: { type: Boolean, default: false },
    trainingDetails: { type: String },

    supervisorName: { type: String },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: { type: String, enum: ['weekly', 'monthly'], default: null },
    applicationDeadline: { type: Date },
    notes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

volunteerOpportunitySchema.index({ branchId: 1, status: 1 });
volunteerOpportunitySchema.index({ startDate: 1 });
volunteerOpportunitySchema.index({ category: 1 });
volunteerOpportunitySchema.index({ deletedAt: 1 });

volunteerOpportunitySchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports =
  mongoose.models.VolunteerOpportunity ||
  mongoose.model('VolunteerOpportunity', volunteerOpportunitySchema);

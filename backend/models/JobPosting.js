/**
 * JobPosting Model — System 43
 * نموذج إعلانات الوظائف الشاغرة
 */
const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    titleAr: { type: String, required: true, trim: true, maxlength: 200 },
    department: { type: String, maxlength: 100 },
    jobCode: { type: String, unique: true, sparse: true },

    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'intern'],
      required: true,
    },
    workLocation: {
      type: String,
      enum: ['on_site', 'remote', 'hybrid'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed', 'cancelled', 'filled'],
      default: 'draft',
    },

    description: { type: String },
    descriptionAr: { type: String },
    requirements: { type: String },
    responsibilities: { type: String },
    benefits: { type: String },

    vacancies: { type: Number, default: 1, min: 1 },
    applicationsCount: { type: Number, default: 0 },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'manager', 'executive'],
      required: true,
    },
    minExperienceYears: { type: Number, default: 0 },
    educationLevel: { type: String },
    requiredSkills: [{ type: String }],

    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryNegotiable: { type: Boolean, default: false },
    isSaudiOnly: { type: Boolean, default: false },
    disabilityFriendly: { type: Boolean, default: true },

    publishedAt: { type: Date },
    applicationDeadline: { type: Date, required: true },
    expectedStartDate: { type: Date },

    platforms: [{ type: String, enum: ['linkedin', 'jadarat', 'taqat', 'internal'] }],
    hiringManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hrCoordinatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    internalNotes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

jobPostingSchema.index({ branchId: 1, status: 1 });
jobPostingSchema.index({ employmentType: 1 });
jobPostingSchema.index({ applicationDeadline: 1 });
jobPostingSchema.index({ jobCode: 1 });
jobPostingSchema.index({ deletedAt: 1 });

jobPostingSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports = mongoose.models.JobPosting || mongoose.model('JobPosting', jobPostingSchema);

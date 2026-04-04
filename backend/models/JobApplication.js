/**
 * JobApplication Model — System 43
 * نموذج طلبات التوظيف
 */
const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    jobPostingId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: true },

    // بيانات المتقدم
    applicantName: { type: String, required: true, trim: true, maxlength: 200 },
    applicantEmail: { type: String, required: true, lowercase: true, trim: true },
    applicantPhone: { type: String, maxlength: 20 },
    nationalId: { type: String, maxlength: 20 },
    gender: { type: String, enum: ['male', 'female'] },
    nationality: { type: String, default: 'SA' },
    isSaudi: { type: Boolean, default: true },
    hasDisability: { type: Boolean, default: false },
    disabilityType: { type: String },

    // المؤهلات
    educationLevel: { type: String },
    educationMajor: { type: String },
    university: { type: String },
    yearsOfExperience: { type: Number, default: 0 },
    currentJobTitle: { type: String },
    currentEmployer: { type: String },
    currentSalary: { type: Number, default: null },
    expectedSalary: { type: Number, default: null },

    // المستندات
    cvPath: { type: String },
    coverLetterPath: { type: String },
    certificatesPaths: [{ type: String }],

    // الحالة
    status: {
      type: String,
      enum: [
        'received',
        'screening',
        'shortlisted',
        'interview',
        'offer',
        'hired',
        'rejected',
        'withdrawn',
      ],
      default: 'received',
    },
    rejectionReason: { type: String },
    overallScore: { type: Number, min: 0, max: 100, default: null },

    // مصدر التقديم
    source: {
      type: String,
      enum: ['linkedin', 'jadarat', 'taqat', 'internal', 'referral', 'website'],
      default: 'website',
    },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralNotes: { type: String },

    // التتبع
    shortlistedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    hiredAt: { type: Date, default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hrNotes: { type: String },
    consentObtained: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

jobApplicationSchema.index({ branchId: 1, status: 1 });
jobApplicationSchema.index({ jobPostingId: 1 });
jobApplicationSchema.index({ applicantEmail: 1 });
jobApplicationSchema.index({ source: 1 });
jobApplicationSchema.index({ isSaudi: 1 });
jobApplicationSchema.index({ hasDisability: 1 });
jobApplicationSchema.index({ deletedAt: 1 });

jobApplicationSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports = mongoose.model('JobApplication', jobApplicationSchema);

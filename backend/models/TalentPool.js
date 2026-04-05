/**
 * TalentPool Model — System 43
 * نموذج بنك المواهب
 */
const mongoose = require('mongoose');

const talentPoolSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    fullName: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, maxlength: 20 },
    nationalId: { type: String, unique: true, sparse: true, maxlength: 20 },
    gender: { type: String, enum: ['male', 'female'] },
    nationality: { type: String, default: 'SA' },
    isSaudi: { type: Boolean, default: true },
    hasDisability: { type: Boolean, default: false },

    educationLevel: { type: String },
    educationMajor: { type: String },
    yearsOfExperience: { type: Number, default: 0 },
    currentJobTitle: { type: String },
    skills: [{ type: String }],
    desiredPositions: [{ type: String }],
    expectedSalary: { type: Number, default: null },
    cvPath: { type: String },
    linkedinUrl: { type: String },

    source: {
      type: String,
      enum: ['job_fair', 'referral', 'website', 'linkedin'],
      default: 'website',
    },
    status: {
      type: String,
      enum: ['available', 'employed', 'not_looking'],
      default: 'available',
    },
    lastContacted: { type: Date, default: null },
    notes: { type: String },
    consentToContact: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

talentPoolSchema.index({ branchId: 1, status: 1 });
talentPoolSchema.index({ email: 1 });
talentPoolSchema.index({ isSaudi: 1 });
talentPoolSchema.index({ skills: 1 });
talentPoolSchema.index({ deletedAt: 1 });

talentPoolSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports = mongoose.models.TalentPool || mongoose.model('TalentPool', talentPoolSchema);

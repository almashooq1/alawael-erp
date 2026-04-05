/**
 * CommunityProgram Model — System 42
 * نموذج البرامج المجتمعية
 */
const mongoose = require('mongoose');

const communityProgramSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    name: { type: String, required: true, trim: true, maxlength: 200 },
    nameAr: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String },
    descriptionAr: { type: String },

    programType: {
      type: String,
      enum: ['awareness', 'integration', 'employment', 'education', 'health'],
      required: true,
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'suspended', 'cancelled'],
      default: 'planning',
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date },
    targetAudience: { type: String },
    targetBeneficiaries: { type: Number, default: 0 },
    actualBeneficiaries: { type: Number, default: 0 },

    budget: { type: Number, default: null },
    actualCost: { type: Number, default: null },
    fundingSource: {
      type: String,
      enum: ['government', 'donation', 'csr', 'self'],
      default: null,
    },
    location: { type: String },

    programManager: { type: String },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    objectives: [{ type: String }],
    outcomes: [{ type: String }],
    kpis: [{ type: mongoose.Schema.Types.Mixed }],
    impactReport: { type: String },
    imagePath: { type: String },
    isPublic: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

communityProgramSchema.index({ branchId: 1, status: 1 });
communityProgramSchema.index({ programType: 1 });
communityProgramSchema.index({ startDate: 1 });
communityProgramSchema.index({ deletedAt: 1 });

communityProgramSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports =
  mongoose.models.CommunityProgram || mongoose.model('CommunityProgram', communityProgramSchema);

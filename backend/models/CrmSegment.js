/**
 * CrmSegment Model — نموذج شرائح العملاء
 */
const mongoose = require('mongoose');

const crmSegmentSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    name: { type: String, required: true, maxlength: 200 },
    nameAr: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    criteria: { type: mongoose.Schema.Types.Mixed },
    type: { type: String, enum: ['static', 'dynamic'], default: 'dynamic' },
    memberCount: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

crmSegmentSchema.index({ branchId: 1, isActive: 1 });

crmSegmentSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.models.CrmSegment || mongoose.model('CrmSegment', crmSegmentSchema);

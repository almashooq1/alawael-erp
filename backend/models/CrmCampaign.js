/**
 * CrmCampaign Model — نموذج الحملات التسويقية
 */
const mongoose = require('mongoose');

const crmCampaignSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    name: { type: String, required: true, maxlength: 200 },
    nameAr: { type: String, maxlength: 200 },
    type: {
      type: String,
      enum: ['sms', 'email', 'whatsapp', 'push', 'mixed'],
      default: 'email',
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
      default: 'draft',
    },
    contentAr: { type: String, required: true },
    contentEn: { type: String },
    subject: { type: String, maxlength: 255 },
    targetSegment: { type: mongoose.Schema.Types.Mixed },
    targetIds: [{ type: mongoose.Schema.Types.ObjectId }],
    targetCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 },
    clickedCount: { type: Number, default: 0 },
    bouncedCount: { type: Number, default: 0 },
    unsubscribedCount: { type: Number, default: 0 },
    budget: { type: Number, default: 0, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    abVariants: { type: mongoose.Schema.Types.Mixed },
    utmSource: { type: String, maxlength: 100 },
    utmCampaign: { type: String, maxlength: 100 },
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

crmCampaignSchema.index({ branchId: 1, status: 1 });
crmCampaignSchema.index({ scheduledAt: 1 });

crmCampaignSchema.virtual('openRate').get(function () {
  return this.sentCount > 0 ? Math.round((this.openedCount / this.sentCount) * 10000) / 100 : 0;
});

crmCampaignSchema.virtual('clickRate').get(function () {
  return this.openedCount > 0
    ? Math.round((this.clickedCount / this.openedCount) * 10000) / 100
    : 0;
});

crmCampaignSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.models.CrmCampaign || mongoose.model('CrmCampaign', crmCampaignSchema);

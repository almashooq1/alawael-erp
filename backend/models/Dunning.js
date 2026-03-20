/**
 * Dunning Model - إدارة التحصيل والمطالبات
 * Payment reminders, collection workflows & dunning management
 */
const mongoose = require('mongoose');

/* ── Dunning Profile (template for reminder schedules) ── */
const dunningLevelSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  daysOverdue: { type: Number, required: true },
  channel: {
    type: String,
    enum: ['email', 'sms', 'whatsapp', 'letter', 'phone'],
    default: 'email',
  },
  templateSubject: { type: String },
  templateBody: { type: String },
  feePercentage: { type: Number, default: 0 },
  feeFixedAmount: { type: Number, default: 0 },
  autoSend: { type: Boolean, default: false },
});

const dunningProfileSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    description: { type: String },
    levels: [dunningLevelSchema],
    escalationAction: {
      type: String,
      enum: ['none', 'block_sales', 'legal_notice', 'collections_agency', 'write_off_review'],
      default: 'none',
    },
    escalationAfterDays: { type: Number, default: 120 },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dunningProfileSchema.index({ organization: 1, isActive: 1 });

/* ── Dunning History (per customer/invoice reminder record) ── */
const dunningHistorySchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    customerName: { type: String },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountingInvoice' },
    invoiceNumber: { type: String },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'DunningProfile' },
    level: { type: Number, required: true },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'letter', 'phone'],
      default: 'email',
    },
    sentAt: { type: Date, default: Date.now },
    amountDue: { type: Number, default: 0 },
    feeApplied: { type: Number, default: 0 },
    response: {
      type: String,
      enum: ['no_response', 'acknowledged', 'disputed', 'promised', 'paid', 'partial_paid'],
      default: 'no_response',
    },
    promiseDate: { type: Date },
    promiseAmount: { type: Number },
    promiseFulfilled: { type: Boolean, default: false },
    escalated: { type: Boolean, default: false },
    escalatedAt: { type: Date },
    notes: { type: String },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dunningHistorySchema.index({ organization: 1, customerId: 1 });
dunningHistorySchema.index({ sentAt: -1 });
dunningHistorySchema.index({ response: 1, promiseDate: 1 });

const DunningProfile = mongoose.model('DunningProfile', dunningProfileSchema);
const DunningHistory = mongoose.model('DunningHistory', dunningHistorySchema);

module.exports = { DunningProfile, DunningHistory };

/**
 * Petty Cash Model - إدارة العهد والصندوق
 * Petty cash custodian management, advances & replenishments
 */
const mongoose = require('mongoose');

const pettyCashSchema = new mongoose.Schema(
  {
    fundName: { type: String, required: true, trim: true },
    fundNameEn: { type: String, trim: true },
    custodian: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    custodianName: { type: String, required: true },
    fundLimit: { type: Number, required: true },
    currentBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    status: {
      type: String,
      enum: ['active', 'suspended', 'closed', 'pending_replenishment'],
      default: 'active',
    },
    department: { type: String },
    chartAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    lastReplenishmentDate: { type: Date },
    lastReplenishmentAmount: { type: Number },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const pettyCashTransactionSchema = new mongoose.Schema(
  {
    fundId: { type: mongoose.Schema.Types.ObjectId, ref: 'PettyCash', required: true },
    transactionNumber: { type: String, unique: true },
    type: {
      type: String,
      enum: ['expense', 'replenishment', 'advance', 'return', 'adjustment'],
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'office_supplies',
        'transportation',
        'meals',
        'maintenance',
        'printing',
        'postage',
        'cleaning',
        'miscellaneous',
        'replenishment',
        'other',
      ],
    },
    receiptNumber: { type: String },
    vendorName: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'posted'],
      default: 'pending',
    },
    attachments: [{ filename: String, path: String, uploadDate: Date }],
    balanceAfter: { type: Number },
    notes: { type: String },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

pettyCashTransactionSchema.pre('save', async function (next) {
  if (!this.transactionNumber) {
    const prefix = this.type === 'replenishment' ? 'PCR' : 'PCT';
    const count = await mongoose.model('PettyCashTransaction').countDocuments();
    this.transactionNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

pettyCashSchema.index({ organization: 1, status: 1 });
pettyCashTransactionSchema.index({ fundId: 1, date: -1 });
pettyCashTransactionSchema.index({ status: 1, type: 1 });

const PettyCash = mongoose.model('PettyCash', pettyCashSchema);
const PettyCashTransaction = mongoose.model('PettyCashTransaction', pettyCashTransactionSchema);

module.exports = { PettyCash, PettyCashTransaction };

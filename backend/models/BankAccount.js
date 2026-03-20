/**
 * Bank Account Model - سجل الحسابات البنكية
 * Treasury management & bank account register
 */
const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema(
  {
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNameEn: { type: String, trim: true },
    bankName: { type: String, required: true, trim: true },
    bankNameEn: { type: String, trim: true },
    branchName: { type: String, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    iban: {
      type: String,
      trim: true,
      validate: {
        validator: v => !v || /^SA\d{22}$/.test(v.replace(/\s/g, '')),
        message: 'IBAN سعودي غير صالح',
      },
    },
    swiftCode: { type: String, trim: true },
    currency: {
      type: String,
      default: 'SAR',
      enum: ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP'],
    },
    accountType: {
      type: String,
      enum: ['current', 'savings', 'deposit', 'investment', 'escrow', 'payroll'],
      default: 'current',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'frozen', 'closed'],
      default: 'active',
    },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    openingDate: { type: Date },
    chartAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    isPrimary: { type: Boolean, default: false },
    signatories: [
      {
        name: String,
        role: String,
        limit: Number,
      },
    ],
    contactPerson: { type: String },
    contactPhone: { type: String },
    notes: { type: String },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

bankAccountSchema.index({ organization: 1, status: 1 });
bankAccountSchema.index({ bankName: 1, accountNumber: 1 }, { unique: true });
bankAccountSchema.index({ iban: 1 }, { sparse: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema);

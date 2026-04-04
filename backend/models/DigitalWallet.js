/**
 * DigitalWallet Model — System 39: Digital Wallet
 * المحفظة الرقمية للمستفيدين وأولياء الأمور
 */
const mongoose = require('mongoose');

const digitalWalletSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    walletNumber: { type: String, unique: true, required: true },
    uuid: { type: String, unique: true, required: true },

    // المالك (مستفيد أو ولي أمر) — مورفي
    ownerType: {
      type: String,
      enum: ['Beneficiary', 'Guardian'],
      required: true,
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },

    // الأرصدة
    balance: { type: Number, default: 0, min: 0 },
    frozenBalance: { type: Number, default: 0, min: 0 }, // رصيد مجمد
    totalToppedUp: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },

    // الحالة
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'closed'],
      default: 'active',
    },
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String },
    blockedAt: { type: Date },

    // حدود المعاملات
    dailyLimit: { type: Number, default: null }, // null = بلا حد
    monthlyLimit: { type: Number, default: null },
    singleTransactionLimit: { type: Number, default: null },

    // نقاط الولاء
    loyaltyPoints: { type: Number, default: 0, min: 0 },

    // PIN
    pinHash: { type: String, select: false },
    failedPinAttempts: { type: Number, default: 0 },
    pinLockedUntil: { type: Date },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'digital_wallets',
  }
);

// Indexes
digitalWalletSchema.index({ branchId: 1, status: 1 });
digitalWalletSchema.index({ ownerType: 1, ownerId: 1 });
digitalWalletSchema.index({ walletNumber: 1 });
digitalWalletSchema.index({ isBlocked: 1 });
digitalWalletSchema.index({ deletedAt: 1 });

// Virtual: الرصيد المتاح
digitalWalletSchema.virtual('availableBalance').get(function () {
  return this.balance - this.frozenBalance;
});

// Virtual: الرصيد المنسق
digitalWalletSchema.virtual('formattedBalance').get(function () {
  return `${this.balance.toFixed(2)} SAR`;
});

module.exports = mongoose.model('DigitalWallet', digitalWalletSchema);

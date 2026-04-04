/**
 * WalletTransaction Model — System 39: Digital Wallet
 * معاملات المحفظة الرقمية
 */
const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    referenceNumber: { type: String, unique: true, required: true },
    uuid: { type: String, unique: true, required: true },

    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalWallet', required: true },

    // نوع المعاملة
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    subType: {
      type: String,
      enum: [
        'topup',
        'payment',
        'transfer_in',
        'transfer_out',
        'refund',
        'cashback',
        'loyalty_redemption',
        'coupon_discount',
        'adjustment',
        'freeze',
      ],
      required: true,
    },

    // المبالغ
    amount: { type: Number, required: true, min: 0 },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },

    // الوصف
    description: { type: String },

    // الكيان المرتبط (مورفي)
    relatedType: { type: String }, // PaymentTransaction, Invoice, etc.
    relatedId: { type: mongoose.Schema.Types.ObjectId },

    // المحفظة المقابلة (للتحويلات)
    counterpartWalletId: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalWallet' },

    // الحالة
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'completed',
    },

    // البيانات الإضافية
    metadata: { type: mongoose.Schema.Types.Mixed },

    // نقاط الولاء
    loyaltyPointsEarned: { type: Number, default: 0 },
    loyaltyPointsUsed: { type: Number, default: 0 },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'wallet_transactions',
  }
);

walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ branchId: 1, type: 1 });
walletTransactionSchema.index({ relatedType: 1, relatedId: 1 });
walletTransactionSchema.index({ counterpartWalletId: 1 });
walletTransactionSchema.index({ status: 1 });
walletTransactionSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);

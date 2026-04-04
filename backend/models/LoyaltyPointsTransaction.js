/**
 * LoyaltyPointsTransaction Model — System 39: Digital Wallet
 * معاملات نقاط الولاء
 */
const mongoose = require('mongoose');

const loyaltyPointsTransactionSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true, required: true },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalWallet', required: true },

    type: {
      type: String,
      enum: ['earn', 'redeem', 'expire', 'adjust'],
      required: true,
    },

    points: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },

    description: { type: String },

    // المصدر (مورفي)
    sourceType: { type: String }, // WalletTransaction, PaymentTransaction, etc.
    sourceId: { type: mongoose.Schema.Types.ObjectId },

    expiresAt: { type: Date }, // للنقاط المكتسبة

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'loyalty_points_transactions',
  }
);

loyaltyPointsTransactionSchema.index({ walletId: 1, createdAt: -1 });
loyaltyPointsTransactionSchema.index({ type: 1 });
loyaltyPointsTransactionSchema.index({ expiresAt: 1, type: 1 });
loyaltyPointsTransactionSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('LoyaltyPointsTransaction', loyaltyPointsTransactionSchema);

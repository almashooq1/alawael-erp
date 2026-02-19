/**
 * Transaction Model - Phase 2
 * Handles income, expense, and transfer transactions
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      indexed: true,
    },

    amount: {
      type: Number,
      required: true,
      validate: {
        validator: v => v > 0,
        message: 'Amount must be positive',
      },
    },

    type: {
      type: String,
      enum: ['income', 'expense', 'transfer'],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      default: 'uncategorized',
    },

    date: {
      type: Date,
      default: Date.now,
      indexed: true,
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'verified'],
      default: 'completed',
    },

    tags: [String],

    notes: String,

    receipts: [
      {
        filename: String,
        fileId: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

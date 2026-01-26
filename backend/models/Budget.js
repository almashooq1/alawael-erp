/**
 * ===================================================================
 * BUDGET MODEL - نموذج الميزانية
 * ===================================================================
 */

const mongoose = require('mongoose');

const budgetLineSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  spent: {
    type: Number,
    default: 0,
  },
  remaining: {
    type: Number,
    default: 0,
  },
  notes: String,
});

const budgetSchema = new mongoose.Schema(
  {
    // اسم الميزانية
    name: {
      type: String,
      required: true,
    },

    // الفترة
    fiscalYear: {
      type: Number,
      required: true,
    },
    period: {
      type: String,
      enum: ['annual', 'quarterly', 'monthly'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },

    // القسم أو المشروع
    department: String,
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },

    // السطور
    lines: {
      type: [budgetLineSchema],
      required: true,
    },

    // الإجماليات
    totalBudgeted: {
      type: Number,
      required: true,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    totalRemaining: {
      type: Number,
      default: 0,
    },
    utilizationPercentage: {
      type: Number,
      default: 0,
    },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'approved', 'active', 'closed'],
      default: 'draft',
    },

    // الموافقة
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,

    // الملاحظات
    notes: String,

    // معلومات التتبع
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// فهرسة
budgetSchema.index({ fiscalYear: 1, period: 1 });
budgetSchema.index({ status: 1 });
budgetSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Budget', budgetSchema);

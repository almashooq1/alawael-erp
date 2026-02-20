const mongoose = require('mongoose');
const moment = require('moment');

/**
 * Budget Schema
 * Manages departmental/project budgets and expense tracking
 */
const BudgetSchema = new mongoose.Schema(
  {
    // Budget Identification
    budgetName: {
      type: String,
      required: true
    },

    budgetCode: {
      type: String,
      unique: true,
      required: true
    },

    // Budget Period
    fiscalYear: {
      type: Number,
      required: true,
    },

    quarter: {
      type: Number,
      enum: [1, 2, 3, 4],
    },

    month: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // Classification
    department: {
      type: String,
      required: true
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },

    costCenter: String,

    // Budget Categories
    categories: [
      {
        categoryName: String,
        categoryId: String,
        allocatedAmount: Number,
        spent: {
          type: Number,
          default: 0,
        },
        committed: {
          type: Number,
          default: 0,
        },
        available: Number,
        percentageUsed: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ['under', 'on_track', 'warning', 'exceeded'],
          default: 'on_track',
        },
        notes: String,
      },
    ],

    // Overall Budget Amounts
    totalAllocated: {
      type: Number,
      required: true,
    },

    totalSpent: {
      type: Number,
      default: 0,
    },

    totalCommitted: {
      type: Number,
      default: 0,
    },

    totalAvailable: {
      type: Number,
      required: true,
    },

    // Budget Status
    status: {
      type: String,
      enum: ['draft', 'approved', 'active', 'closed', 'archived'],
      default: 'draft'
    },

    budgetHealthStatus: {
      type: String,
      enum: ['healthy', 'warning', 'critical'],
      default: 'healthy',
    },

    percentageUsed: {
      type: Number,
      default: 0,
    },

    // Approval Workflow
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'on_hold'],
      default: 'pending',
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvalDate: Date,

    approvalNotes: String,

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Variance Analysis
    variance: {
      type: Number,
      default: 0,
    },

    variancePercentage: {
      type: Number,
      default: 0,
    },

    varianceReason: String,

    // Forecast Data
    forecastedSpend: {
      type: Number,
      default: 0,
    },

    forecastedEndDate: Date,

    onTrack: {
      type: Boolean,
      default: true,
    },

    // Budget Rules
    canExceed: {
      type: Boolean,
      default: false,
    },

    excessApprovalRequired: {
      type: Boolean,
      default: true,
    },

    freezeThreshold: {
      type: Number,
      default: 90, // Percentage at which budget is frozen
    },

    warningThreshold: {
      type: Number,
      default: 75, // Percentage at which warning is triggered
    },

    // Linked Expenses
    expenses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense',
      },
    ],

    // Alerts & Notifications
    alerts: [
      {
        alertType: String,
        message: String,
        severity: {
          type: String,
          enum: ['info', 'warning', 'critical'],
        },
        createdAt: Date,
      },
    ],

    alertsEnabled: {
      type: Boolean,
      default: true,
    },

    // Audit Trail
    revisions: [
      {
        revisedAt: Date,
        revisedBy: mongoose.Schema.Types.ObjectId,
        previousAmount: Number,
        newAmount: Number,
        reason: String,
      },
    ],

    // Notes
    notes: String,

    internalNotes: String,

    // Soft Delete
    deletedAt: {
      type: Date,
      default: null,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
BudgetSchema.index({ department: 1, fiscalYear: 1 });
BudgetSchema.index({ status: 1, approvalStatus: 1 });
BudgetSchema.index({ projectId: 1 });

// Virtuals

/**
 * Days remaining in budget period
 */
BudgetSchema.virtual('daysRemaining').get(function () {
  return moment(this.endDate).diff(moment(), 'days');
});

/**
 * Is budget expired
 */
BudgetSchema.virtual('isExpired').get(function () {
  return moment() > moment(this.endDate);
});

/**
 * Budget utilization rate
 */
BudgetSchema.virtual('utilizationRate').get(function () {
  if (this.totalAllocated === 0) return 0;
  return (this.totalSpent / this.totalAllocated) * 100;
});

/**
 * Is budget frozen
 */
BudgetSchema.virtual('isFrozen').get(function () {
  return this.percentageUsed >= this.freezeThreshold;
});

// Instance Methods

/**
 * Update budget spent amount
 */
BudgetSchema.methods.recordExpense = function (amount, categoryId) {
  if (this.isFrozen && !this.canExceed) {
    throw new Error('Budget is frozen');
  }

  const category = this.categories.find(c => c.categoryId === categoryId);
  if (category) {
    category.spent += amount;
    category.available = category.allocatedAmount - category.spent - category.committed;
    category.percentageUsed = (category.spent / category.allocatedAmount) * 100;

    if (category.percentageUsed >= this.freezeThreshold) {
      category.status = 'exceeded';
    } else if (category.percentageUsed >= this.warningThreshold) {
      category.status = 'warning';
    } else {
      category.status = 'on_track';
    }
  }

  this.totalSpent += amount;
  this.totalAvailable = this.totalAllocated - this.totalSpent - this.totalCommitted;
  this.percentageUsed = (this.totalSpent / this.totalAllocated) * 100;

  this.updateHealthStatus();
  return this.save();
};

/**
 * Record committed amount (purchase order, contract, etc.)
 */
BudgetSchema.methods.commitAmount = function (amount, categoryId) {
  const category = this.categories.find(c => c.categoryId === categoryId);
  if (category) {
    category.committed += amount;
    category.available = category.allocatedAmount - category.spent - category.committed;
  }

  this.totalCommitted += amount;
  this.totalAvailable = this.totalAllocated - this.totalSpent - this.totalCommitted;
  return this.save();
};

/**
 * Reversal of committed amount
 */
BudgetSchema.methods.uncommitAmount = function (amount, categoryId) {
  const category = this.categories.find(c => c.categoryId === categoryId);
  if (category) {
    category.committed = Math.max(0, category.committed - amount);
    category.available = category.allocatedAmount - category.spent - category.committed;
  }

  this.totalCommitted = Math.max(0, this.totalCommitted - amount);
  this.totalAvailable = this.totalAllocated - this.totalSpent - this.totalCommitted;
  return this.save();
};

/**
 * Approve budget
 */
BudgetSchema.methods.approve = function (userId) {
  this.approvalStatus = 'approved';
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvalDate = new Date();
  return this.save();
};

/**
 * Activate budget
 */
BudgetSchema.methods.activate = function () {
  if (this.approvalStatus !== 'approved') {
    throw new Error('Budget must be approved before activation');
  }
  this.status = 'active';
  return this.save();
};

/**
 * Close budget period
 */
BudgetSchema.methods.close = function () {
  this.status = 'closed';
  return this.save();
};

/**
 * Update health status
 */
BudgetSchema.methods.updateHealthStatus = function () {
  if (this.percentageUsed >= 100) {
    this.budgetHealthStatus = 'critical';
  } else if (this.percentageUsed >= this.warningThreshold) {
    this.budgetHealthStatus = 'warning';
  } else {
    this.budgetHealthStatus = 'healthy';
  }
};

/**
 * Add alert
 */
BudgetSchema.methods.addAlert = function (alertType, message, severity = 'info') {
  if (!this.alerts) this.alerts = [];
  this.alerts.push({
    alertType,
    message,
    severity,
    createdAt: new Date(),
  });
  return this.save();
};

/**
 * Revise budget amount
 */
BudgetSchema.methods.revise = function (newAmount, userId, reason) {
  const previousAmount = this.totalAllocated;
  this.revisions = this.revisions || [];
  this.revisions.push({
    revisedAt: new Date(),
    revisedBy: userId,
    previousAmount,
    newAmount,
    reason,
  });

  const variance = newAmount - previousAmount;
  this.totalAllocated = newAmount;
  this.totalAvailable = this.totalAllocated - this.totalSpent - this.totalCommitted;
  this.variance = variance;
  this.variancePercentage = (variance / previousAmount) * 100;

  return this.save();
};

// Static Methods

/**
 * Get budgets by status
 */
BudgetSchema.statics.getByStatus = function (status) {
  return this.find({ status, deletedAt: null }).sort({ createdAt: -1 });
};

/**
 * Get budgets needing approval
 */
BudgetSchema.statics.getPendingApproval = function () {
  return this.find({
    approvalStatus: 'pending',
    deletedAt: null,
  }).sort({ createdAt: 1 });
};

/**
 * Get budgets at warning threshold
 */
BudgetSchema.statics.getWarningBudgets = function () {
  return this.find({
    budgetHealthStatus: { $in: ['warning', 'critical'] },
    deletedAt: null,
  });
};

/**
 * Calculate departmental spending
 */
BudgetSchema.statics.getDepartmentSpending = function (department, fiscalYear) {
  return this.aggregate([
    {
      $match: {
        department,
        fiscalYear,
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: null,
        totalAllocated: { $sum: '$totalAllocated' },
        totalSpent: { $sum: '$totalSpent' },
        totalAvailable: { $sum: '$totalAvailable' },
        budgetCount: { $sum: 1 },
      },
    },
  ]);
};

module.exports = mongoose.model('Budget', BudgetSchema);

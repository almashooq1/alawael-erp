/**
 * Finance Service - Phase 2
 * Comprehensive financial management system
 * Handles transactions, budgets, reconciliation, and reporting
 */

const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const logger = require('../utils/logger');

class FinanceService {
  /**
   * Create a new transaction
   */
  static async createTransaction(data) {
    try {
      const { userId, amount, type, description, category, date = new Date(), tags, notes } = data;

      // Validation
      if (!amount || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      if (!type || !['income', 'expense', 'transfer'].includes(type)) {
        throw new Error('Invalid transaction type');
      }

      if (!description) {
        throw new Error('Description is required');
      }

      const transaction = new Transaction({
        userId,
        amount,
        type,
        description,
        category,
        date,
        tags,
        notes,
        status: 'completed',
      });

      await transaction.save();
      logger.info(`Transaction created: ${transaction._id}`);

      return {
        success: true,
        transaction: transaction.toObject(),
      };
    } catch (error) {
      logger.error('Create transaction error:', error);
      throw error;
    }
  }

  /**
   * Get all transactions with filtering
   */
  static async getTransactions(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        category,
        startDate,
        endDate,
        status,
        sort = '-date',
        search,
      } = filters;

      const query = { userId };

      if (type) query.type = type;
      if (category) query.category = category;
      if (status) query.status = status;

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      if (search) {
        query.$or = [
          { description: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;

      const transactions = await Transaction.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean();

      const total = await Transaction.countDocuments(query);

      return {
        success: true,
        transactions,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Get transactions error:', error);
      throw error;
    }
  }

  /**
   * Get a single transaction
   */
  static async getTransactionById(transactionId) {
    try {
      const transaction = await Transaction.findById(transactionId).lean();

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      logger.error('Get transaction error:', error);
      throw error;
    }
  }

  /**
   * Calculate account balance
   */
  static async getBalance(userId) {
    try {
      const income = await Transaction.aggregate([
        {
          $match: {
            userId: require('mongoose').Types.ObjectId.isValid(userId)
              ? new require('mongoose').Types.ObjectId(userId)
              : userId,
            type: 'income',
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const expenses = await Transaction.aggregate([
        {
          $match: {
            userId: require('mongoose').Types.ObjectId.isValid(userId)
              ? new require('mongoose').Types.ObjectId(userId)
              : userId,
            type: 'expense',
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const totalIncome = income.length > 0 ? income[0].total : 0;
      const totalExpense = expenses.length > 0 ? expenses[0].total : 0;
      const balance = totalIncome - totalExpense;

      return {
        success: true,
        userId,
        totalIncome,
        totalExpense,
        balance,
      };
    } catch (error) {
      logger.error('Get balance error:', error);
      throw error;
    }
  }

  /**
   * Update transaction
   */
  static async updateTransaction(transactionId, data) {
    try {
      const transaction = await Transaction.findByIdAndUpdate(transactionId, data, {
        new: true,
      }).lean();

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      logger.error('Update transaction error:', error);
      throw error;
    }
  }

  /**
   * Delete transaction
   */
  static async deleteTransaction(transactionId) {
    try {
      const transaction = await Transaction.findByIdAndDelete(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        success: true,
        deletedId: transactionId,
      };
    } catch (error) {
      logger.error('Delete transaction error:', error);
      throw error;
    }
  }

  /**
   * Create a budget
   */
  static async createBudget(data) {
    try {
      const { userId, name, limit, category, period = 'monthly', startDate, endDate } = data;

      if (!name || !limit || limit <= 0) {
        throw new Error('Name and positive limit are required');
      }

      const budget = new Budget({
        userId,
        name,
        limit,
        category,
        period,
        startDate,
        endDate,
        spent: 0,
        remaining: limit,
      });

      await budget.save();
      logger.info(`Budget created: ${budget._id}`);

      return {
        success: true,
        budget: budget.toObject(),
      };
    } catch (error) {
      logger.error('Create budget error:', error);
      throw error;
    }
  }

  /**
   * Get all budgets
   */
  static async getBudgets(userId, filters = {}) {
    try {
      const query = { userId };

      const budgets = await Budget.find(query).sort('-createdAt').lean();

      // Calculate spent amount for each budget
      const budgetsWithSpent = await Promise.all(
        budgets.map(async budget => {
          const spent = await Transaction.aggregate([
            {
              $match: {
                userId: require('mongoose').Types.ObjectId.isValid(userId)
                  ? new require('mongoose').Types.ObjectId(userId)
                  : userId,
                category: budget.category,
                type: 'expense',
                status: 'completed',
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$amount' },
              },
            },
          ]);

          return {
            ...budget,
            spent: spent.length > 0 ? spent[0].total : 0,
            remaining: budget.limit - (spent.length > 0 ? spent[0].total : 0),
          };
        })
      );

      return {
        success: true,
        budgets: budgetsWithSpent,
      };
    } catch (error) {
      logger.error('Get budgets error:', error);
      throw error;
    }
  }

  /**
   * Get single budget
   */
  static async getBudgetById(budgetId) {
    try {
      const budget = await Budget.findById(budgetId).lean();

      if (!budget) {
        throw new Error('Budget not found');
      }

      return {
        success: true,
        budget,
      };
    } catch (error) {
      logger.error('Get budget error:', error);
      throw error;
    }
  }

  /**
   * Check budget status
   */
  static async checkBudgetStatus(budgetId) {
    try {
      const budget = await Budget.findById(budgetId);

      if (!budget) {
        throw new Error('Budget not found');
      }

      // Calculate spent
      const spent = await Transaction.countDocuments({
        category: budget.category,
        type: 'expense',
        status: 'completed',
      });

      const remaining = budget.limit - spent;
      const percentage = (spent / budget.limit) * 100;

      return {
        success: true,
        budgetId,
        limit: budget.limit,
        spent,
        remaining,
        percentageUsed: percentage,
        status: percentage > 100 ? 'exceeded' : percentage > 80 ? 'warning' : 'ok',
      };
    } catch (error) {
      logger.error('Check budget status error:', error);
      throw error;
    }
  }

  /**
   * Delete budget
   */
  static async deleteBudget(budgetId) {
    try {
      const budget = await Budget.findByIdAndDelete(budgetId);

      if (!budget) {
        throw new Error('Budget not found');
      }

      return {
        success: true,
        deletedId: budgetId,
      };
    } catch (error) {
      logger.error('Delete budget error:', error);
      throw error;
    }
  }

  /**
   * Reconcile accounts
   */
  static async reconcile(userId) {
    try {
      const transactions = await Transaction.find({ userId }).lean();

      // Verify all transactions are properly recorded
      const discrepancies = [];

      transactions.forEach(trans => {
        if (!trans.amount || trans.amount <= 0) {
          discrepancies.push({
            transactionId: trans._id,
            issue: 'Invalid amount',
          });
        }
      });

      return {
        success: true,
        userId,
        reconciled: true,
        discrepancies: discrepancies.length,
        detailedDiscrepancies: discrepancies.length > 0 ? discrepancies : null,
      };
    } catch (error) {
      logger.error('Reconcile error:', error);
      throw error;
    }
  }

  /**
   * Get financial summary/report
   */
  static async getSummary(userId, startDate, endDate) {
    try {
      const query = { userId, status: 'completed' };

      if (startDate) query.date = { $gte: new Date(startDate) };
      if (endDate) {
        if (!query.date) query.date = {};
        query.date.$lte = new Date(endDate);
      }

      const transactions = await Transaction.find(query).lean();

      const incomeTransactions = transactions.filter(t => t.type === 'income');
      const expenseTransactions = transactions.filter(t => t.type === 'expense');

      const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncome - totalExpense;

      // Group by category
      const byCategory = {};
      transactions.forEach(trans => {
        if (!byCategory[trans.category]) {
          byCategory[trans.category] = { income: 0, expense: 0 };
        }
        if (trans.type === 'income') {
          byCategory[trans.category].income += trans.amount;
        } else if (trans.type === 'expense') {
          byCategory[trans.category].expense += trans.amount;
        }
      });

      return {
        success: true,
        userId,
        period: {
          startDate,
          endDate,
        },
        summary: {
          totalIncome,
          totalExpense,
          balance,
          transactionCount: transactions.length,
          incomeCount: incomeTransactions.length,
          expenseCount: expenseTransactions.length,
        },
        byCategory,
      };
    } catch (error) {
      logger.error('Get summary error:', error);
      throw error;
    }
  }

  /**
   * Export transactions
   */
  static async exportTransactions(userId, format = 'json') {
    try {
      const transactions = await Transaction.find({ userId }).lean();

      return {
        success: true,
        format,
        count: transactions.length,
        data: transactions,
      };
    } catch (error) {
      logger.error('Export transactions error:', error);
      throw error;
    }
  }

  /**
   * Get transaction categories
   */
  static async getCategories() {
    try {
      const categories = [
        'income',
        'salary',
        'sales',
        'investments',
        'expense',
        'utilities',
        'supplies',
        'travel',
        'food',
        'entertainment',
        'equipment',
        'other',
      ];

      return {
        success: true,
        categories,
      };
    } catch (error) {
      logger.error('Get categories error:', error);
      throw error;
    }
  }

  /**
   * Bulk create transactions
   */
  static async bulkCreateTransactions(userId, transactions) {
    try {
      if (!Array.isArray(transactions) || transactions.length === 0) {
        throw new Error('Invalid transactions array');
      }

      const created = [];
      for (const transData of transactions) {
        try {
          const result = await this.createTransaction({
            userId,
            ...transData,
          });
          created.push(result.transaction);
        } catch (err) {
          logger.error('Error creating transaction in bulk:', err);
        }
      }

      return {
        success: true,
        created: created.length,
        transactions: created,
      };
    } catch (error) {
      logger.error('Bulk create transactions error:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics
   */
  static async getStatistics(userId) {
    try {
      const transactions = await Transaction.find({ userId }).lean();

      const totalTransactions = transactions.length;
      const averageTransaction =
        transactions.reduce((sum, t) => sum + t.amount, 0) / (totalTransactions || 1);

      const incomeTransactions = transactions.filter(t => t.type === 'income');
      const expenseTransactions = transactions.filter(t => t.type === 'expense');

      return {
        success: true,
        userId,
        statistics: {
          totalTransactions,
          incomeTransactions: incomeTransactions.length,
          expenseTransactions: expenseTransactions.length,
          averageTransaction,
          largestTransaction: Math.max(...transactions.map(t => t.amount), 0),
          smallestTransaction: Math.min(...transactions.map(t => t.amount), Infinity),
        },
      };
    } catch (error) {
      logger.error('Get statistics error:', error);
      throw error;
    }
  }
}

module.exports = FinanceService;

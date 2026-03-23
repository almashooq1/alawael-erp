/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * FINANCE CORE SERVICE - خدمة المحاسبة الأساسية
 * ===================================================================
 * النسخة: 2.0.0
 * الوصف: خدمة القيد المزدوج وتحليل الربحية المدعومة بقاعدة البيانات
 * ===================================================================
 */

const mongoose = require('mongoose');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const Expense = require('../models/Expense');
const logger = require('../utils/logger');

class FinanceCoreService {
  /**
   * Create a Double-Entry Journal Record backed by MongoDB
   * Ensures Debits = Credits
   */
  static async createJournalEntry(reference, description, entries, userId) {
    // entries: [{ accountId: '...', account: 'Cash', debit: 100, credit: 0 }]

    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Unbalanced Journal Entry. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    if (!entries || entries.length < 2) {
      throw new Error('Journal entry must have at least 2 lines');
    }

    // Build lines array with proper schema mapping
    const lines = entries.map(e => ({
      accountId: e.accountId || undefined,
      account: e.account || '',
      accountCode: e.accountCode || '',
      debit: e.debit || 0,
      credit: e.credit || 0,
      costCenter: e.costCenter || undefined,
      description: e.description || '',
    }));

    const journalEntry = await JournalEntry.create({
      reference,
      date: new Date(),
      description,
      type: 'manual',
      lines,
      status: 'draft',
      createdBy: userId,
    });

    logger.info(`[FinanceCore] Created Journal Entry: ${journalEntry._id} (${reference})`);

    return {
      _id: journalEntry._id,
      reference: journalEntry.reference,
      entryNumber: journalEntry.entryNumber,
      date: journalEntry.date,
      description: journalEntry.description,
      lines: journalEntry.lines,
      status: journalEntry.status,
      totalDebit,
      totalCredit,
    };
  }

  /**
   * Post a draft journal entry — ترحيل قيد يومية
   */
  static async postJournalEntry(entryId, userId) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.status === 'posted') {
      throw new Error('Journal entry is already posted');
    }

    if (entry.status === 'cancelled') {
      throw new Error('Cannot post a cancelled journal entry');
    }

    entry.status = 'posted';
    entry.postedBy = userId;
    entry.postedAt = new Date();
    await entry.save();

    logger.info(`[FinanceCore] Posted Journal Entry: ${entry._id}`);

    return entry;
  }

  /**
   * Calculate Profitability per Service (Unit Economics)
   * Now uses real data from DB if available, falls back to estimation
   */
  static async analyzeServiceProfitability(serviceName, periodStart, periodEnd) {
    const dateFilter = {};
    if (periodStart) dateFilter.$gte = new Date(periodStart);
    if (periodEnd) dateFilter.$lte = new Date(periodEnd);

    // Aggregate revenue from journal entries (revenue accounts)
    const revenueAccounts = await Account.find({
      type: 'revenue',
      isActive: true,
    }).lean();

    const revenueAccountIds = revenueAccounts.map(a => a._id);

    const revenueQuery = {
      status: 'posted',
      'lines.accountId': { $in: revenueAccountIds },
    };
    if (periodStart || periodEnd) {
      revenueQuery.date = dateFilter;
    }

    const revenueEntries = await JournalEntry.find(revenueQuery).lean();

    let revenue = 0;
    revenueEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (revenueAccountIds.some(id => id.toString() === (line.accountId || '').toString())) {
          revenue += (line.credit || 0) - (line.debit || 0);
        }
      });
    });

    // Aggregate expenses
    const expenseAccounts = await Account.find({
      type: 'expense',
      isActive: true,
    }).lean();

    const expenseAccountIds = expenseAccounts.map(a => a._id);

    const expenseQuery = {
      status: 'posted',
      'lines.accountId': { $in: expenseAccountIds },
    };
    if (periodStart || periodEnd) {
      expenseQuery.date = dateFilter;
    }

    const expenseEntries = await JournalEntry.find(expenseQuery).lean();

    let directCost = 0;
    let overhead = 0;

    expenseEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (expenseAccountIds.some(id => id.toString() === (line.accountId || '').toString())) {
          const amount = (line.debit || 0) - (line.credit || 0);
          const account = expenseAccounts.find(
            a => a._id.toString() === (line.accountId || '').toString(),
          );
          if (account && account.category === 'operating_expense') {
            directCost += amount;
          } else {
            overhead += amount;
          }
        }
      });
    });

    // Also include Expense model records
    const expenseRecordQuery = { status: 'paid' };
    if (periodStart || periodEnd) {
      expenseRecordQuery.date = dateFilter;
    }

    const expenseRecords = await Expense.find(expenseRecordQuery).lean();
    const expenseRecordTotal = expenseRecords.reduce((sum, e) => sum + (e.amount || 0), 0);
    directCost += expenseRecordTotal;

    const totalCost = directCost + overhead;
    const netProfit = revenue - totalCost;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      service: serviceName,
      period: { start: periodStart, end: periodEnd },
      economics: {
        revenue,
        directCost,
        allocatedOverhead: overhead,
        totalCost,
        netProfit,
        marginPercent: margin.toFixed(2) + '%',
      },
      recommendation:
        margin < 10
          ? 'هامش ربح منخفض جداً. يجب مراجعة التسعير والتكاليف فوراً.'
          : margin < 20
            ? 'هامش ربح منخفض. يُنصح بمراجعة التكاليف التشغيلية.'
            : 'هامش ربح صحي.',
    };
  }

  /**
   * Get account balance summary — ملخص أرصدة الحسابات
   */
  static async getAccountBalanceSummary(startDate, endDate) {
    const accounts = await Account.find({ isActive: true }).lean();

    const summary = {
      assets: { total: 0, accounts: [] },
      liabilities: { total: 0, accounts: [] },
      equity: { total: 0, accounts: [] },
      revenue: { total: 0, accounts: [] },
      expenses: { total: 0, accounts: [] },
    };

    const query = { status: 'posted' };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const entries = await JournalEntry.find(query).lean();

    // Build balance map
    const balanceMap = {};
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        const id = (line.accountId || '').toString();
        if (!balanceMap[id]) balanceMap[id] = { debit: 0, credit: 0 };
        balanceMap[id].debit += line.debit || 0;
        balanceMap[id].credit += line.credit || 0;
      });
    });

    for (const account of accounts) {
      const bal = balanceMap[account._id.toString()] || { debit: 0, credit: 0 };
      let balance;

      if (['asset', 'expense'].includes(account.type)) {
        balance = bal.debit - bal.credit;
      } else {
        balance = bal.credit - bal.debit;
      }

      if (Math.abs(balance) > 0.01 && summary[account.type]) {
        summary[account.type].accounts.push({
          _id: account._id,
          code: account.code,
          name: account.name,
          balance,
        });
        summary[account.type].total += balance;
      }
    }

    return {
      success: true,
      period: { startDate, endDate },
      summary,
      generatedAt: new Date(),
    };
  }
}

module.exports = FinanceCoreService;

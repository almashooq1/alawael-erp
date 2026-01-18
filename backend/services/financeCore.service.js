const mongoose = require('mongoose');

// We'll need a JournalEntry model schema conceptually
// const JournalEntry = require('../models/JournalEntry'); // Mocked for this service

class FinanceCoreService {
  /**
   * Create a Double-Entry Journal Record
   * Ensures Debits = Credits
   */
  static async createJournalEntry(reference, description, entries, userId) {
    // entries: [{ account: 'Cash', debit: 100, credit: 0 }, { account: 'Revenue', debit: 0, credit: 100 }]

    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Unbalanced Journal Entry. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    const journalEntry = {
      reference,
      date: new Date(),
      description,
      entries,
      createdBy: userId,
      status: 'POSTED',
    };

    // await JournalEntry.create(journalEntry);
    // For demo, return the object
    console.log('[FinanceCore] Posted Journal Entry:', journalEntry);
    return journalEntry;
  }

  /**
   * Calculate Profitability per Service (Unit Economics)
   * Revenue - (Therapist Cost + Allocated Overhead)
   */
  static async analyzeServiceProfitability(serviceName, periodStart, periodEnd) {
    // 1. Get Total Revenue for this Service
    // Mocking DB aggregation
    const revenue = 50000; // e.g., derived from Invoices for 'Speech Therapy'
    const sessionCount = 500;

    // 2. Direct Costs (Therapist Commissions/Salaries for these sessions)
    const directLaborCost = 20000;

    // 3. Indirect Costs / Overheads (Rent, Electricity, Admin Salaries)
    // Simple Allocation Method: Allocate based on % of total revenue or session count
    const totalCenterSessions = 2000; // Total sessions across all disciplines
    const totalOverhead = 40000; // Total Rent + Utils

    const allocationRatio = sessionCount / totalCenterSessions; // 25%
    const allocatedOverhead = totalOverhead * allocationRatio; // 10,000

    // 4. Net Profit
    const totalCost = directLaborCost + allocatedOverhead;
    const netProfit = revenue - totalCost;
    const margin = (netProfit / revenue) * 100;

    return {
      service: serviceName,
      period: { start: periodStart, end: periodEnd },
      economics: {
        revenue,
        directCost: directLaborCost,
        allocatedOverhead: allocatedOverhead,
        totalCost,
        netProfit,
        marginPercent: margin.toFixed(2) + '%',
      },
      recommendation: margin < 20 ? 'Low Margin. Consider raising price or reducing session duration.' : 'Healthy Margin.',
    };
  }
}

module.exports = FinanceCoreService;

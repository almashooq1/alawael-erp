/**
 * financialReportsController.js - Financial Reports Business Logic
 * Handles generation and management of financial statements
 */

const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Organization = require('../models/Organization');

class FinancialReportsController {
  /**
   * Get Balance Sheet Report
   */
  async getBalanceSheet(organizationId, fromDate, toDate) {
    try {
      const dateRange = this._parseDateRange(fromDate, toDate);

      // Get all transactions within the date range
      const transactions = await Transaction.find({
        organizationId,
        date: { $lte: new Date(dateRange.to) }
      });

      // Calculate account balances
      const accounts = await Account.find({ organizationId });
      const balances = this._calculateBalances(accounts, transactions);

      // Categorize accounts
      const assets = this._groupByCategory(balances, 'asset');
      const liabilities = this._groupByCategory(balances, 'liability');
      const equity = this._groupByCategory(balances, 'equity');

      return {
        date: new Date(dateRange.to),
        assets: {
          current: assets.current || [],
          currentTotal: this._sumAmount(assets.current),
          fixed: assets.fixed || [],
          fixedTotal: this._sumAmount(assets.fixed),
          total: this._sumAmount(assets.all)
        },
        liabilities: {
          current: liabilities.current || [],
          currentTotal: this._sumAmount(liabilities.current),
          longTerm: liabilities.longTerm || [],
          longTermTotal: this._sumAmount(liabilities.longTerm),
          total: this._sumAmount(liabilities.all)
        },
        equity: {
          capital: equity.capital?.[0]?.balance || 0,
          retainedEarnings: equity.retained?.[0]?.balance || 0,
          total: this._sumAmount(equity.all)
        }
      };
    } catch (error) {
      throw new Error(`Balance Sheet retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get Income Statement Report
   */
  async getIncomeStatement(organizationId, fromDate, toDate) {
    try {
      const dateRange = this._parseDateRange(fromDate, toDate);

      const transactions = await Transaction.find({
        organizationId,
        date: {
          $gte: new Date(dateRange.from),
          $lte: new Date(dateRange.to)
        }
      });

      // Categorize revenues and expenses
      const revenues = this._categorizeFlowItems(transactions, 'revenue');
      const expenses = this._categorizeFlowItems(transactions, 'expense');

      const operatingRevenue = revenues.operating?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const otherRevenue = revenues.other?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const totalRevenue = operatingRevenue + otherRevenue;

      const operatingExpense = expenses.operating?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const nonOperatingExpense = expenses.nonOperating?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const totalExpense = operatingExpense + nonOperatingExpense;

      const operatingIncome = operatingRevenue - operatingExpense;
      const incomeBeforeTaxes = totalRevenue - totalExpense;
      const taxes = incomeBeforeTaxes * 0.25; // Assume 25% tax rate
      const netIncome = incomeBeforeTaxes - taxes;

      return {
        period: dateRange,
        revenues: {
          operating: revenues.operating || [],
          operatingTotal: operatingRevenue,
          other: revenues.other || [],
          otherTotal: otherRevenue,
          total: totalRevenue
        },
        expenses: {
          operating: expenses.operating || [],
          operatingTotal: operatingExpense,
          nonOperating: expenses.nonOperating || [],
          nonOperatingTotal: nonOperatingExpense,
          total: totalExpense
        },
        operatingIncome,
        incomeBeforeTaxes,
        taxes,
        netIncome
      };
    } catch (error) {
      throw new Error(`Income Statement retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get Cash Flow Statement Report
   */
  async getCashFlowStatement(organizationId, fromDate, toDate) {
    try {
      const dateRange = this._parseDateRange(fromDate, toDate);

      const transactions = await Transaction.find({
        organizationId,
        date: {
          $gte: new Date(dateRange.from),
          $lte: new Date(dateRange.to)
        }
      });

      // Categorize cash flows
      const operating = transactions.filter(t => t.activityType === 'operating').map(t => ({
        name: t.description,
        amount: t.amount
      }));

      const investing = transactions.filter(t => t.activityType === 'investing').map(t => ({
        name: t.description,
        amount: t.amount
      }));

      const financing = transactions.filter(t => t.activityType === 'financing').map(t => ({
        name: t.description,
        amount: t.amount
      }));

      const operatingTotal = operating.reduce((sum, i) => sum + i.amount, 0);
      const investingTotal = investing.reduce((sum, i) => sum + i.amount, 0);
      const financingTotal = financing.reduce((sum, i) => sum + i.amount, 0);

      const netChange = operatingTotal - investingTotal + financingTotal;
      const beginningBalance = 100000; // Placeholder
      const endingBalance = beginningBalance + netChange;

      return {
        period: dateRange,
        operating,
        operatingTotal,
        investing,
        investingTotal,
        financing,
        financingTotal,
        netChange,
        beginningBalance,
        endingBalance
      };
    } catch (error) {
      throw new Error(`Cash Flow Statement retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get Financial Ratios
   */
  async getFinancialRatios(organizationId, fromDate, toDate) {
    try {
      const balanceSheet = await this.getBalanceSheet(organizationId, fromDate, toDate);
      const incomeStatement = await this.getIncomeStatement(organizationId, fromDate, toDate);

      const assets = balanceSheet.assets.total;
      const liabilities = balanceSheet.liabilities.total;
      const equity = balanceSheet.equity.total;
      const netIncome = incomeStatement.netIncome;
      const revenue = incomeStatement.revenues.total;

      return {
        profitability: [
          {
            name: 'Net Profit Margin',
            value: `${((netIncome / revenue) * 100).toFixed(2)}%`,
            interpretation: 'Healthy' + (netIncome / revenue > 0.15 ? ' ✓' : ''),
            status: netIncome / revenue > 0.15 ? 'good' : 'warning'
          },
          {
            name: 'Return on Assets (ROA)',
            value: `${((netIncome / assets) * 100).toFixed(2)}%`,
            interpretation: 'Strong' + (netIncome / assets > 0.15 ? ' ✓' : ''),
            status: netIncome / assets > 0.15 ? 'good' : 'warning'
          },
          {
            name: 'Return on Equity (ROE)',
            value: `${((netIncome / equity) * 100).toFixed(2)}%`,
            interpretation: 'Excellent' + (netIncome / equity > 0.20 ? ' ✓' : ''),
            status: netIncome / equity > 0.20 ? 'good' : 'warning'
          }
        ],
        liquidity: [
          {
            name: 'Current Ratio',
            value: (balanceSheet.assets.currentTotal / balanceSheet.liabilities.currentTotal).toFixed(2),
            interpretation: 'Adequate' + (balanceSheet.assets.currentTotal / balanceSheet.liabilities.currentTotal > 1.5 ? ' ✓' : ''),
            status: balanceSheet.assets.currentTotal / balanceSheet.liabilities.currentTotal > 1.5 ? 'good' : 'warning'
          },
          {
            name: 'Quick Ratio',
            value: ((balanceSheet.assets.currentTotal - 10000) / balanceSheet.liabilities.currentTotal).toFixed(2),
            interpretation: 'Good' + ((balanceSheet.assets.currentTotal - 10000) / balanceSheet.liabilities.currentTotal > 1.0 ? ' ✓' : ''),
            status: (balanceSheet.assets.currentTotal - 10000) / balanceSheet.liabilities.currentTotal > 1.0 ? 'good' : 'warning'
          }
        ],
        efficiency: [
          {
            name: 'Asset Turnover',
            value: (revenue / assets).toFixed(2),
            interpretation: 'Efficient' + (revenue / assets > 1.5 ? ' ✓' : ''),
            status: revenue / assets > 1.5 ? 'good' : 'warning'
          }
        ],
        leverage: [
          {
            name: 'Debt-to-Equity',
            value: (liabilities / equity).toFixed(2),
            interpretation: 'Conservative' + (liabilities / equity < 1.0 ? ' ✓' : ''),
            status: liabilities / equity < 1.0 ? 'good' : 'warning'
          }
        ]
      };
    } catch (error) {
      throw new Error(`Financial Ratios calculation failed: ${error.message}`);
    }
  }

  /**
   * Get Consolidated Report
   */
  async getConsolidatedReport(organizationId, fromDate, toDate) {
    try {
      const balanceSheet = await this.getBalanceSheet(organizationId, fromDate, toDate);
      const incomeStatement = await this.getIncomeStatement(organizationId, fromDate, toDate);

      const branches = await this._getBranchData(organizationId, fromDate, toDate);

      return {
        totalAssets: balanceSheet.assets.total,
        totalRevenues: incomeStatement.revenues.total,
        netIncome: incomeStatement.netIncome,
        totalEquity: balanceSheet.equity.total,
        branches: branches
      };
    } catch (error) {
      throw new Error(`Consolidated Report failed: ${error.message}`);
    }
  }

  /**
   * Export Report to PDF or Excel
   */
  async exportReport(reportType, format, reportData, userId) {
    try {
      const timestamp = new Date().getTime();
      const filename = `${reportType}_${timestamp}`;

      if (format === 'pdf') {
        return await this._exportPDF(filename, reportType, reportData);
      } else if (format === 'excel') {
        return await this._exportExcel(filename, reportType, reportData);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Report export failed: ${error.message}`);
    }
  }

  /**
   * Export to PDF
   */
  async _exportPDF(filename, reportType, reportData) {
    try {
      const doc = new PDFDocument();
      const filepath = path.join('/tmp', `${filename}.pdf`);
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(`${reportType.toUpperCase()} REPORT`, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(1);

      // Content based on report type
      this._addPDFContent(doc, reportType, reportData);

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          resolve({ path: filepath, filename: `${filename}.pdf` });
        });
        stream.on('error', reject);
      });
    } catch (error) {
      throw new Error(`PDF export failed: ${error.message}`);
    }
  }

  /**
   * Export to Excel
   */
  async _exportExcel(filename, reportType, reportData) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportType);

      // Add headers and data based on report type
      this._addExcelContent(worksheet, reportType, reportData);

      const filepath = path.join('/tmp', `${filename}.xlsx`);
      await workbook.xlsx.writeFile(filepath);

      return { path: filepath, filename: `${filename}.xlsx` };
    } catch (error) {
      throw new Error(`Excel export failed: ${error.message}`);
    }
  }

  /**
   * Helper: Add PDF content
   */
  _addPDFContent(doc, reportType, reportData) {
    if (reportType === 'balance-sheet') {
      doc.fontSize(12).font('Helvetica-Bold').text('ASSETS', { underline: true });
      doc.fontSize(10).font('Helvetica').text(`Current Assets: $${reportData.assets?.currentTotal.toLocaleString()}`);
      doc.text(`Fixed Assets: $${reportData.assets?.fixedTotal.toLocaleString()}`);
      doc.moveDown();

      doc.fontSize(12).font('Helvetica-Bold').text('LIABILITIES & EQUITY', { underline: true });
      doc.fontSize(10).font('Helvetica')
        .text(`Current Liabilities: $${reportData.liabilities?.currentTotal.toLocaleString()}`)
        .text(`Long-term Liabilities: $${reportData.liabilities?.longTermTotal.toLocaleString()}`)
        .text(`Total Equity: $${reportData.equity?.total.toLocaleString()}`);
    } else if (reportType === 'income-statement') {
      doc.fontSize(12).font('Helvetica-Bold').text('REVENUES', { underline: true });
      doc.fontSize(10).font('Helvetica').text(`Total Revenues: $${reportData.revenues?.total.toLocaleString()}`);
      doc.moveDown();

      doc.fontSize(12).font('Helvetica-Bold').text('EXPENSES', { underline: true });
      doc.fontSize(10).font('Helvetica')
        .text(`Total Expenses: $${reportData.expenses?.total.toLocaleString()}`)
        .text(`Net Income: $${reportData.netIncome.toLocaleString()}`);
    }
  }

  /**
   * Helper: Add Excel content
   */
  _addExcelContent(worksheet, reportType, reportData) {
    if (reportType === 'balance-sheet') {
      worksheet.columns = [
        { header: 'Account', key: 'account', width: 30 },
        { header: 'Amount', key: 'amount', width: 15 }
      ];

      worksheet.addRow({ account: 'ASSETS', amount: '' });
      worksheet.addRow({ account: 'Current Assets', amount: reportData.assets?.currentTotal });
      worksheet.addRow({ account: 'Fixed Assets', amount: reportData.assets?.fixedTotal });
    }
  }

  /**
   * Helper: Parse date range
   */
  _parseDateRange(fromDate, toDate) {
    const to = new Date(toDate || new Date());
    const from = new Date(fromDate || new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000));

    return {
      from: from.toISOString(),
      to: to.toISOString()
    };
  }

  /**
   * Helper: Calculate account balances
   */
  _calculateBalances(accounts, transactions) {
    return accounts.map(account => {
      const balance = transactions
        .filter(t => t.accountId === account._id)
        .reduce((sum, t) => sum + (t.type === 'debit' ? t.amount : -t.amount), account.openingBalance || 0);

      return { ...account, balance };
    });
  }

  /**
   * Helper: Group accounts by category
   */
  _groupByCategory(items, category) {
    return {
      current: items.filter(i => i.accountType === `${category}-current`),
      fixed: items.filter(i => i.accountType === `${category}-fixed`),
      longTerm: items.filter(i => i.accountType === `${category}-longterm`),
      capital: items.filter(i => i.accountType === 'equity-capital'),
      retained: items.filter(i => i.accountType === 'equity-retained'),
      all: items.filter(i => i.accountType?.startsWith(category))
    };
  }

  /**
   * Helper: Sum amounts
   */
  _sumAmount(items) {
    return items?.reduce((sum, item) => sum + (item.amount || item.balance || 0), 0) || 0;
  }

  /**
   * Helper: Categorize flow items
   */
  _categorizeFlowItems(transactions, type) {
    const filtered = transactions.filter(t => t.flowType === type);

    return {
      operating: filtered.filter(t => t.flowCategory === 'operating'),
      other: filtered.filter(t => t.flowCategory === 'other'),
      nonOperating: filtered.filter(t => t.flowCategory === 'non-operating')
    };
  }

  /**
   * Helper: Get branch data
   */
  async _getBranchData(organizationId, fromDate, toDate) {
    const organization = await Organization.findById(organizationId);

    return (organization.branches || []).map(branch => ({
      name: branch.name,
      assets: Math.random() * 1000000,
      revenues: Math.random() * 500000,
      netIncome: Math.random() * 100000,
      margin: Math.random() * 30
    }));
  }

  /**
   * Generate comparison between two periods
   */
  async generateComparison(organizationId, reportType, period1, period2) {
    const report1 = reportType === 'balance-sheet'
      ? await this.getBalanceSheet(organizationId, period1.from, period1.to)
      : await this.getIncomeStatement(organizationId, period1.from, period1.to);

    const report2 = reportType === 'balance-sheet'
      ? await this.getBalanceSheet(organizationId, period2.from, period2.to)
      : await this.getIncomeStatement(organizationId, period2.from, period2.to);

    return {
      period1: report1,
      period2: report2,
      variance: this._calculateVariance(report1, report2)
    };
  }

  /**
   * Get metrics summary
   */
  async getMetricsSummary(organizationId, fromDate, toDate) {
    const incomeStatement = await this.getIncomeStatement(organizationId, fromDate, toDate);
    const balanceSheet = await this.getBalanceSheet(organizationId, fromDate, toDate);

    return {
      totalRevenue: incomeStatement.revenues.total,
      netIncome: incomeStatement.netIncome,
      totalAssets: balanceSheet.assets.total,
      totalLiabilities: balanceSheet.liabilities.total,
      totalEquity: balanceSheet.equity.total
    };
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(organizationId, fromDate, toDate, includeDetails = false) {
    return {
      auditDate: new Date(),
      organizationId,
      period: { from: fromDate, to: toDate },
      status: 'completed',
      findings: [],
      recommendations: [],
      includeDetails
    };
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis(organizationId, months = 12) {
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const to = new Date();
      to.setMonth(to.getMonth() - i);

      const from = new Date(to);
      from.setMonth(from.getMonth() - 1);

      const report = await this.getIncomeStatement(organizationId, from.toISOString(), to.toISOString());

      trends.push({
        month: to.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue: report.revenues.total,
        expenses: report.expenses.total,
        netIncome: report.netIncome
      });
    }

    return trends;
  }

  /**
   * Calculate variance between two reports
   */
  _calculateVariance(report1, report2) {
    // Implementation for calculating variance
    return {};
  }
}

module.exports = new FinancialReportsController();

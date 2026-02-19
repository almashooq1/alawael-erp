/**
 * ===================================================================
 * ADVANCED FINANCIAL REPORTS SERVICE - خدمة التقارير المالية المتقدمة
 * ===================================================================
 * النسخة: 1.0.0
 * التاريخ: 30 يناير 2026
 * الوصف: خدمة شاملة لإنشاء التقارير المالية المتقدمة والتحليلات
 * ===================================================================
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class AdvancedFinancialReportsService {
  /**
   * ===================================================================
   * 1. تقرير الميزانية العمومية Balance Sheet
   * ===================================================================
   */
  static async generateBalanceSheet(asOfDate = new Date(), options = {}) {
    const Account = require('../models/Account');
    const JournalEntry = require('../models/JournalEntry');

    // الحصول على جميع الحسابات مع أرصدتها
    const accounts = await Account.find({ isActive: true }).sort('code');

    const balanceSheet = {
      asOfDate,
      company: options.companyName || 'شركة الأوائل',
      currency: options.currency || 'SAR',
      assets: {
        currentAssets: [],
        fixedAssets: [],
        totalCurrentAssets: 0,
        totalFixedAssets: 0,
        totalAssets: 0,
      },
      liabilities: {
        currentLiabilities: [],
        longTermLiabilities: [],
        totalCurrentLiabilities: 0,
        totalLongTermLiabilities: 0,
        totalLiabilities: 0,
      },
      equity: {
        capitalAccounts: [],
        retainedEarnings: 0,
        currentYearEarnings: 0,
        totalEquity: 0,
      },
    };

    // تصنيف الحسابات وحساب الأرصدة
    for (const account of accounts) {
      const balance = await this.getAccountBalance(account._id, asOfDate);

      if (balance === 0) continue;

      const accountData = {
        code: account.code,
        name: account.name,
        balance,
      };

      // الأصول
      if (account.type === 'asset') {
        if (account.category === 'current') {
          balanceSheet.assets.currentAssets.push(accountData);
          balanceSheet.assets.totalCurrentAssets += balance;
        } else {
          balanceSheet.assets.fixedAssets.push(accountData);
          balanceSheet.assets.totalFixedAssets += balance;
        }
      }
      // الالتزامات
      else if (account.type === 'liability') {
        if (account.category === 'current') {
          balanceSheet.liabilities.currentLiabilities.push(accountData);
          balanceSheet.liabilities.totalCurrentLiabilities += balance;
        } else {
          balanceSheet.liabilities.longTermLiabilities.push(accountData);
          balanceSheet.liabilities.totalLongTermLiabilities += balance;
        }
      }
      // حقوق الملكية
      else if (account.type === 'equity') {
        balanceSheet.equity.capitalAccounts.push(accountData);
      }
    }

    // حساب الإجماليات
    balanceSheet.assets.totalAssets =
      balanceSheet.assets.totalCurrentAssets + balanceSheet.assets.totalFixedAssets;

    balanceSheet.liabilities.totalLiabilities =
      balanceSheet.liabilities.totalCurrentLiabilities +
      balanceSheet.liabilities.totalLongTermLiabilities;

    // حساب صافي الدخل للفترة الحالية
    balanceSheet.equity.currentYearEarnings = await this.calculateNetIncome(
      new Date(asOfDate.getFullYear(), 0, 1),
      asOfDate
    );

    balanceSheet.equity.totalEquity =
      balanceSheet.equity.capitalAccounts.reduce((sum, acc) => sum + acc.balance, 0) +
      balanceSheet.equity.retainedEarnings +
      balanceSheet.equity.currentYearEarnings;

    // التحقق من توازن المعادلة المحاسبية
    const balanceCheck =
      Math.abs(
        balanceSheet.assets.totalAssets -
          (balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity)
      ) < 0.01;

    return {
      ...balanceSheet,
      balanceCheck,
      generatedAt: new Date(),
    };
  }

  /**
   * ===================================================================
   * 2. قائمة الدخل Income Statement
   * ===================================================================
   */
  static async generateIncomeStatement(startDate, endDate, options = {}) {
    const Account = require('../models/Account');

    const incomeStatement = {
      period: { startDate, endDate },
      company: options.companyName || 'شركة الأوائل',
      currency: options.currency || 'SAR',
      revenue: {
        operatingRevenue: [],
        otherRevenue: [],
        totalOperatingRevenue: 0,
        totalOtherRevenue: 0,
        totalRevenue: 0,
      },
      expenses: {
        costOfGoodsSold: [],
        operatingExpenses: [],
        otherExpenses: [],
        totalCOGS: 0,
        totalOperatingExpenses: 0,
        totalOtherExpenses: 0,
        totalExpenses: 0,
      },
      profitMetrics: {
        grossProfit: 0,
        operatingProfit: 0,
        netProfit: 0,
        grossProfitMargin: 0,
        operatingProfitMargin: 0,
        netProfitMargin: 0,
      },
    };

    // الحصول على حسابات الإيرادات
    const revenueAccounts = await Account.find({
      type: 'revenue',
      isActive: true,
    }).sort('code');

    for (const account of revenueAccounts) {
      const balance = await this.getAccountBalance(account._id, endDate, startDate);

      if (balance === 0) continue;

      const accountData = {
        code: account.code,
        name: account.name,
        amount: Math.abs(balance), // الإيرادات دائمًا موجبة
      };

      if (account.category === 'operating') {
        incomeStatement.revenue.operatingRevenue.push(accountData);
        incomeStatement.revenue.totalOperatingRevenue += accountData.amount;
      } else {
        incomeStatement.revenue.otherRevenue.push(accountData);
        incomeStatement.revenue.totalOtherRevenue += accountData.amount;
      }
    }

    incomeStatement.revenue.totalRevenue =
      incomeStatement.revenue.totalOperatingRevenue + incomeStatement.revenue.totalOtherRevenue;

    // الحصول على حسابات المصروفات
    const expenseAccounts = await Account.find({
      type: 'expense',
      isActive: true,
    }).sort('code');

    for (const account of expenseAccounts) {
      const balance = await this.getAccountBalance(account._id, endDate, startDate);

      if (balance === 0) continue;

      const accountData = {
        code: account.code,
        name: account.name,
        amount: Math.abs(balance), // المصروفات دائمًا موجبة
      };

      if (account.category === 'cogs') {
        incomeStatement.expenses.costOfGoodsSold.push(accountData);
        incomeStatement.expenses.totalCOGS += accountData.amount;
      } else if (account.category === 'operating') {
        incomeStatement.expenses.operatingExpenses.push(accountData);
        incomeStatement.expenses.totalOperatingExpenses += accountData.amount;
      } else {
        incomeStatement.expenses.otherExpenses.push(accountData);
        incomeStatement.expenses.totalOtherExpenses += accountData.amount;
      }
    }

    incomeStatement.expenses.totalExpenses =
      incomeStatement.expenses.totalCOGS +
      incomeStatement.expenses.totalOperatingExpenses +
      incomeStatement.expenses.totalOtherExpenses;

    // حساب مؤشرات الربحية
    incomeStatement.profitMetrics.grossProfit =
      incomeStatement.revenue.totalOperatingRevenue - incomeStatement.expenses.totalCOGS;

    incomeStatement.profitMetrics.operatingProfit =
      incomeStatement.profitMetrics.grossProfit - incomeStatement.expenses.totalOperatingExpenses;

    incomeStatement.profitMetrics.netProfit =
      incomeStatement.revenue.totalRevenue - incomeStatement.expenses.totalExpenses;

    // حساب نسب الربحية
    if (incomeStatement.revenue.totalRevenue > 0) {
      incomeStatement.profitMetrics.grossProfitMargin =
        (incomeStatement.profitMetrics.grossProfit / incomeStatement.revenue.totalRevenue) * 100;

      incomeStatement.profitMetrics.operatingProfitMargin =
        (incomeStatement.profitMetrics.operatingProfit / incomeStatement.revenue.totalRevenue) *
        100;

      incomeStatement.profitMetrics.netProfitMargin =
        (incomeStatement.profitMetrics.netProfit / incomeStatement.revenue.totalRevenue) * 100;
    }

    return {
      ...incomeStatement,
      generatedAt: new Date(),
    };
  }

  /**
   * ===================================================================
   * 3. قائمة التدفقات النقدية Cash Flow Statement
   * ===================================================================
   */
  static async generateCashFlowStatement(startDate, endDate, options = {}) {
    const JournalEntry = require('../models/JournalEntry');

    const cashFlowStatement = {
      period: { startDate, endDate },
      company: options.companyName || 'شركة الأوائل',
      currency: options.currency || 'SAR',
      operatingActivities: {
        cashFromOperations: [],
        cashToOperations: [],
        netOperatingCash: 0,
      },
      investingActivities: {
        cashFromInvesting: [],
        cashToInvesting: [],
        netInvestingCash: 0,
      },
      financingActivities: {
        cashFromFinancing: [],
        cashToFinancing: [],
        netFinancingCash: 0,
      },
      summary: {
        netCashFlow: 0,
        beginningCash: 0,
        endingCash: 0,
      },
    };

    // الحصول على القيود المحاسبية خلال الفترة
    const entries = await JournalEntry.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'posted',
    })
      .populate('lines.account')
      .sort('date');

    for (const entry of entries) {
      // تصنيف القيود حسب نوع النشاط
      const category = this.classifyCashFlowActivity(entry);

      for (const line of entry.lines) {
        if (!line.account) continue;

        // البحث عن المعاملات النقدية فقط
        if (this.isCashAccount(line.account)) {
          const amount = line.debit || line.credit;

          if (category === 'operating') {
            if (line.debit > 0) {
              cashFlowStatement.operatingActivities.cashFromOperations.push({
                description: entry.description,
                amount: line.debit,
                date: entry.date,
              });
            } else {
              cashFlowStatement.operatingActivities.cashToOperations.push({
                description: entry.description,
                amount: line.credit,
                date: entry.date,
              });
            }
          } else if (category === 'investing') {
            if (line.debit > 0) {
              cashFlowStatement.investingActivities.cashFromInvesting.push({
                description: entry.description,
                amount: line.debit,
                date: entry.date,
              });
            } else {
              cashFlowStatement.investingActivities.cashToInvesting.push({
                description: entry.description,
                amount: line.credit,
                date: entry.date,
              });
            }
          } else if (category === 'financing') {
            if (line.debit > 0) {
              cashFlowStatement.financingActivities.cashFromFinancing.push({
                description: entry.description,
                amount: line.debit,
                date: entry.date,
              });
            } else {
              cashFlowStatement.financingActivities.cashToFinancing.push({
                description: entry.description,
                amount: line.credit,
                date: entry.date,
              });
            }
          }
        }
      }
    }

    // حساب الصافي
    cashFlowStatement.operatingActivities.netOperatingCash =
      cashFlowStatement.operatingActivities.cashFromOperations.reduce(
        (sum, t) => sum + t.amount,
        0
      ) -
      cashFlowStatement.operatingActivities.cashToOperations.reduce((sum, t) => sum + t.amount, 0);

    cashFlowStatement.investingActivities.netInvestingCash =
      cashFlowStatement.investingActivities.cashFromInvesting.reduce(
        (sum, t) => sum + t.amount,
        0
      ) -
      cashFlowStatement.investingActivities.cashToInvesting.reduce((sum, t) => sum + t.amount, 0);

    cashFlowStatement.financingActivities.netFinancingCash =
      cashFlowStatement.financingActivities.cashFromFinancing.reduce(
        (sum, t) => sum + t.amount,
        0
      ) -
      cashFlowStatement.financingActivities.cashToFinancing.reduce((sum, t) => sum + t.amount, 0);

    // الملخص
    cashFlowStatement.summary.netCashFlow =
      cashFlowStatement.operatingActivities.netOperatingCash +
      cashFlowStatement.investingActivities.netInvestingCash +
      cashFlowStatement.financingActivities.netFinancingCash;

    // رصيد النقدية في بداية ونهاية الفترة
    cashFlowStatement.summary.beginningCash = await this.getTotalCashBalance(startDate);
    cashFlowStatement.summary.endingCash = await this.getTotalCashBalance(endDate);

    return {
      ...cashFlowStatement,
      generatedAt: new Date(),
    };
  }

  /**
   * ===================================================================
   * 4. تقرير الربحية حسب مراكز التكلفة
   * ===================================================================
   */
  static async generateProfitabilityByCoastCenter(startDate, endDate) {
    const CostCenter = require('../models/CostCenter');

    const costCenters = await CostCenter.find({ isActive: true })
      .populate('manager department')
      .sort('code');

    const report = {
      period: { startDate, endDate },
      centers: [],
      summary: {
        totalRevenue: 0,
        totalCosts: 0,
        totalProfit: 0,
        avgProfitMargin: 0,
      },
    };

    for (const center of costCenters) {
      const revenue =
        center.type === 'profit' || center.type === 'revenue' ? center.revenue.actualRevenue : 0;

      const costs = center.totalCosts;
      const profit = revenue - costs;
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;

      report.centers.push({
        code: center.code,
        name: center.name,
        type: center.type,
        manager: center.manager?.name,
        department: center.department?.name,
        revenue,
        costs,
        profit,
        profitMargin,
        budgetUtilization: center.budgetUtilization,
      });

      report.summary.totalRevenue += revenue;
      report.summary.totalCosts += costs;
      report.summary.totalProfit += profit;
    }

    report.summary.avgProfitMargin =
      report.summary.totalRevenue > 0
        ? ((report.summary.totalProfit / report.summary.totalRevenue) * 100).toFixed(2)
        : 0;

    // ترتيب حسب الربحية
    report.centers.sort((a, b) => b.profitMargin - a.profitMargin);

    return report;
  }

  /**
   * ===================================================================
   * 5. تقرير أعمار الذمم (المدينون)
   * ===================================================================
   */
  static async generateAgedReceivablesReport(asOfDate = new Date()) {
    const AccountingInvoice = require('../models/AccountingInvoice');

    const invoices = await AccountingInvoice.find({
      type: 'sales',
      status: { $in: ['sent', 'viewed', 'partially-paid', 'overdue'] },
      dueDate: { $lte: asOfDate },
    })
      .populate('customer')
      .sort('dueDate');

    const report = {
      asOfDate,
      aging: {
        current: [], // 0-30 days
        days31to60: [],
        days61to90: [],
        over90: [],
      },
      summary: {
        current: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        total: 0,
      },
      byCustomer: new Map(),
    };

    for (const invoice of invoices) {
      const daysOverdue = Math.floor((asOfDate - invoice.dueDate) / (1000 * 60 * 60 * 24));
      const amountDue = invoice.totalAmount - invoice.paidAmount;

      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer?.name,
        dueDate: invoice.dueDate,
        amountDue,
        daysOverdue,
      };

      // تصنيف حسب العمر
      if (daysOverdue <= 30) {
        report.aging.current.push(invoiceData);
        report.summary.current += amountDue;
      } else if (daysOverdue <= 60) {
        report.aging.days31to60.push(invoiceData);
        report.summary.days31to60 += amountDue;
      } else if (daysOverdue <= 90) {
        report.aging.days61to90.push(invoiceData);
        report.summary.days61to90 += amountDue;
      } else {
        report.aging.over90.push(invoiceData);
        report.summary.over90 += amountDue;
      }

      report.summary.total += amountDue;

      // تجميع حسب العميل
      const customerId = invoice.customer?._id?.toString();
      if (customerId) {
        if (!report.byCustomer.has(customerId)) {
          report.byCustomer.set(customerId, {
            name: invoice.customer.name,
            totalDue: 0,
            invoices: [],
          });
        }

        const customerData = report.byCustomer.get(customerId);
        customerData.totalDue += amountDue;
        customerData.invoices.push(invoiceData);
      }
    }

    return report;
  }

  /**
   * ===================================================================
   * 6. تصدير التقارير إلى PDF
   * ===================================================================
   */
  static async exportToPDF(reportData, reportType, outputPath) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    // العنوان
    doc.fontSize(20).text(this.getReportTitle(reportType), { align: 'center' }).moveDown();

    doc
      .fontSize(12)
      .text(`التاريخ: ${new Date().toLocaleDateString('ar-SA')}`, { align: 'center' })
      .moveDown(2);

    // محتوى التقرير حسب النوع
    switch (reportType) {
      case 'balance-sheet':
        this.renderBalanceSheetPDF(doc, reportData);
        break;
      case 'income-statement':
        this.renderIncomeStatementPDF(doc, reportData);
        break;
      case 'cash-flow':
        this.renderCashFlowPDF(doc, reportData);
        break;
      default:
        doc.text(JSON.stringify(reportData, null, 2));
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }

  /**
   * ===================================================================
   * 7. تصدير التقارير إلى Excel
   * ===================================================================
   */
  static async exportToExcel(reportData, reportType, outputPath) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(this.getReportTitle(reportType));

    // تنسيق العنوان
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = this.getReportTitle(reportType);
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // محتوى التقرير حسب النوع
    switch (reportType) {
      case 'balance-sheet':
        this.renderBalanceSheetExcel(worksheet, reportData);
        break;
      case 'income-statement':
        this.renderIncomeStatementExcel(worksheet, reportData);
        break;
      default:
        // تقرير عام
        worksheet.addRow([]);
        worksheet.addRow(['البيانات']);
        worksheet.addRow([JSON.stringify(reportData)]);
    }

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  }

  /**
   * ===================================================================
   * HELPER METHODS
   * ===================================================================
   */

  static async getAccountBalance(accountId, endDate, startDate = null) {
    const JournalEntry = require('../models/JournalEntry');

    const query = {
      status: 'posted',
      date: { $lte: endDate },
    };

    if (startDate) {
      query.date.$gte = startDate;
    }

    const entries = await JournalEntry.find(query).populate('lines.account');

    let balance = 0;

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.account?._id?.toString() === accountId.toString()) {
          balance += line.debit - line.credit;
        }
      }
    }

    return balance;
  }

  static async calculateNetIncome(startDate, endDate) {
    const incomeStatement = await this.generateIncomeStatement(startDate, endDate);
    return incomeStatement.profitMetrics.netProfit;
  }

  static classifyCashFlowActivity(journalEntry) {
    const description = journalEntry.description?.toLowerCase() || '';
    const type = journalEntry.type?.toLowerCase() || '';

    // أنشطة التمويل
    if (
      type.includes('loan') ||
      type.includes('capital') ||
      description.includes('قرض') ||
      description.includes('رأس المال')
    ) {
      return 'financing';
    }

    // أنشطة الاستثمار
    if (
      type.includes('asset') ||
      type.includes('investment') ||
      description.includes('أصل') ||
      description.includes('استثمار')
    ) {
      return 'investing';
    }

    // أنشطة التشغيل (افتراضي)
    return 'operating';
  }

  static isCashAccount(account) {
    const code = account.code?.toLowerCase() || '';
    const name = account.name?.toLowerCase() || '';

    return (
      code.includes('cash') || code.includes('bank') || name.includes('نقد') || name.includes('بنك')
    );
  }

  static async getTotalCashBalance(date) {
    const Account = require('../models/Account');

    const cashAccounts = await Account.find({
      $or: [{ code: /cash|bank/i }, { name: /نقد|بنك/i }],
      isActive: true,
    });

    let total = 0;
    for (const account of cashAccounts) {
      total += await this.getAccountBalance(account._id, date);
    }

    return total;
  }

  static getReportTitle(reportType) {
    const titles = {
      'balance-sheet': 'الميزانية العمومية',
      'income-statement': 'قائمة الدخل',
      'cash-flow': 'قائمة التدفقات النقدية',
      'aged-receivables': 'تقرير أعمار الذمم المدينة',
      profitability: 'تقرير الربحية حسب مراكز التكلفة',
    };

    return titles[reportType] || 'التقرير المالي';
  }

  static renderBalanceSheetPDF(doc, data) {
    // عرض الأصول
    doc.fontSize(14).text('الأصول', { underline: true }).moveDown();
    // ... implementation
  }

  static renderIncomeStatementPDF(doc, data) {
    // عرض قائمة الدخل
    doc.fontSize(14).text('الإيرادات', { underline: true }).moveDown();
    // ... implementation
  }

  static renderCashFlowPDF(doc, data) {
    // عرض التدفقات النقدية
    doc.fontSize(14).text('الأنشطة التشغيلية', { underline: true }).moveDown();
    // ... implementation
  }

  static renderBalanceSheetExcel(worksheet, data) {
    let row = 3;

    // الأصول
    worksheet.getCell(`A${row}`).value = 'الأصول';
    worksheet.getCell(`A${row}`).font = { bold: true };
    row++;

    // ... implementation
  }

  static renderIncomeStatementExcel(worksheet, data) {
    let row = 3;

    // الإيرادات
    worksheet.getCell(`A${row}`).value = 'الإيرادات';
    worksheet.getCell(`A${row}`).font = { bold: true };
    row++;

    // ... implementation
  }
}

module.exports = AdvancedFinancialReportsService;

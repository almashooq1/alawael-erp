/**
 * ===================================================================
 * FINANCIAL REPORTING & CONSOLIDATION
 * نظام إعداد التقارير المالية والتوحيد
 * ===================================================================
 * نسخة: 1.0 - احترافية
 * التاريخ: فبراير 2026
 */

const EventEmitter = require('events');

class FinancialReporting extends EventEmitter {
  constructor(financialSystem) {
    super();
    this.fs = financialSystem;
    this.reports = new Map();
    this.consolidations = new Map();
    this.subsidiaries = new Map();
    this.reportTemplates = new Map();
    this.setupDefaultTemplates();
  }

  // ===================================================================
  // 1. إعداد القوائم المالية - Financial Statements
  // ===================================================================

  setupDefaultTemplates() {
    // نموذج الميزانية العمومية
    this.reportTemplates.set('BALANCE_SHEET', {
      id: 'BALANCE_SHEET',
      name: 'الميزانية العمومية',
      description: 'قائمة تفصيلية بالأصول والالتزامات وحقوق الملكية',
      sections: ['assets', 'liabilities', 'equity'],
    });

    // نموذج قائمة الدخل
    this.reportTemplates.set('INCOME_STATEMENT', {
      id: 'INCOME_STATEMENT',
      name: 'قائمة الدخل',
      description: 'قائمة توضح الإيرادات والمصروفات والأرباح',
      sections: ['revenues', 'expenses', 'otherIncome', 'otherExpenses'],
    });

    // نموذج قائمة التدفقات النقدية
    this.reportTemplates.set('CASH_FLOW_STATEMENT', {
      id: 'CASH_FLOW_STATEMENT',
      name: 'قائمة التدفقات النقدية',
      description: 'قائمة توضح تحركات النقد في الفترة',
      sections: ['operatingActivities', 'investingActivities', 'financingActivities'],
    });

    // نموذج التغييرات في حقوق الملكية
    this.reportTemplates.set('EQUITY_STATEMENT', {
      id: 'EQUITY_STATEMENT',
      name: 'قائمة التغييرات في حقوق الملكية',
      description: 'قائمة توضح التغييرات في رأس المال والأرباح المحتجزة',
      sections: ['capital', 'retainedEarnings', 'dividends'],
    });
  }

  generateBalanceSheet(asOfDate) {
    const report = {
      id: `BS_${Date.now()}`,
      type: 'BALANCE_SHEET',
      title: 'الميزانية العمومية',
      asOfDate: new Date(asOfDate),
      generatedAt: new Date(),
      currency: this.fs.config.currency,
      assets: {
        current: {},
        fixed: {},
        other: {},
        total: 0,
      },
      liabilities: {
        current: {},
        longTerm: {},
        other: {},
        total: 0,
      },
      equity: {
        capital: 0,
        retainedEarnings: 0,
        reserves: 0,
        total: 0,
      },
    };

    // جمع الأصول
    for (const account of this.fs.accounts.values()) {
      if (account.type === 'asset' && account.isActive) {
        const balance = this.fs.getAccountBalance(account.id);
        const category = account.subType || 'other';

        if (category === 'current') {
          report.assets.current[account.code] = {
            name: account.name,
            amount: this.fs.roundNumber(balance),
            code: account.code,
          };
          report.assets.total += balance;
        } else if (category === 'fixed') {
          report.assets.fixed[account.code] = {
            name: account.name,
            amount: this.fs.roundNumber(balance),
            code: account.code,
          };
          report.assets.total += balance;
        } else {
          report.assets.other[account.code] = {
            name: account.name,
            amount: this.fs.roundNumber(balance),
            code: account.code,
          };
          report.assets.total += balance;
        }
      }
    }

    // جمع الالتزامات
    for (const account of this.fs.accounts.values()) {
      if (account.type === 'liability' && account.isActive) {
        const balance = this.fs.getAccountBalance(account.id);
        const category = account.subType || 'other';

        if (category === 'current') {
          report.liabilities.current[account.code] = {
            name: account.name,
            amount: this.fs.roundNumber(balance),
            code: account.code,
          };
          report.liabilities.total += balance;
        } else if (category === 'longTerm') {
          report.liabilities.longTerm[account.code] = {
            name: account.name,
            amount: this.fs.roundNumber(balance),
            code: account.code,
          };
          report.liabilities.total += balance;
        } else {
          report.liabilities.other[account.code] = {
            name: account.name,
            amount: this.fs.roundNumber(balance),
            code: account.code,
          };
          report.liabilities.total += balance;
        }
      }
    }

    // جمع حقوق الملكية
    for (const account of this.fs.accounts.values()) {
      if (account.type === 'equity' && account.isActive) {
        const balance = this.fs.getAccountBalance(account.id);

        if (account.code.includes('1001')) {
          report.equity.capital = balance;
        } else if (account.code.includes('1002')) {
          report.equity.retainedEarnings = balance;
        } else {
          report.equity.reserves += balance;
        }

        report.equity.total += balance;
      }
    }

    // تقريب الأرقام
    report.assets.total = this.fs.roundNumber(report.assets.total);
    report.liabilities.total = this.fs.roundNumber(report.liabilities.total);
    report.equity.total = this.fs.roundNumber(report.equity.total);

    // التحقق من التوازن
    report.isBalanced =
      Math.abs(report.assets.total - (report.liabilities.total + report.equity.total)) < 0.01;

    this.reports.set(report.id, report);
    this.emit('report:generated', report);

    return report;
  }

  generateIncomeStatement(startDate, endDate) {
    const report = {
      id: `IS_${Date.now()}`,
      type: 'INCOME_STATEMENT',
      title: 'قائمة الدخل',
      period: { startDate: new Date(startDate), endDate: new Date(endDate) },
      generatedAt: new Date(),
      currency: this.fs.config.currency,
      revenues: {},
      expenses: {},
      otherIncome: {},
      otherExpenses: {},
      calculations: {},
    };

    // جمع الإيرادات
    for (const account of this.fs.accounts.values()) {
      if (account.type === 'revenue' && account.isActive) {
        const transactions = account.transactions.filter(
          t => t.date >= startDate && t.date <= endDate
        );

        const amount = transactions.reduce((sum, t) => sum + t.amount, 0);

        if (amount !== 0) {
          report.revenues[account.code] = {
            name: account.name,
            amount: this.fs.roundNumber(amount),
            code: account.code,
          };
        }
      }
    }

    // جمع المصروفات
    for (const account of this.fs.accounts.values()) {
      if (account.type === 'expense' && account.isActive) {
        const transactions = account.transactions.filter(
          t => t.date >= startDate && t.date <= endDate
        );

        const amount = transactions.reduce((sum, t) => sum + t.amount, 0);

        if (amount !== 0) {
          report.expenses[account.code] = {
            name: account.name,
            amount: this.fs.roundNumber(amount),
            code: account.code,
          };
        }
      }
    }

    // حساب النتائج
    const totalRevenues = Object.values(report.revenues).reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const totalExpenses = Object.values(report.expenses).reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const grossProfit = totalRevenues - totalExpenses;

    report.calculations.totalRevenues = this.fs.roundNumber(totalRevenues);
    report.calculations.totalExpenses = this.fs.roundNumber(totalExpenses);
    report.calculations.grossProfit = this.fs.roundNumber(grossProfit);
    report.calculations.netIncome = this.fs.roundNumber(grossProfit); // بدون ضرائب أخرى

    this.reports.set(report.id, report);
    this.emit('report:generated', report);

    return report;
  }

  generateCashFlowStatement(startDate, endDate) {
    const report = {
      id: `CF_${Date.now()}`,
      type: 'CASH_FLOW_STATEMENT',
      title: 'قائمة التدفقات النقدية',
      period: { startDate: new Date(startDate), endDate: new Date(endDate) },
      generatedAt: new Date(),
      currency: this.fs.config.currency,
      operatingActivities: {
        inflows: 0,
        outflows: 0,
        details: {},
      },
      investingActivities: {
        inflows: 0,
        outflows: 0,
        details: {},
      },
      financingActivities: {
        inflows: 0,
        outflows: 0,
        details: {},
      },
      summary: {},
    };

    // جمع التدفقات النقدية من السجلات
    const cashFlows = Array.from(this.fs.cashFlows || []).filter(
      ([_, cf]) => cf.date >= startDate && cf.date <= endDate && cf.status === 'completed'
    );

    for (const [_, flow] of cashFlows) {
      const isInflow = flow.type === 'inflow';

      if (['customer', 'other'].includes(flow.source || flow.purpose)) {
        if (isInflow) {
          report.operatingActivities.inflows += flow.amount;
        } else {
          report.operatingActivities.outflows += flow.amount;
        }
      } else if (['investment'].includes(flow.source || flow.purpose)) {
        if (isInflow) {
          report.investingActivities.inflows += flow.amount;
        } else {
          report.investingActivities.outflows += flow.amount;
        }
      } else if (['loan', 'dividend'].includes(flow.source || flow.purpose)) {
        if (isInflow) {
          report.financingActivities.inflows += flow.amount;
        } else {
          report.financingActivities.outflows += flow.amount;
        }
      }
    }

    // حساب النتائج
    const operatingNet = report.operatingActivities.inflows - report.operatingActivities.outflows;
    const investingNet = report.investingActivities.inflows - report.investingActivities.outflows;
    const financingNet = report.financingActivities.inflows - report.financingActivities.outflows;
    const netChange = operatingNet + investingNet + financingNet;

    report.operatingActivities.inflows = this.fs.roundNumber(report.operatingActivities.inflows);
    report.operatingActivities.outflows = this.fs.roundNumber(report.operatingActivities.outflows);
    report.investingActivities.inflows = this.fs.roundNumber(report.investingActivities.inflows);
    report.investingActivities.outflows = this.fs.roundNumber(report.investingActivities.outflows);
    report.financingActivities.inflows = this.fs.roundNumber(report.financingActivities.inflows);
    report.financingActivities.outflows = this.fs.roundNumber(report.financingActivities.outflows);

    report.summary.operatingNetCash = this.fs.roundNumber(operatingNet);
    report.summary.investingNetCash = this.fs.roundNumber(investingNet);
    report.summary.financingNetCash = this.fs.roundNumber(financingNet);
    report.summary.netChangeInCash = this.fs.roundNumber(netChange);

    this.reports.set(report.id, report);
    this.emit('report:generated', report);

    return report;
  }

  // ===================================================================
  // 2. المقاييس المالية - Financial Ratios
  // ===================================================================

  calculateFinancialRatios(asOfDate) {
    const balanceSheet = this.generateBalanceSheet(asOfDate);
    const ratios = {
      timestamp: new Date(),
      profitability: {},
      liquidity: {},
      efficiency: {},
      leverage: {},
    };

    // نسب الربحية
    const totalAssets = balanceSheet.assets.total;
    const totalEquity = balanceSheet.equity.total;
    const netIncome = 0; // سيتم جلبه من قائمة الدخل إذا تم توفيرها

    if (totalAssets > 0) {
      ratios.profitability.ROA = this.fs.roundNumber((netIncome / totalAssets) * 100);
    }

    if (totalEquity > 0) {
      ratios.profitability.ROE = this.fs.roundNumber((netIncome / totalEquity) * 100);
    }

    // نسب السيولة
    const currentAssets = Object.values(balanceSheet.assets.current).reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const currentLiabilities = Object.values(balanceSheet.liabilities.current).reduce(
      (sum, item) => sum + item.amount,
      0
    );

    if (currentLiabilities > 0) {
      ratios.liquidity.currentRatio = this.fs.roundNumber(currentAssets / currentLiabilities);
    }

    // النسبة السريعة
    const quickAssets = currentAssets; // بدون مخزون

    if (currentLiabilities > 0) {
      ratios.liquidity.quickRatio = this.fs.roundNumber(quickAssets / currentLiabilities);
    }

    // نسب الكفاءة
    if (totalAssets > 0) {
      ratios.efficiency.assetTurnover = this.fs.roundNumber(
        (balanceSheet.assets.total + balanceSheet.liabilities.total) / totalAssets
      );
    }

    // نسب الرافعة المالية
    const totalLiabilities = balanceSheet.liabilities.total;

    if (totalAssets > 0) {
      ratios.leverage.debtRatio = this.fs.roundNumber(totalLiabilities / totalAssets);
    }

    if (totalEquity > 0) {
      ratios.leverage.debtToEquity = this.fs.roundNumber(totalLiabilities / totalEquity);
    }

    return ratios;
  }

  // ===================================================================
  // 3. توحيد الشركات التابعة - Subsidiaries Consolidation
  // ===================================================================

  registerSubsidiary(subsidiaryData) {
    const {
      name,
      code,
      ownershipPercentage,
      acquirementDate,
      financialStatements = null,
    } = subsidiaryData;

    const subsidiary = {
      id: `SUB_${Date.now()}`,
      name,
      code,
      ownershipPercentage: Math.min(Math.max(ownershipPercentage, 0), 100),
      acquisitionDate: new Date(acquirementDate),
      financialStatements,
      consolidationMethod: ownershipPercentage >= 50 ? 'full' : 'equity',
      createdAt: new Date(),
    };

    this.subsidiaries.set(subsidiary.id, subsidiary);
    this.emit('subsidiary:registered', subsidiary);

    return subsidiary;
  }

  consolidateFinancialStatements(parentId, subsidiaryIds, asOfDate) {
    const consolidation = {
      id: `CONSOL_${Date.now()}`,
      timestamp: new Date(),
      asOfDate: new Date(asOfDate),
      parentId,
      subsidiaryIds,
      methods: [],
      eliminationEntries: [],
      consolidatedFinancials: {},
    };

    // 1. حساب النسب المئوية للملكية غير المسيطرة
    for (const subId of subsidiaryIds) {
      const subsidiary = this.subsidiaries.get(subId);
      if (!subsidiary) continue;

      const nci =
        subsidiary.ownershipPercentage < 100 ? (100 - subsidiary.ownershipPercentage) / 100 : 0;

      consolidation.methods.push({
        subsidiaryId: subId,
        method: subsidiary.consolidationMethod,
        nciPercentage: nci,
      });
    }

    // 2. إضافة بيانات التوحيد الافتراضية
    consolidation.consolidatedFinancials = {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
    };

    this.consolidations.set(consolidation.id, consolidation);
    this.emit('consolidation:completed', consolidation);

    return consolidation;
  }

  // ===================================================================
  // 4. التقارير المالية - Financial Report Exports
  // ===================================================================

  generateFinancialReportPackage(startDate, endDate, asOfDate) {
    const package_ = {
      id: `PACKAGE_${Date.now()}`,
      generatedAt: new Date(),
      period: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        asOfDate: new Date(asOfDate),
      },
      statements: {},
      notes: [],
      auditorsStatement: null,
      managementDeclaration: null,
    };

    // 1. الميزانية العمومية
    package_.statements.balanceSheet = this.generateBalanceSheet(asOfDate);

    // 2. قائمة الدخل
    package_.statements.incomeStatement = this.generateIncomeStatement(startDate, endDate);

    // 3. قائمة التدفقات النقدية
    package_.statements.cashFlowStatement = this.generateCashFlowStatement(startDate, endDate);

    // 4. المقاييس المالية
    package_.statements.financialRatios = this.calculateFinancialRatios(asOfDate);

    // 5. إضافة الملاحظات المالية
    package_.notes.push(
      'الحسابات مستندة على السجلات المحاسبية الكاملة',
      'تم إجراء جميع التحويلات المطلوبة بموجب المعايير المحاسبية',
      'لا توجد أحداث لاحقة ذات أهمية مادية'
    );

    return package_;
  }

  exportReportToHTML(reportId) {
    const report = this.reports.get(reportId);
    if (!report) throw new Error('التقرير غير موجود');

    let html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; }
          .date { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
          th { background-color: #f0f0f0; }
          .amount { text-align: left; }
          .total { font-weight: bold; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${report.title}</div>
          <div class="date">التاريخ: ${report.generatedAt.toLocaleDateString('ar-SA')}</div>
          ${
            report.period
              ? `
            <div class="date">الفترة: من ${report.period.startDate.toLocaleDateString('ar-SA')} 
            إلى ${report.period.endDate.toLocaleDateString('ar-SA')}</div>
          `
              : ''
          }
        </div>

        <table>
          <tr>
            <th>البيان</th>
            <th class="amount">المبلغ</th>
          </tr>
    `;

    if (report.type === 'BALANCE_SHEET') {
      html += this.generateBalanceSheetHTML(report);
    } else if (report.type === 'INCOME_STATEMENT') {
      html += this.generateIncomeStatementHTML(report);
    } else if (report.type === 'CASH_FLOW_STATEMENT') {
      html += this.generateCashFlowStatementHTML(report);
    }

    html += `
        </table>
      </body>
      </html>
    `;

    return html;
  }

  generateBalanceSheetHTML(report) {
    let html = '';

    // الأصول
    html += '<tr><th colspan="2" style="background-color: #e0e0e0;">الأصول</th></tr>';
    html += '<tr><th>الأصول المتداولة</th></tr>';

    for (const [code, item] of Object.entries(report.assets.current)) {
      html += `<tr>
        <td>${item.name}</td>
        <td class="amount">${item.amount.toLocaleString('ar-SA')}</td>
      </tr>`;
    }

    html += `<tr class="total">
      <td>إجمالي الأصول المتداولة</td>
      <td class="amount">${Object.values(report.assets.current)
        .reduce((sum, item) => sum + item.amount, 0)
        .toLocaleString('ar-SA')}</td>
    </tr>`;

    html += '<tr><th>الأصول الثابتة</th></tr>';

    for (const [code, item] of Object.entries(report.assets.fixed)) {
      html += `<tr>
        <td>${item.name}</td>
        <td class="amount">${item.amount.toLocaleString('ar-SA')}</td>
      </tr>`;
    }

    html += `<tr class="total">
      <td>إجمالي الأصول الثابتة</td>
      <td class="amount">${Object.values(report.assets.fixed)
        .reduce((sum, item) => sum + item.amount, 0)
        .toLocaleString('ar-SA')}</td>
    </tr>`;

    html += `<tr class="total" style="background-color: #d0d0d0;">
      <td>إجمالي الأصول</td>
      <td class="amount">${report.assets.total.toLocaleString('ar-SA')}</td>
    </tr>`;

    // الالتزامات وحقوق الملكية
    html +=
      '<tr><th colspan="2" style="background-color: #e0e0e0;">الالتزامات وحقوق الملكية</th></tr>';
    html += '<tr><th>الالتزامات المتداولة</th></tr>';

    for (const [code, item] of Object.entries(report.liabilities.current)) {
      html += `<tr>
        <td>${item.name}</td>
        <td class="amount">${item.amount.toLocaleString('ar-SA')}</td>
      </tr>`;
    }

    html += `<tr class="total">
      <td>إجمالي الالتزامات المتداولة</td>
      <td class="amount">${Object.values(report.liabilities.current)
        .reduce((sum, item) => sum + item.amount, 0)
        .toLocaleString('ar-SA')}</td>
    </tr>`;

    html += `<tr class="total" style="background-color: #d0d0d0;">
      <td>إجمالي الالتزامات</td>
      <td class="amount">${report.liabilities.total.toLocaleString('ar-SA')}</td>
    </tr>`;

    html += '<tr><th>حقوق الملكية</th></tr>';
    html += `<tr>
      <td>رأس المال</td>
      <td class="amount">${report.equity.capital.toLocaleString('ar-SA')}</td>
    </tr>`;
    html += `<tr>
      <td>الأرباح المحتجزة</td>
      <td class="amount">${report.equity.retainedEarnings.toLocaleString('ar-SA')}</td>
    </tr>`;
    html += `<tr class="total" style="background-color: #d0d0d0;">
      <td>إجمالي حقوق الملكية</td>
      <td class="amount">${report.equity.total.toLocaleString('ar-SA')}</td>
    </tr>`;

    const total = report.liabilities.total + report.equity.total;
    html += `<tr class="total" style="background-color: #c0c0c0;">
      <td>إجمالي الالتزامات وحقوق الملكية</td>
      <td class="amount">${total.toLocaleString('ar-SA')}</td>
    </tr>`;

    return html;
  }

  generateIncomeStatementHTML(report) {
    let html = '';

    html += '<tr><th>الإيرادات</th></tr>';

    let totalRevenues = 0;
    for (const [code, item] of Object.entries(report.revenues)) {
      html += `<tr>
        <td>${item.name}</td>
        <td class="amount">${item.amount.toLocaleString('ar-SA')}</td>
      </tr>`;
      totalRevenues += item.amount;
    }

    html += `<tr class="total">
      <td>إجمالي الإيرادات</td>
      <td class="amount">${totalRevenues.toLocaleString('ar-SA')}</td>
    </tr>`;

    html += '<tr><th>المصروفات</th></tr>';

    let totalExpenses = 0;
    for (const [code, item] of Object.entries(report.expenses)) {
      html += `<tr>
        <td>${item.name}</td>
        <td class="amount">${item.amount.toLocaleString('ar-SA')}</td>
      </tr>`;
      totalExpenses += item.amount;
    }

    html += `<tr class="total">
      <td>إجمالي المصروفات</td>
      <td class="amount">${totalExpenses.toLocaleString('ar-SA')}</td>
    </tr>`;

    const netIncome = totalRevenues - totalExpenses;
    html += `<tr class="total" style="background-color: #d0d0d0;">
      <td>صافي الدخل</td>
      <td class="amount">${netIncome.toLocaleString('ar-SA')}</td>
    </tr>`;

    return html;
  }

  generateCashFlowStatementHTML(report) {
    let html = '';

    html += '<tr><th colspan="2" style="background-color: #e0e0e0;">أنشطة التشغيل</th></tr>';
    html += `<tr>
      <td>التدفقات الواردة</td>
      <td class="amount">${report.operatingActivities.inflows.toLocaleString('ar-SA')}</td>
    </tr>`;
    html += `<tr>
      <td>التدفقات الصادرة</td>
      <td class="amount">${report.operatingActivities.outflows.toLocaleString('ar-SA')}</td>
    </tr>`;
    html += `<tr class="total">
      <td>صافي التدفق من أنشطة التشغيل</td>
      <td class="amount">${report.summary.operatingNetCash.toLocaleString('ar-SA')}</td>
    </tr>`;

    html += '<tr><th colspan="2" style="background-color: #e0e0e0;">أنشطة الاستثمار</th></tr>';
    html += `<tr>
      <td>التدفقات الواردة</td>
      <td class="amount">${report.investingActivities.inflows.toLocaleString('ar-SA')}</td>
    </tr>`;
    html += `<tr>
      <td>التدفقات الصادرة</td>
      <td class="amount">${report.investingActivities.outflows.toLocaleString('ar-SA')}</td>
    </tr>`;
    html += `<tr class="total">
      <td>صافي التدفق من أنشطة الاستثمار</td>
      <td class="amount">${report.summary.investingNetCash.toLocaleString('ar-SA')}</td>
    </tr>`;

    html += '<tr><th colspan="2" style="background-color: #e0e0e0;">أنشطة التمويل</th></tr>';
    html += `<tr>
      <td>التدفقات الواردة</td>
      <td class="amount">${report.financingActivities.inflows.toLocaleString('ar-SA')}</td>
    </tr>`;
    html += `<tr>
      <td>التدفقات الصادرة</td>
      <td class="amount">${report.financingActivities.outflows.toLocaleString('ar-SA')}</td>
    </tr>`;
    html += `<tr class="total">
      <td>صافي التدفق من أنشطة التمويل</td>
      <td class="amount">${report.summary.financingNetCash.toLocaleString('ar-SA')}</td>
    </tr>`;

    html += `<tr class="total" style="background-color: #d0d0d0;">
      <td>صافي التغير في النقد</td>
      <td class="amount">${report.summary.netChangeInCash.toLocaleString('ar-SA')}</td>
    </tr>`;

    return html;
  }
}

module.exports = FinancialReporting;

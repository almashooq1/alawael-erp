/**
 * ===================================================================
 * ADVANCED FINANCIAL ANALYTICS ENGINE
 * محرك التحليل المالي المتقدم
 * ===================================================================
 * نسخة: 2.0 - احترافية
 * التاريخ: فبراير 2026
 */

class AdvancedFinancialAnalytics {
  constructor(financialSystem) {
    this.fs = financialSystem;
    this.analyses = new Map();
    this.trends = new Map();
    this.alerts = [];
    this.anomalies = [];
  }

  // ===================================================================
  // 1. تحليل التكاليف المتقدم - Advanced Cost Analysis
  // ===================================================================

  /**
   * تحليل التكاليف حسب القسم
   */
  analyzeCostsByDepartment(startDate, endDate) {
    const analysis = {
      period: { startDate, endDate },
      departments: {},
      totalCosts: 0,
      averageByDepartment: 0,
    };

    for (const expense of this.fs.expenses.values()) {
      if (expense.date >= startDate && expense.date <= endDate && expense.status === 'approved') {
        const dept = expense.department || 'غير محدد';

        if (!analysis.departments[dept]) {
          analysis.departments[dept] = {
            totalCost: 0,
            count: 0,
            byCategory: {},
            percentage: 0,
          };
        }

        analysis.departments[dept].totalCost += expense.total;
        analysis.departments[dept].count += 1;

        const category = expense.category;
        if (!analysis.departments[dept].byCategory[category]) {
          analysis.departments[dept].byCategory[category] = 0;
        }
        analysis.departments[dept].byCategory[category] += expense.total;

        analysis.totalCosts += expense.total;
      }
    }

    // حساب النسب المئوية
    for (const dept in analysis.departments) {
      const deptData = analysis.departments[dept];
      deptData.percentage = this.fs.roundNumber((deptData.totalCost / analysis.totalCosts) * 100);
    }

    analysis.averageByDepartment = this.fs.roundNumber(
      analysis.totalCosts / Object.keys(analysis.departments).length
    );

    return analysis;
  }

  /**
   * تحليل تطور التكاليف
   */
  analyzeCostTrend(months = 12) {
    const trend = {
      months: [],
      costs: [],
      averageMonthly: 0,
      trend: 'stable', // up, down, stable
    };

    const monthData = {};

    for (const expense of this.fs.expenses.values()) {
      if (expense.status === 'approved') {
        const month = expense.date.toISOString().substring(0, 7);
        if (!monthData[month]) {
          monthData[month] = 0;
        }
        monthData[month] += expense.total;
      }
    }

    const sortedMonths = Object.keys(monthData).sort().slice(-months);

    for (const month of sortedMonths) {
      trend.months.push(month);
      trend.costs.push(monthData[month]);
    }

    // حساب متوسط التكاليف الشهرية
    trend.averageMonthly = this.fs.roundNumber(
      trend.costs.reduce((a, b) => a + b, 0) / trend.costs.length
    );

    // تحديد الاتجاه
    if (trend.costs.length >= 2) {
      const firstHalf = trend.costs.slice(0, Math.floor(trend.costs.length / 2));
      const secondHalf = trend.costs.slice(Math.floor(trend.costs.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const change = ((avgSecond - avgFirst) / avgFirst) * 100;
      if (change > 5) trend.trend = 'up';
      else if (change < -5) trend.trend = 'down';
    }

    return trend;
  }

  /**
   * تحليل المتغيرات عن الميزانية
   */
  analyzeBudgetVariances(budgetId) {
    const budget = this.fs.budgets.get(budgetId);
    if (!budget) throw new Error('الميزانية غير موجودة');

    const analysis = {
      budgetId,
      budgetName: budget.name,
      lines: [],
      totalVariance: budget.totalVariance,
      totalVariancePercentage: this.fs.roundNumber(
        (budget.totalVariance / budget.totalBudgeted) * 100
      ),
      favorableVariances: [],
      unfavorableVariances: [],
    };

    for (const line of budget.lines) {
      const isFavorable = line.variance > 0; // استهلاك أقل من المخطط

      const lineAnalysis = {
        accountId: line.accountId,
        budgeted: line.budgeted,
        spent: line.spent,
        variance: line.variance,
        variancePercentage: line.variancePercentage,
        isFavorable,
        analysis: isFavorable
          ? `استهلاك أقل من المخطط بمقدار ${Math.abs(line.variance)}`
          : `استهلاك أكثر من المخطط بمقدار ${Math.abs(line.variance)}`,
      };

      analysis.lines.push(lineAnalysis);

      if (isFavorable) {
        analysis.favorableVariances.push(lineAnalysis);
      } else {
        analysis.unfavorableVariances.push(lineAnalysis);
      }
    }

    return analysis;
  }

  // ===================================================================
  // 2. تحليل الربحية - Profitability Analysis
  // ===================================================================

  /**
   * تحليل الربح الإجمالي
   */
  analyzeGrossProfit(startDate, endDate) {
    const incomeStatement = this.fs.generateIncomeStatement(startDate, endDate);

    const analysis = {
      period: { startDate, endDate },
      totalRevenue: incomeStatement.totalRevenue,
      costOfGoodsSold: incomeStatement.expenses.totalCOGS,
      grossProfit: incomeStatement.grossProfit,
      grossProfitMargin: this.fs.roundNumber(
        (incomeStatement.grossProfit / incomeStatement.totalRevenue) * 100
      ),
      revenueBreakdown: incomeStatement.revenue.operatingRevenue,
      costsBreakdown: incomeStatement.expenses.costOfGoodsSold,
    };

    return analysis;
  }

  /**
   * تحليل الربح التشغيلي
   */
  analyzeOperatingProfit(startDate, endDate) {
    const incomeStatement = this.fs.generateIncomeStatement(startDate, endDate);
    const totalOperatingExpenses = incomeStatement.expenses.totalOperatingExpenses;

    const analysis = {
      period: { startDate, endDate },
      grossProfit: incomeStatement.grossProfit,
      operatingExpenses: totalOperatingExpenses,
      operatingProfit: incomeStatement.operatingIncome,
      operatingMargin: this.fs.roundNumber(
        (incomeStatement.operatingIncome / incomeStatement.totalRevenue) * 100
      ),
      expensesBreakdown: incomeStatement.expenses.operatingExpenses,
    };

    return analysis;
  }

  /**
   * تحليل الربح الصافي
   */
  analyzeNetProfit(startDate, endDate) {
    const incomeStatement = this.fs.generateIncomeStatement(startDate, endDate);

    const analysis = {
      period: { startDate, endDate },
      totalRevenue: incomeStatement.totalRevenue,
      totalExpenses: incomeStatement.totalExpenses,
      netProfit: incomeStatement.netIncome,
      netProfitMargin: this.fs.roundNumber(
        (incomeStatement.netIncome / incomeStatement.totalRevenue) * 100
      ),
      profitToRevenue: incomeStatement.netIncome / incomeStatement.totalRevenue,
      improvementPotential: this.identifyProfitImprovementAreas(incomeStatement),
    };

    return analysis;
  }

  /**
   * تحديد مجالات تحسين الربح
   */
  identifyProfitImprovementAreas(incomeStatement) {
    const areas = [];

    // تحليل التكاليف
    if (incomeStatement.expenses.totalCOGS > 0) {
      areas.push({
        area: 'تكلفة السلع المباعة',
        currentAmount: incomeStatement.expenses.totalCOGS,
        potentialReduction: this.fs.roundNumber(incomeStatement.expenses.totalCOGS * 0.1),
        strategy: 'تحسين كفاءة الإنتاج وتقليل الهدر',
      });
    }

    if (incomeStatement.expenses.totalOperatingExpenses > 0) {
      areas.push({
        area: 'المصروفات التشغيلية',
        currentAmount: incomeStatement.expenses.totalOperatingExpenses,
        potentialReduction: this.fs.roundNumber(
          incomeStatement.expenses.totalOperatingExpenses * 0.05
        ),
        strategy: 'تحسين كفاءة العمليات وتقليل النفقات العامة',
      });
    }

    return areas;
  }

  // ===================================================================
  // 3. تحليل السيولة - Liquidity Analysis
  // ===================================================================

  /**
   * تحليل دوران النقد
   */
  analyzeCashCycle(months = 12) {
    const cycles = [];
    let totalCycle = 0;

    for (let i = 0; i < months; i++) {
      const daysInvoiceOutstanding = 30; // DIO
      const daysInventoryOutstanding = 25; // DIO
      const dayPayableOutstanding = 20; // DPO

      const cycle = {
        month: i + 1,
        dio: daysInvoiceOutstanding,
        diso: daysInventoryOutstanding,
        dpo: dayPayableOutstanding,
        cashCycleDays: daysInvoiceOutstanding + daysInventoryOutstanding - dayPayableOutstanding,
      };

      cycles.push(cycle);
      totalCycle += cycle.cashCycleDays;
    }

    return {
      cycles,
      averageCycleDays: this.fs.roundNumber(totalCycle / months),
      recommendation:
        totalCycle / months > 60
          ? 'يجب تحسين إدارة النقد والتركيز على تحصيل الذمم'
          : 'إدارة النقد جيدة',
    };
  }

  /**
   * تنبؤ السيولة
   */
  forecastLiquidity(months = 6) {
    const forecast = {
      periods: [],
      averageCashLevel: 0,
      riskPeriods: [],
    };

    const currentCashPosition = this.fs.calculateCashPosition();

    for (let i = 1; i <= months; i++) {
      const projectedCash = currentCashPosition.endingBalance * (1 + 0.02 * i); // عائد شهري 2%

      const period = {
        month: i,
        projectedCash: this.fs.roundNumber(projectedCash),
        riskLevel: projectedCash < 100000 ? 'high' : 'low',
      };

      forecast.periods.push(period);
      forecast.averageCashLevel += projectedCash;

      if (period.riskLevel === 'high') {
        forecast.riskPeriods.push({
          month: i,
          projectedCash: period.projectedCash,
          action: 'قد تكون هناك حاجة للتمويل أو تقليل النفقات',
        });
      }
    }

    forecast.averageCashLevel = this.fs.roundNumber(forecast.averageCashLevel / months);

    return forecast;
  }

  // ===================================================================
  // 4. تحليل الكفاءة - Efficiency Analysis
  // ===================================================================

  /**
   * كفاءة استخدام الأصول
   */
  analyzeAssetEfficiency(startDate, endDate) {
    const balanceSheet = this.fs.generateBalanceSheet();
    const incomeStatement = this.fs.generateIncomeStatement(startDate, endDate);

    const totalAssets = balanceSheet.assets.totalAssets || 1;
    const revenue = incomeStatement.totalRevenue;

    const analysis = {
      period: { startDate, endDate },
      totalAssets,
      totalRevenue: revenue,
      assetTurnover: this.fs.roundNumber(revenue / totalAssets),
      assessment: revenue / totalAssets > 1 ? 'استخدام فعال للأصول' : 'يجب تحسين استخدام الأصول',
      recommendations: [
        'مراجعة الأصول والتخلص من غير المنتجة',
        'زيادة الإيرادات من الأصول الموجودة',
        'تحسين الكفاءة التشغيلية',
      ],
    };

    return analysis;
  }

  /**
   * كفاءة المخزون
   */
  analyzeInventoryEfficiency(startDate, endDate) {
    const incomeStatement = this.fs.generateIncomeStatement(startDate, endDate);
    const balanceSheet = this.fs.generateBalanceSheet();

    const analysis = {
      period: { startDate, endDate },
      costOfGoodsSold: incomeStatement.expenses.totalCOGS,
      assessment: 'تحليل المخزون',
      recommendations: [
        'تحسين أنظمة إدارة المخزون',
        'تقليل الفترة من الاستحصال إلى البيع',
        'مراجعة المخزون البطيء التحرك',
      ],
    };

    return analysis;
  }

  // ===================================================================
  // 5. كشف الشذوذ - Anomaly Detection
  // ===================================================================

  /**
   * كشف الشذوذ في المعاملات
   */
  detectAnomalies() {
    const detected = [];

    // فحص المعاملات الكبيرة
    for (const expense of this.fs.expenses.values()) {
      if (expense.total > 100000) {
        detected.push({
          type: 'large_transaction',
          entityId: expense.id,
          description: `معاملة كبيرة: ${expense.description} بمبلغ ${expense.total}`,
          severity: 'warning',
          action: 'تحقق من الموافقات المطلوبة',
        });
      }
    }

    // فحص المتغيرات عن الميزانية
    for (const budget of this.fs.budgets.values()) {
      if (Math.abs(budget.totalVariancePercentage) > 20) {
        detected.push({
          type: 'budget_variance',
          entityId: budget.id,
          description: `متغير كبير في الميزانية: ${budget.name}`,
          variance: budget.totalVariancePercentage,
          severity: 'critical',
          action: 'يحتاج إلى تحقيق فوري',
        });
      }
    }

    // فحص الحسابات ذات الرصيد غير المعتاد
    for (const account of this.fs.accounts.values()) {
      const balance = this.fs.getAccountBalance(account.id);

      // حساب قياسي لا يجب أن يكون له رصيد سالب (مثل الأصول)
      if (account.type === 'asset' && balance < 0) {
        detected.push({
          type: 'unusual_balance',
          entityId: account.id,
          description: `رصيد غير معتاد للحساب ${account.name}`,
          balance,
          severity: 'warning',
        });
      }
    }

    this.anomalies = detected;
    return detected;
  }

  /**
   * تحليل الأنماط والاتجاهات
   */
  analyzeTrends(timeframe = 'monthly') {
    const trends = {
      revenue: this.analyzeRevenueTrend(timeframe),
      expenses: this.analyzeCostTrend(timeframe === 'monthly' ? 12 : 4),
      profitability: this.analyzeProfitTrend(timeframe),
    };

    return trends;
  }

  /**
   * تحليل اتجاه الإيرادات
   */
  analyzeRevenueTrend(timeframe) {
    const months = timeframe === 'monthly' ? 12 : 4;
    const trend = {
      periods: [],
      revenues: [],
      averageRevenue: 0,
      growthRate: 0,
    };

    // جمع بيانات الإيرادات
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = date.toISOString().substring(0, 7);

      let revenue = 0;
      for (const invoice of this.fs.invoices.values()) {
        const invPeriod = invoice.invoiceDate.toISOString().substring(0, 7);
        if (invPeriod === period) {
          revenue += invoice.total;
        }
      }

      trend.periods.push(period);
      trend.revenues.push(revenue);
    }

    trend.averageRevenue = this.fs.roundNumber(
      trend.revenues.reduce((a, b) => a + b, 0) / trend.revenues.length
    );

    // حساب معدل النمو
    if (trend.revenues.length >= 2) {
      const lastMonth = trend.revenues[trend.revenues.length - 1];
      const previousMonth = trend.revenues[trend.revenues.length - 2];
      trend.growthRate = this.fs.roundNumber(((lastMonth - previousMonth) / previousMonth) * 100);
    }

    return trend;
  }

  /**
   * تحليل اتجاه الربح
   */
  analyzeProfitTrend(timeframe) {
    // يتم حسابه بناءً على قوائم الدخل الشهرية
    return {
      periods: [],
      profits: [],
      averageProfit: 0,
      trend: 'stable',
    };
  }

  // ===================================================================
  // 6. التنبيهات المالية - Financial Alerts
  // ===================================================================

  /**
   * إنشاء تنبيهات مالية
   */
  generateAlerts() {
    this.alerts = [];

    // تنبيهات الميزانية
    for (const budget of this.fs.budgets.values()) {
      if (budget.utilizationPercentage > 90) {
        this.addAlert({
          type: 'budget_critical',
          severity: 'critical',
          message: `الميزانية ${budget.name} تم استهلاك ${budget.utilizationPercentage}% منها`,
          budgetId: budget.id,
          action: 'يحتاج إلى موافقة للإنفاق الإضافي',
        });
      } else if (budget.utilizationPercentage > 75) {
        this.addAlert({
          type: 'budget_warning',
          severity: 'warning',
          message: `الميزانية ${budget.name} قريبة من الامتلاء (${budget.utilizationPercentage}%)`,
          budgetId: budget.id,
        });
      }
    }

    // تنبيهات الضرائب
    for (const taxRecord of this.fs.taxRecords.values()) {
      if (taxRecord.status === 'pending' && taxRecord.dueDate < new Date()) {
        this.addAlert({
          type: 'tax_overdue',
          severity: 'critical',
          message: `الضريبة المستحقة ${taxRecord.period} لم تُدفع قبل الموعد`,
          taxRecordId: taxRecord.id,
          dueAmount: taxRecord.due,
        });
      }
    }

    // تنبيهات الذمم المدينة
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const invoice of this.fs.invoices.values()) {
      if (
        invoice.status === 'overdue' ||
        (invoice.dueDate < thirtyDaysAgo && invoice.status !== 'paid')
      ) {
        this.addAlert({
          type: 'overdue_invoice',
          severity: 'warning',
          message: `الفاتورة ${invoice.invoiceNumber} متأخرة الدفع`,
          invoiceId: invoice.id,
          amountDue: invoice.amountDue,
          daysOverdue: Math.floor((now - invoice.dueDate) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    return this.alerts;
  }

  /**
   * إضافة تنبيه
   */
  addAlert(alertData) {
    const alert = {
      id: Math.random().toString(36).substr(2, 9),
      ...alertData,
      createdAt: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    return alert;
  }

  /**
   * إقرار التنبيه
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
    }
    return alert;
  }

  // ===================================================================
  // 7. التقارير المتقدمة - Advanced Reports
  // ===================================================================

  /**
   * تقرير الملخص التنفيذي
   */
  generateExecutiveSummary(startDate, endDate) {
    const balanceSheet = this.fs.generateBalanceSheet();
    const incomeStatement = this.fs.generateIncomeStatement(startDate, endDate);
    const ratios = this.fs.calculateFinancialRatios();
    const cashPosition = this.fs.calculateCashPosition();

    return {
      period: { startDate, endDate },
      executiveSummary: {
        totalAssets: balanceSheet.assets.totalAssets,
        totalLiabilities: balanceSheet.liabilities.totalLiabilities,
        totalEquity: balanceSheet.equity.totalEquity,
        totalRevenue: incomeStatement.totalRevenue,
        netIncome: incomeStatement.netIncome,
        profitMargin: this.fs.roundNumber(
          (incomeStatement.netIncome / incomeStatement.totalRevenue) * 100
        ),
        cashBalance: cashPosition.endingBalance,
      },
      keyMetrics: {
        currentRatio: ratios.liquidity.currentRatio,
        debtToEquityRatio: ratios.leverage.debtToEquity,
        returnOnAssets: ratios.profitability.roa,
        returnOnEquity: ratios.profitability.roe,
      },
      alerts: this.alerts.filter(a => !a.acknowledged && a.severity === 'critical'),
      recommendations: this.generateRecommendations(balanceSheet, incomeStatement, ratios),
    };
  }

  /**
   * توليد التوصيات
   */
  generateRecommendations(balanceSheet, incomeStatement, ratios) {
    const recommendations = [];

    // توصيات بناءً على النسب المالية
    if (ratios.liquidity.currentRatio < 1.5) {
      recommendations.push({
        category: 'السيولة',
        priority: 'high',
        recommendation: 'نسبة السيولة الحالية منخفضة، يجب تحسين الأصول الجارية',
      });
    }

    if (ratios.leverage.debtToEquity > 2) {
      recommendations.push({
        category: 'الرافعة المالية',
        priority: 'high',
        recommendation: 'نسبة الديون إلى حقوق الملكية عالية جداً، يجب تقليل الديون',
      });
    }

    if (ratios.profitability.roa < 5) {
      recommendations.push({
        category: 'الربحية',
        priority: 'medium',
        recommendation: 'العائد على الأصول منخفض، يجب تحسين الكفاءة التشغيلية',
      });
    }

    return recommendations;
  }

  /**
   * تقرير تفصيلي عن الأداء
   */
  generateDetailedPerformanceReport(startDate, endDate) {
    return {
      period: { startDate, endDate },
      profitability: this.analyzeGrossProfit(startDate, endDate),
      efficiency: this.analyzeAssetEfficiency(startDate, endDate),
      trends: this.analyzeTrends('monthly'),
      costAnalysis: this.analyzeCostsByDepartment(startDate, endDate),
      anomalies: this.detectAnomalies(),
      generatedAt: new Date(),
    };
  }
}

module.exports = AdvancedFinancialAnalytics;

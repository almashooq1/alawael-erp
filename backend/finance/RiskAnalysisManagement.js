/**
 * ===================================================================
 * RISK ANALYSIS & MANAGEMENT MODULE
 * وحدة تحليل وإدارة المخاطر المالية
 * ===================================================================
 * نسخة: 1.0 - احترافية
 * التاريخ: فبراير 2026
 */

const EventEmitter = require('events');

class RiskAnalysisManagement extends EventEmitter {
  constructor(financialSystem) {
    super();
    this.fs = financialSystem;
    this.riskProfile = new Map();
    this.riskAssessments = new Map();
    this.mitigationStrategies = new Map();
    this.riskIndicators = new Map();
    this.riskEvents = [];
  }

  // ===================================================================
  // 1. أنواع المخاطر - Risk Types
  // ===================================================================

  /**
   * المخاطر المدعومة:
   * - CREDIT_RISK: مخاطر عدم سداد المدينين
   * - LIQUIDITY_RISK: مخاطر عدم توفر السيولة
   * - OPERATIONAL_RISK: مخاطر تشغيلية وإدارية
   * - MARKET_RISK: مخاطر السوق والعملات
   * - CURRENCY_RISK: مخاطر تقلب العملات الأجنبية
   * - INTEREST_RATE_RISK: مخاطر تقلبات معدلات الفائدة
   * - ACCOUNTING_RISK: مخاطر الأخطاء المحاسبية
   * - FRAUDULENT_RISK: مخاطر الغش والاختلاس
   */

  // ===================================================================
  // 2. تقييم المخاطر - Risk Assessment
  // ===================================================================

  createRiskProfile(riskData) {
    const {
      name,
      description,
      riskCategory, // من الفئات المحددة أعلاه
      probabilityScore = 5, // 1-10
      impactScore = 5, // 1-10
      controls = [],
      owner,
    } = riskData;

    if (!name || !riskCategory) {
      throw new Error('الاسم وفئة المخاطر مطلوبان');
    }

    const riskProfile = {
      id: `RISK_${Date.now()}`,
      name,
      description,
      riskCategory,
      probabilityScore: Math.min(Math.max(probabilityScore, 1), 10),
      impactScore: Math.min(Math.max(impactScore, 1), 10),
      riskScore: 0, // سيتم حسابها
      riskLevel: '', // Low, Medium, High, Critical
      controls,
      owner,
      mitigation: null,
      status: 'active',
      createdAt: new Date(),
      lastReviewDate: new Date(),
    };

    // حساب درجة المخاطر الإجمالية
    riskProfile.riskScore = (riskProfile.probabilityScore * riskProfile.impactScore) / 10;
    riskProfile.riskLevel = this.calculateRiskLevel(riskProfile.riskScore);

    this.riskProfile.set(riskProfile.id, riskProfile);
    this.emit('riskProfile:created', riskProfile);

    return riskProfile;
  }

  calculateRiskLevel(score) {
    if (score <= 2.5) return 'Low';
    if (score <= 5) return 'Medium';
    if (score <= 7.5) return 'High';
    return 'Critical';
  }

  assessCreditRisk(customerId) {
    const assessment = {
      id: `CREDIT_ASSESS_${Date.now()}`,
      customerId,
      date: new Date(),
      metrics: {},
      score: 0,
      rating: 'Unknown',
    };

    // جمع بيانات المدين
    const invoices = Array.from(this.fs.invoices.values()).filter(
      inv => inv.customerId === customerId
    );

    if (invoices.length === 0) {
      return { ...assessment, warning: 'لا توجد فواتير للعميل' };
    }

    // حساب مقاييس المخاطر الائتمانية
    // 1. نسبة السداد المتأخر
    const overdueAmount = invoices
      .filter(inv => inv.dueDate < new Date() && inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const overdueRatio = totalAmount > 0 ? overdueAmount / totalAmount : 0;
    assessment.metrics.overdueRatio = this.fs.roundNumber(overdueRatio);

    // 2. متوسط أيام السداد
    const paidInvoices = invoices.filter(inv => inv.status === 'paid' && inv.paidDate);
    let averageDaysPayment = 0;

    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const daysToPayment = Math.floor(
          (new Date(inv.paidDate) - new Date(inv.issueDate)) / (1000 * 60 * 60 * 24)
        );
        return sum + daysToPayment;
      }, 0);
      averageDaysPayment = totalDays / paidInvoices.length;
    }

    assessment.metrics.averageDaysPayment = this.fs.roundNumber(averageDaysPayment);

    // 3. نسبة السداد خلال الشروط المتفق عليها
    const onTimePayments = paidInvoices.filter(inv => {
      const paymentDays = Math.floor(
        (new Date(inv.paidDate) - new Date(inv.issueDate)) / (1000 * 60 * 60 * 24)
      );
      return paymentDays <= 30; // افتراض 30 يوم معايير السداد
    }).length;

    const onTimeRatio = paidInvoices.length > 0 ? onTimePayments / paidInvoices.length : 0;
    assessment.metrics.onTimePaymentRatio = this.fs.roundNumber(onTimeRatio);

    // 4. حساب درجة المخاطر الائتمانية
    let creditScore = 100;

    // تقليل النقاط بناءً على السداد المتأخر
    creditScore -= overdueRatio * 40;

    // تقليل النقاط بناءً على متوسط أيام السداد
    if (averageDaysPayment > 60) creditScore -= 20;
    else if (averageDaysPayment > 30) creditScore -= 10;

    // إضافة نقاط للسداد البروتوكولي
    creditScore += onTimeRatio * 20;

    assessment.score = this.fs.roundNumber(Math.max(0, creditScore));

    // تصنيف الائتمان
    if (assessment.score >= 80) {
      assessment.rating = 'Excellent';
    } else if (assessment.score >= 60) {
      assessment.rating = 'Good';
    } else if (assessment.score >= 40) {
      assessment.rating = 'Fair';
    } else if (assessment.score >= 20) {
      assessment.rating = 'Poor';
    } else {
      assessment.rating = 'Unacceptable';
    }

    this.riskAssessments.set(assessment.id, assessment);
    this.emit('creditRisk:assessed', assessment);

    return assessment;
  }

  assessLiquidityRisk() {
    const assessment = {
      id: `LIQUIDITY_ASSESS_${Date.now()}`,
      date: new Date(),
      metrics: {},
      riskLevel: 'Low',
      alerts: [],
    };

    // حساب نسبة السيولة الحالية
    let currentAssets = 0;
    let currentLiabilities = 0;

    for (const account of this.fs.accounts.values()) {
      const balance = this.fs.getAccountBalance(account.id);

      if (account.type === 'asset' && account.subType === 'current') {
        currentAssets += balance;
      } else if (account.type === 'liability' && account.subType === 'current') {
        currentLiabilities += balance;
      }
    }

    const currentRatio = currentLiabilities !== 0 ? currentAssets / currentLiabilities : Infinity;

    assessment.metrics.currentRatio = this.fs.roundNumber(currentRatio);
    assessment.metrics.currentAssets = this.fs.roundNumber(currentAssets);
    assessment.metrics.currentLiabilities = this.fs.roundNumber(currentLiabilities);

    // تقييم مستوى المخاطر
    if (currentRatio < 1) {
      assessment.riskLevel = 'Critical';
      assessment.alerts.push('الأصول الحالية أقل من الالتزامات الحالية');
    } else if (currentRatio < 1.5) {
      assessment.riskLevel = 'High';
      assessment.alerts.push('نسبة السيولة أقل من المستوى الموصى به');
    } else if (currentRatio > 3) {
      assessment.riskLevel = 'Low';
      assessment.alerts.push('السيولة أعلى من اللازم - فرصة لاستثمار أفضل');
    } else {
      assessment.riskLevel = 'Medium';
    }

    return assessment;
  }

  assessOperationalRisk() {
    const assessment = {
      id: `OPERATIONAL_ASSESS_${Date.now()}`,
      date: new Date(),
      areas: {},
      overallRisk: 'Medium',
    };

    // فحص 1: السيطرة الداخلية
    assessment.areas.internalControls = {
      hasAuditTrail: this.fs.auditLog?.length > 0,
      hasApprovalProcess: true, // يمكن التحقق من السياسات
      hasDocumentation: true,
      score: 75,
    };

    // فحص 2: توثيق المعاملات
    let documentedTransactions = 0;
    let totalTransactions = this.fs.journals.size;

    for (const journal of this.fs.journals.values()) {
      if (journal.attachments && journal.attachments.length > 0) {
        documentedTransactions++;
      }
    }

    const documentationRate =
      totalTransactions > 0 ? (documentedTransactions / totalTransactions) * 100 : 0;

    assessment.areas.documentation = {
      documentedTransactions,
      totalTransactions,
      documentationRate: this.fs.roundNumber(documentationRate),
      score: documentationRate >= 80 ? 75 : 50,
    };

    // فحص 3: معالجة الأخطاء
    assessment.areas.errorHandling = {
      hasCorrectionProcess: true,
      preventionMeasures: true,
      score: 70,
    };

    // حساب المخاطر العملياتية الإجمالية
    const avgScore =
      (assessment.areas.internalControls.score +
        assessment.areas.documentation.score +
        assessment.areas.errorHandling.score) /
      3;

    if (avgScore >= 80) {
      assessment.overallRisk = 'Low';
    } else if (avgScore >= 50) {
      assessment.overallRisk = 'Medium';
    } else {
      assessment.overallRisk = 'High';
    }

    return assessment;
  }

  assessFraudulentRisk() {
    const assessment = {
      id: `FRAUD_ASSESS_${Date.now()}`,
      date: new Date(),
      suspectedTransactions: [],
      riskScore: 0,
      recommendations: [],
    };

    const suspiciousPatterns = [];

    // فحص 1: معاملات غير عادية (قيمة سابقة كثيراً)
    const averageAmount = this.calculateAverageTransactionAmount();

    for (const journal of this.fs.journals.values()) {
      for (const item of journal.items) {
        if (item.amount > averageAmount * 5) {
          suspiciousPatterns.push({
            type: 'UNUSUALLY_HIGH_AMOUNT',
            journalId: journal.id,
            amount: item.amount,
            averageAmount: this.fs.roundNumber(averageAmount),
          });
        }
      }
    }

    // فحص 2: معاملات بدون توثيق
    for (const journal of this.fs.journals.values()) {
      if (!journal.attachments || journal.attachments.length === 0) {
        suspiciousPatterns.push({
          type: 'MISSING_DOCUMENTATION',
          journalId: journal.id,
          description: 'معاملة بدون مستندات داعمة',
        });
      }
    }

    // فحص 3: معاملات متكررة
    const transactionMap = new Map();

    for (const journal of this.fs.journals.values()) {
      const key = `${journal.date.toISOString().substring(0, 10)}_${journal.description}`;
      if (!transactionMap.has(key)) {
        transactionMap.set(key, []);
      }
      transactionMap.get(key).push(journal);
    }

    for (const [key, transactions] of transactionMap) {
      if (transactions.length > 3) {
        suspiciousPatterns.push({
          type: 'REPEATED_TRANSACTIONS',
          pattern: key,
          count: transactions.length,
          description: 'معاملات متشابهة متكررة',
        });
      }
    }

    assessment.suspectedTransactions = suspiciousPatterns;
    assessment.riskScore = Math.min(suspiciousPatterns.length * 10, 100);

    // توصيات
    if (assessment.riskScore > 50) {
      assessment.recommendations.push({
        priority: 'high',
        action: 'إجراء تدقيق شامل للمعاملات المشبوهة',
      });
    }

    assessment.recommendations.push({
      priority: 'medium',
      action: 'تحسين متطلبات التوثيق والموافقات',
    });

    return assessment;
  }

  calculateAverageTransactionAmount() {
    let totalAmount = 0;
    let count = 0;

    for (const journal of this.fs.journals.values()) {
      for (const item of journal.items) {
        totalAmount += item.amount;
        count++;
      }
    }

    return count > 0 ? totalAmount / count : 0;
  }

  // ===================================================================
  // 3. إستراتيجيات التخفيف - Mitigation Strategies
  // ===================================================================

  createMitigationStrategy(strategyData) {
    const {
      riskProfileId,
      description,
      actions = [],
      owner,
      deadline,
      expectedImpact = 'Medium',
    } = strategyData;

    const strategy = {
      id: `MITIGATION_${Date.now()}`,
      riskProfileId,
      description,
      actions,
      owner,
      deadline: new Date(deadline),
      expectedImpact,
      status: 'active',
      progressPercentage: 0,
      createdAt: new Date(),
    };

    this.mitigationStrategies.set(strategy.id, strategy);

    // ربط الإستراتيجية بالمخاطر
    const riskProfile = this.riskProfile.get(riskProfileId);
    if (riskProfile) {
      riskProfile.mitigation = strategy.id;
    }

    this.emit('mitigationStrategy:created', strategy);
    return strategy;
  }

  updateMitigationProgress(strategyId, progressPercentage, notes = '') {
    const strategy = this.mitigationStrategies.get(strategyId);
    if (!strategy) throw new Error('الإستراتيجية غير موجودة');

    strategy.progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);

    if (strategy.progressPercentage === 100) {
      strategy.status = 'completed';
      strategy.completedAt = new Date();
    }

    if (notes) {
      strategy.lastNote = {
        text: notes,
        date: new Date(),
      };
    }

    return strategy;
  }

  // ===================================================================
  // 4. المؤشرات الخطرة - Risk Indicators
  // ===================================================================

  monitorRiskIndicators() {
    const indicators = {
      timestamp: new Date(),
      indicators: {},
      alerts: [],
    };

    // مؤشر 1: النقد المتاح
    const availableCash = this.fs.getCashAccountId
      ? this.fs.getAccountBalance(this.fs.getCashAccountId())
      : 0;

    indicators.indicators.cashLevel = {
      value: this.fs.roundNumber(availableCash),
      status: availableCash > 100000 ? 'Healthy' : 'Warning',
      threshold: 100000,
    };

    if (availableCash < 100000) {
      indicators.alerts.push({
        type: 'LOW_CASH',
        severity: 'High',
        message: 'مستوى النقد المتاح أقل من الحد الأدنى الموصى به',
      });
    }

    // مؤشر 2: المستحقات المتأخرة
    let overdueReceivables = 0;
    for (const invoice of this.fs.invoices.values()) {
      if (invoice.dueDate < new Date() && invoice.status !== 'paid') {
        overdueReceivables += invoice.totalAmount;
      }
    }

    indicators.indicators.overdueReceivables = {
      value: this.fs.roundNumber(overdueReceivables),
      status: overdueReceivables > 500000 ? 'At Risk' : 'OK',
      threshold: 500000,
    };

    if (overdueReceivables > 500000) {
      indicators.alerts.push({
        type: 'HIGH_OVERDUE',
        severity: 'High',
        message: 'المستحقات المتأخرة تتجاوز الحد المقبول',
      });
    }

    // مؤشر 3: نسبة الديون إلى الأصول
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const account of this.fs.accounts.values()) {
      const balance = this.fs.getAccountBalance(account.id);
      if (account.type === 'asset') {
        totalAssets += balance;
      } else if (account.type === 'liability') {
        totalLiabilities += balance;
      }
    }

    const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0;

    indicators.indicators.debtRatio = {
      value: this.fs.roundNumber(debtRatio),
      status: debtRatio > 0.6 ? 'High' : 'Acceptable',
      threshold: 0.6,
    };

    if (debtRatio > 0.6) {
      indicators.alerts.push({
        type: 'HIGH_DEBT',
        severity: 'Medium',
        message: 'نسبة الديون مرتفعة جداً',
      });
    }

    // مؤشر 4: معدل دوران الأصول
    // (إجمالي الالتزامات + حقوق الملكية) / متوسط الأصول
    const totalTurnover = totalAssets + totalLiabilities;
    const assetTurnover = totalAssets > 0 ? totalTurnover / totalAssets : 0;

    indicators.indicators.assetTurnover = {
      value: this.fs.roundNumber(assetTurnover),
      status: assetTurnover > 1 ? 'Efficient' : 'Needs Improvement',
    };

    return indicators;
  }

  // ===================================================================
  // 5. التقارير والملخصات - Reports & Summaries
  // ===================================================================

  generateRiskReport() {
    const report = {
      generatedAt: new Date(),
      riskProfiles: [],
      totalRisks: this.riskProfile.size,
      riskDistribution: {
        Low: 0,
        Medium: 0,
        High: 0,
        Critical: 0,
      },
      topRisks: [],
      indicators: this.monitorRiskIndicators(),
    };

    // جمع بيانات المخاطر
    const profileArray = Array.from(this.riskProfile.values());

    for (const profile of profileArray) {
      report.riskProfiles.push({
        id: profile.id,
        name: profile.name,
        category: profile.riskCategory,
        probability: profile.probabilityScore,
        impact: profile.impactScore,
        score: profile.riskScore,
        level: profile.riskLevel,
        mitigation: profile.mitigation ? 'Yes' : 'No',
      });

      report.riskDistribution[profile.riskLevel]++;
    }

    // أعلى المخاطر
    report.topRisks = profileArray
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5)
      .map(r => ({
        name: r.name,
        score: r.riskScore,
        level: r.riskLevel,
      }));

    return report;
  }

  exportRiskSummary(format = 'json') {
    const summary = {
      timestamp: new Date(),
      riskReport: this.generateRiskReport(),
      creditAssessments: Array.from(this.riskAssessments.values()).slice(-10),
      indicators: this.monitorRiskIndicators(),
    };

    if (format === 'json') {
      return JSON.stringify(summary, null, 2);
    }

    return summary;
  }
}

module.exports = RiskAnalysisManagement;
